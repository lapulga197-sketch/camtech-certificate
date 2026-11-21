import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Password hashing with Node's built-in scrypt. It runs in the libuv thread pool, so many people
 * signing in at the same moment never freeze the server (pure-JS bcrypt blocks the event loop).
 * Hashes created by older versions (bcrypt, "$2…") are still accepted.
 */
const N = 16384, R = 8, P = 1, KEYLEN = 32;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

const DUMMY_SALT = Buffer.from("cs-dummy-salt-16");

/** `hash` may be null (unknown e-mail): the same work is done so timing does not reveal which e-mails exist. */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await derive(password, DUMMY_SALT);
    return false;
  }
  if (hash.startsWith("$2")) return bcrypt.compare(password, hash);
  const [scheme, n, salt, key] = hash.split("$");
  if (scheme !== "scrypt" || Number(n) !== N || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
