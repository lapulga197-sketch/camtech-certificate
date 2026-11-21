import "server-only";
import { headers } from "next/headers";

export type ClientInfo = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string;
  os: string;
  browser: string;
};

function dec(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 80);
  } catch {
    return v.slice(0, 80);
  }
}

export function parseUserAgent(ua: string): { device: string; os: string; browser: string } {
  const u = ua || "";
  const device = /iPad|Tablet|PlayBook|Silk/i.test(u) || (/Android/i.test(u) && !/Mobile/i.test(u)) ? "tablet" : /Mobi|iPhone|Android/i.test(u) ? "mobile" : u ? "desktop" : "unknown";
  const os = /Windows NT/i.test(u) ? "Windows" : /Android/i.test(u) ? "Android" : /iPhone|iPad|iPod/i.test(u) ? "iOS" : /Mac OS X|Macintosh/i.test(u) ? "macOS" : /CrOS/i.test(u) ? "ChromeOS" : /Linux/i.test(u) ? "Linux" : "Other";
  const browser = /Edg\//i.test(u) ? "Edge" : /OPR\/|Opera/i.test(u) ? "Opera" : /SamsungBrowser/i.test(u) ? "Samsung" : /Firefox\//i.test(u) ? "Firefox" : /Chrome\/|CriOS/i.test(u) ? "Chrome" : /Safari\//i.test(u) ? "Safari" : "Other";
  return { device, os, browser };
}

/** IP, approximate location (Vercel geo headers) and device of the current request. */
export async function clientInfo(): Promise<ClientInfo> {
  let h: Headers;
  try {
    h = await headers();
  } catch {
    return { ip: "unknown", country: null, region: null, city: null, device: "unknown", os: "Other", browser: "Other" };
  }
  const fwd = h.get("x-forwarded-for") || "";
  const ip = (h.get("x-real-ip") || fwd.split(",")[0] || "unknown").trim().slice(0, 64) || "unknown";
  return {
    ip,
    country: dec(h.get("x-vercel-ip-country")),
    region: dec(h.get("x-vercel-ip-country-region")),
    city: dec(h.get("x-vercel-ip-city")),
    ...parseUserAgent(h.get("user-agent") || ""),
  };
}
