import "server-only";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createHash, randomBytes } from "node:crypto";
import { newId, query, queryOne } from "@/lib/db";
import { loginBlocked, loginFailed, loginSucceeded } from "@/lib/security";
import { clientInfo } from "@/lib/request-info";

export type Role = "SUPER_ADMIN" | "ADMIN" | "USER";
export type Status = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: Status;
  note: string | null;
  org_name: string | null;
  org_name_en: string | null;
  org_address: string | null;
  org_phone: string | null;
  org_logo: string | null;
  created_at: Date;
  approved_at: Date | null;
  last_login_at: Date | null;
  prefs: string | null;
  reset_requested_at: Date | null;
};

const COLS = "id, name, email, phone, role, status, note, org_name, org_name_en, org_address, org_phone, org_logo, created_at, approved_at, last_login_at, prefs, reset_requested_at";

export const STATUS_LABEL: Record<Status, string> = {
  PENDING: "រង់ចាំអនុម័ត",
  APPROVED: "បានអនុម័ត",
  REJECTED: "បានបដិសេធ",
  SUSPENDED: "ផ្អាកគណនី",
};

export const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: "អេដមីនធំ", ADMIN: "អេដមីន", USER: "អ្នកប្រើប្រាស់" };

export function isAdmin(role: string | undefined | null): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Creates the admin named in ADMIN_EMAIL / ADMIN_PASSWORD (Vercel env) when it
 * does not exist yet, so the owner can sign in without a database command.
 * An existing account with that email is promoted to an approved admin.
 */
let bootstrapDone: Promise<void> | null = null;
export function bootstrapAdmin(): Promise<void> {
  if (!bootstrapDone) {
    bootstrapDone = (async () => {
      const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
      const password = process.env.ADMIN_PASSWORD || "";
      if (!email || password.length < 6) return;
      const existing = await queryOne<{ id: string }>("SELECT id FROM app_user WHERE email = $1", [email]);
      if (existing) {
        await query("UPDATE app_user SET role = 'SUPER_ADMIN', status = 'APPROVED', approved_at = COALESCE(approved_at, now()) WHERE id = $1", [existing.id]);
        return;
      }
      const hash = await hashPassword(password);
      await query(
        "INSERT INTO app_user (id, name, email, password_hash, role, status, approved_at) VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', 'APPROVED', now()) ON CONFLICT (email) DO NOTHING",
        [newId(), process.env.ADMIN_NAME || "អេដមីន", email, hash]
      );
    })().catch((e) => {
      bootstrapDone = null;
      throw e;
    });
  }
  return bootstrapDone;
}

export type AuthResult =
  | { state: "ok"; user: UserRow }
  | { state: "bad" | "pending" | "rejected" | "suspended" | "locked" };


/** Checks email + password and the approval status. */
export async function authenticate(emailRaw: string, password: string, opts: { touch?: boolean } = {}): Promise<AuthResult> {
  const email = emailRaw.toLowerCase().trim();
  if (!email || !password) return { state: "bad" };
  if (password.length > 200 || email.length > 200) return { state: "bad" };
  await bootstrapAdmin();
  const ip = (await clientInfo()).ip;
  if (await loginBlocked(email, ip)) return { state: "locked" };
  const row = await queryOne<UserRow & { password_hash: string }>(`SELECT ${COLS}, password_hash FROM app_user WHERE email = $1`, [email]);
  const ok = await verifyPassword(password, row?.password_hash);
  if (!row || !ok) {
    await loginFailed(email, ip);
    return { state: "bad" };
  }
  await loginSucceeded(email);
  if (row.status === "PENDING") return { state: "pending" };
  if (row.status === "REJECTED") return { state: "rejected" };
  if (row.status === "SUSPENDED") return { state: "suspended" };
  if (opts.touch !== false) await query("UPDATE app_user SET last_login_at = now() WHERE id = $1", [row.id]);
  const { password_hash: _ph, ...user } = row;
  void _ph;
  return { state: "ok", user };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT ${COLS} FROM app_user WHERE id = $1`, [id]);
}

export async function countUsers(): Promise<number> {
  const r = await queryOne<{ n: string }>("SELECT count(*)::text AS n FROM app_user");
  return Number(r?.n ?? 0);
}

export async function registerUser(input: { name: string; email: string; password: string; phone?: string; note?: string; orgName?: string }): Promise<
  { ok: true; firstAdmin: boolean } | { ok: false; message: string }
> {
  const email = input.email.toLowerCase().trim();
  await bootstrapAdmin();
  const dup = await queryOne<{ id: string }>("SELECT id FROM app_user WHERE email = $1", [email]);
  if (dup) return { ok: false, message: "អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ" };
  const hash = await hashPassword(input.password);
  // With no ADMIN_EMAIL configured, the very first account becomes the approved super admin.
  const first = !process.env.ADMIN_EMAIL && (await countUsers()) === 0;
  try {
    await query(
      `INSERT INTO app_user (id, name, email, phone, password_hash, role, status, note, org_name, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${first ? "now()" : "NULL"})`,
      [newId(), input.name.trim().slice(0, 120), email, input.phone?.trim().slice(0, 40) || null, hash, first ? "SUPER_ADMIN" : "USER", first ? "APPROVED" : "PENDING", input.note?.trim() || null, input.orgName?.trim().slice(0, 160) || null]
    );
  } catch (e) {
    // Two people (or a double click) registering the same e-mail at the same moment.
    if (e && typeof e === "object" && (e as { code?: string }).code === "23505") return { ok: false, message: "អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ" };
    throw e;
  }
  return { ok: true, firstAdmin: first };
}

// ---------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

/** Creates a one-hour reset token (only its hash is stored) and flags the account for the admin. */
export async function createResetToken(email: string): Promise<{ token: string; user: Pick<UserRow, "id" | "name" | "email" | "status"> } | null> {
  const user = await queryOne<Pick<UserRow, "id" | "name" | "email" | "status">>("SELECT id, name, email, status FROM app_user WHERE email = $1", [email.toLowerCase().trim()]);
  if (!user) return null;
  await query("UPDATE app_user SET reset_requested_at = now() WHERE id = $1", [user.id]);
  if (user.status === "REJECTED" || user.status === "SUSPENDED") return { token: "", user };
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM password_reset WHERE user_id = $1", [user.id]);
  await query("INSERT INTO password_reset (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')", [sha(token), user.id]);
  return { token, user };
}

export async function resetTokenValid(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return false;
  const r = await queryOne("SELECT 1 FROM password_reset WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()", [sha(token)]);
  return Boolean(r);
}

/** Sets the new password once; the token is burnt in the same statement. */
export async function consumeResetToken(token: string, password: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return false;
  const row = await queryOne<{ user_id: string }>(
    "UPDATE password_reset SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
    [sha(token)]
  );
  if (!row) return false;
  await query("UPDATE app_user SET password_hash = $1, reset_requested_at = NULL WHERE id = $2", [await hashPassword(password), row.user_id]);
  return true;
}
