import type { DesignElement, PhotoCrop, Recipient } from "@/lib/certificate-design";

/** Ready-made photo rings (drawn with CSS, nothing to upload). */
export type BuiltinRing = { id: string; title: string; bg: string; inner: string; thickness: number; glow?: string };

export const BUILTIN_RINGS: BuiltinRing[] = [
  { id: "b:gold", title: "មាសរលោង", bg: "linear-gradient(135deg,#f9e29c 0%,#c9962b 28%,#fff1b8 50%,#b07d1c 74%,#f3d36f 100%)", inner: "#8a5f0f", thickness: 9, glow: "rgba(176,125,28,0.45)" },
  { id: "b:gold2", title: "មាសទ្វេ", bg: "linear-gradient(135deg,#fff1b8,#c9962b 35%,#fff1b8 60%,#b07d1c)", inner: "#fff4c7", thickness: 15, glow: "rgba(176,125,28,0.5)" },
  { id: "b:silver", title: "ប្រាក់", bg: "linear-gradient(135deg,#f4f6f8,#9aa3ad 30%,#ffffff 52%,#8b949e 76%,#e5e9ed)", inner: "#6b7480", thickness: 9, glow: "rgba(70,80,90,0.35)" },
  { id: "b:red", title: "ក្រហម-មាស", bg: "linear-gradient(135deg,#a3162a,#d4a017 45%,#7a0f1f)", inner: "#f3d36f", thickness: 10, glow: "rgba(122,15,31,0.4)" },
  { id: "b:white", title: "ស ស្រមោល", bg: "#ffffff", inner: "#e5e7eb", thickness: 8, glow: "rgba(0,0,0,0.35)" },
];

export const isBuiltinFrame = (id: string | undefined) => !!id && id.startsWith("b:");
export const ringOf = (id: string) => BUILTIN_RINGS.find((r) => r.id === id) ?? BUILTIN_RINGS[0];

/** Photo crop in effect: the recipient's own crop wins over the element's default. */
export function resolveCrop(el: DesignElement, recipient: Recipient | null | undefined): PhotoCrop {
  const o = recipient?.photoCrop ?? {};
  const pick = <K extends keyof PhotoCrop>(k: K, fallback: PhotoCrop[K]): PhotoCrop[K] => (o[k] ?? (el[k] as PhotoCrop[K] | undefined) ?? fallback);
  return {
    fit: pick("fit", "fill"),
    zoom: Math.max(1, Math.min(4, Number(pick("zoom", 1)) || 1)),
    px: Math.max(0, Math.min(100, Number(pick("px", 50)))),
    py: Math.max(0, Math.min(100, Number(pick("py", 0)))),
  };
}

/** Tiny placeholder portrait (used for previews where there is no real photo yet). */
export const SAMPLE_PORTRAIT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#cfe3f7'/><stop offset='1' stop-color='#8fb4dc'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><circle cx='200' cy='190' r='78' fill='#e8c3a0'/><path d='M40 500c10-120 70-190 160-190s150 70 160 190z' fill='#27406b'/><path d='M165 300l35 60 35-60z' fill='#fff'/></svg>`
  );
