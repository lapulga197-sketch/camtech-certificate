import "server-only";
import { Pool, type QueryResultRow } from "pg";

/**
 * Plain Postgres (Neon) access. The tables are created on first use
 * (CREATE TABLE IF NOT EXISTS), so no migration command is ever needed.
 */
const globalForPg = globalThis as unknown as { __csPool?: Pool; __csReady?: Promise<void> };

function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

function pool(): Pool {
  if (!globalForPg.__csPool) {
    const url = connectionString();
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /sslmode=disable/.test(url);
    // ssl is configured explicitly below; drop URL options pg would otherwise interpret differently.
    let cleaned = url;
    try {
      const u = new URL(url);
      u.searchParams.delete("sslmode");
      u.searchParams.delete("channel_binding");
      cleaned = u.toString();
    } catch {
      /* keep the raw string */
    }
    globalForPg.__csPool = new Pool({
      connectionString: cleaned,
      max: Number(process.env.DB_POOL_MAX) || 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      // A runaway query must never hold a connection (and the whole site) hostage.
      statement_timeout: 25_000,
      query_timeout: 30_000,
      ssl: local ? false : { rejectUnauthorized: false },
    });
  }
  return globalForPg.__csPool;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS app_user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'PENDING',
    note TEXT,
    org_name TEXT,
    org_name_en TEXT,
    org_address TEXT,
    org_phone TEXT,
    org_logo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    last_login_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS app_user_status_idx ON app_user (status)`,
  `CREATE TABLE IF NOT EXISTS design_template (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'certificate',
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    shared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS design_template_owner_idx ON design_template (owner_id, doc_type)`,
  `CREATE TABLE IF NOT EXISTS issued_doc (
    id TEXT PRIMARY KEY,
    doc_no TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    detail TEXT,
    org_name TEXT,
    issued_date DATE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS issued_doc_owner_idx ON issued_doc (owner_id)`,
  `CREATE TABLE IF NOT EXISTS doc_counter (
    id TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  )`,
  // --- v2: settings, uploaded files, usage log, security --------------------
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS prefs TEXT`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS reset_requested_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS app_setting (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS asset (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BYTEA NOT NULL,
    meta TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS asset_kind_idx ON asset (kind, sort_order, created_at)`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT,
    email TEXT,
    action TEXT NOT NULL,
    doc_type TEXT,
    amount INTEGER NOT NULL DEFAULT 1,
    ip TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    device TEXT,
    os TEXT,
    browser TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS activity_log_time_idx ON activity_log (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log (user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS rate_limit (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset (user_id)`,
];

/** Bump when SCHEMA changes; cold starts skip the DDL when the database is already at this version. */
const SCHEMA_VERSION = "2";

async function migrate(): Promise<void> {
  // Fast path: after the first deploy every cold start only runs this one cheap query.
  try {
    const r = await pool().query<{ value: string }>("SELECT value FROM app_setting WHERE key = '_schema'");
    if (r.rows[0]?.value === SCHEMA_VERSION) return;
  } catch {
    /* table does not exist yet — fall through to the full migration */
  }
  const client = await pool().connect();
  try {
    // Serialise concurrent cold starts.
    await client.query("SELECT pg_advisory_lock(727001)");
    try {
      for (const sql of SCHEMA) await client.query(sql);
      await client.query(
        "INSERT INTO app_setting (key, value) VALUES ('_schema', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
        [SCHEMA_VERSION]
      );
    } finally {
      await client.query("SELECT pg_advisory_unlock(727001)");
    }
  } finally {
    client.release();
  }
}

export function ready(): Promise<void> {
  if (!globalForPg.__csReady) {
    globalForPg.__csReady = migrate().catch((e) => {
      globalForPg.__csReady = undefined; // retry on the next call
      throw e;
    });
  }
  return globalForPg.__csReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside one transaction on a dedicated connection. */
export async function tx<T>(fn: (q: (text: string, params?: unknown[]) => Promise<QueryResultRow[]>) => Promise<T>): Promise<T> {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(async (text, params = []) => (await client.query(text, params)).rows);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
