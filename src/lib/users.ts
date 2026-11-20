import "server-only";
import bcrypt from "bcryptjs";
import { newId, query, queryOne } from "@/lib/db";

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
};

const COLS = "id, name, email, phone, role, status, note, org_name, org_name_en, org_address, org_phone, org_logo, created_at, approved_at, last_login_at";

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
      const hash = await bcrypt.hash(password, 10);
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
  | { state: "bad" | "pending" | "rejected" | "suspended" };

/** Checks email + password and the approval status. */
export async function authenticate(emailRaw: string, password: string, opts: { touch?: boolean } = {}): Promise<AuthResult> {
  const email = emailRaw.toLowerCase().trim();
  if (!email || !password) return { state: "bad" };
  await bootstrapAdmin();
  const row = await queryOne<UserRow & { password_hash: string }>(`SELECT ${COLS}, password_hash FROM app_user WHERE email = $1`, [email]);
  if (!row) return { state: "bad" };
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return { state: "bad" };
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
  const hash = await bcrypt.hash(input.password, 10);
  // With no ADMIN_EMAIL configured, the very first account becomes the approved super admin.
  const first = !process.env.ADMIN_EMAIL && (await countUsers()) === 0;
  await query(
    `INSERT INTO app_user (id, name, email, phone, password_hash, role, status, note, org_name, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${first ? "now()" : "NULL"})`,
    [newId(), input.name.trim(), email, input.phone?.trim() || null, hash, first ? "SUPER_ADMIN" : "USER", first ? "APPROVED" : "PENDING", input.note?.trim() || null, input.orgName?.trim() || null]
  );
  return { ok: true, firstAdmin: first };
}
