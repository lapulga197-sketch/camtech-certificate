import "server-only";

export type AssetKind = "favicon" | "icon" | "logo" | "welcome" | "about" | "frame" | "help";

export const MAX_UPLOAD = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies

const IMG = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const ALLOWED: Record<AssetKind, string[]> = {
  favicon: [...IMG, "image/x-icon", "image/gif"],
  icon: IMG,
  logo: IMG,
  welcome: [...IMG, "image/gif"],
  about: IMG,
  frame: IMG,
  help: ["application/pdf"],
};

/** Detects the real type from the first bytes (the browser-supplied type is not trusted). */
export function sniff(buf: Buffer): string | null {
  if (buf.length < 8) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "image/x-icon";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  const head = buf.toString("utf8", 0, Math.min(buf.length, 2048)).trimStart().toLowerCase();
  if ((head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--") || head.startsWith("<!doctype svg")) && head.includes("<svg")) {
    const all = buf.toString("utf8").toLowerCase();
    if (/<script|javascript:|<foreignobject|\son[a-z]+\s*=|<iframe|<embed|<object/.test(all)) return null;
    return "image/svg+xml";
  }
  return null;
}
