import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const KH_TZ = "Asia/Phnom_Penh";

/** dd-mmm-yyyy in Phnom Penh time. */
export function formatDateKh(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: KH_TZ }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parts.find((p) => p.type === "day")!.value;
  return `${day}-${MONTH_ABBR[m - 1]}-${y}`;
}

export function formatDateTimeKh(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: KH_TZ });
}
