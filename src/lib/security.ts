import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { query, queryOne } from "@/lib/db";

/**
 * Fixed-window counter in the database (works across all serverless instances).
 * Returns true when the caller is still within the limit.
 */
export async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `INSERT INTO rate_limit (key, count, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limit.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limit.count + 1 END,
       window_start = CASE WHEN rate_limit.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limit.window_start END
     RETURNING count`,
    [key, windowSec]
  );
  if (Math.random() < 0.01) {
    void query("DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'").catch(() => undefined);
  }
  return (row?.count ?? 1) <= limit;
}

/** Current count without incrementing (for "is this account already locked?"). */
export async function peek(key: string, windowSec: number): Promise<number> {
  const row = await queryOne<{ count: number }>(
    "SELECT count FROM rate_limit WHERE key = $1 AND window_start > now() - make_interval(secs => $2)",
    [key, windowSec]
  );
  return row?.count ?? 0;
}

export async function clearKey(key: string): Promise<void> {
  await query("DELETE FROM rate_limit WHERE key = $1", [key]);
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "cs:" + (process.env.DATABASE_URL || "dev");
}

/** Signed timestamp embedded in the registration form: blocks bots that post instantly or replay old forms. */
export function formToken(): string {
  const t = String(Date.now());
  return `${t}.${createHmac("sha256", secret()).update("form:" + t).digest("hex").slice(0, 24)}`;
}

export function checkFormToken(token: string, minMs = 2500, maxMs = 6 * 3600_000): boolean {
  const [t, sig] = token.split(".");
  if (!t || !sig || !/^\d+$/.test(t)) return false;
  const expect = createHmac("sha256", secret()).update("form:" + t).digest("hex").slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = Date.now() - Number(t);
  return age >= minMs && age <= maxMs;
}

/** Login throttling: failures per account and per IP in the last 15 minutes. */
const LOGIN_WINDOW = 15 * 60;
export async function loginBlocked(email: string, ip: string): Promise<boolean> {
  const [byEmail, byIp] = await Promise.all([peek(`lf:e:${email}`, LOGIN_WINDOW), peek(`lf:i:${ip}`, LOGIN_WINDOW)]);
  return byEmail >= 6 || byIp >= 40;
}
export async function loginFailed(email: string, ip: string): Promise<void> {
  await Promise.all([allow(`lf:e:${email}`, 1e9, LOGIN_WINDOW), allow(`lf:i:${ip}`, 1e9, LOGIN_WINDOW)]);
}
export async function loginSucceeded(email: string): Promise<void> {
  await clearKey(`lf:e:${email}`);
}
