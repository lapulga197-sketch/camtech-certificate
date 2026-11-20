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
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
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
];

async function migrate(): Promise<void> {
  const client = await pool().connect();
  try {
    // Serialise concurrent cold starts.
    await client.query("SELECT pg_advisory_lock(727001)");
    try {
      for (const sql of SCHEMA) await client.query(sql);
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

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
