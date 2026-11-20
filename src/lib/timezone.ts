/** Phnom Penh (UTC+7, no DST) helpers, independent of the server's timezone. */
const OFFSET_MS = 7 * 60 * 60 * 1000;

export function todayInPhnomPenh(): string {
  const d = new Date(Date.now() + OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

export function toPhnomPenhDateInput(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
