import type { ColorKey, Theme } from "@/lib/certificate-design";

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** The colour a ColorKey resolves to in a theme ("onPrimary" = readable text on the primary colour). */
export function themeColor(theme: Theme, ck: ColorKey): string {
  if (ck === "onPrimary") return luminance(theme.primary) > 0.45 ? "#111827" : "#ffffff";
  return theme[ck];
}
