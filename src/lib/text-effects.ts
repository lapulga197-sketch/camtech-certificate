import type { CSSProperties } from "react";

/** Text styles for the designer: 3D, shadows, outline, glow, gradients. */
export type FxPreset =
  | "none" | "shadow" | "soft-shadow" | "glow" | "outline" | "3d" | "3d-deep" | "long-shadow" | "emboss" | "neon" | "gradient" | "gradient-3d" | "retro";

export type TextFx = {
  preset: FxPreset;
  /** Main effect colour (extrusion, outline, glow, gradient start). */
  c1: string;
  /** Second colour (gradient end, emboss highlight, retro offset). */
  c2: string;
  /** Strength: depth / blur / width in px (1–24). */
  size: number;
  /** Direction in degrees (3D, shadows, gradient). */
  angle: number;
};

export const FX_PRESETS: { id: FxPreset; label: string; needs: ("c1" | "c2" | "size" | "angle")[]; sample: Partial<TextFx>; sampleColor?: string }[] = [
  { id: "none", label: "គ្មាន", needs: [], sample: {} },
  { id: "shadow", label: "ស្រមោល", needs: ["c1", "size", "angle"], sample: { c1: "#00000066", size: 4, angle: 45 } },
  { id: "soft-shadow", label: "ស្រមោលទន់", needs: ["c1", "size"], sample: { c1: "#00000088", size: 8 } },
  { id: "glow", label: "ភ្លឺរស្មី", needs: ["c1", "size"], sample: { c1: "#f5c518", size: 10 }, sampleColor: "#ffffff" },
  { id: "outline", label: "ព្រុំជុំវិញ", needs: ["c1", "size"], sample: { c1: "#1f3a68", size: 3 }, sampleColor: "#ffffff" },
  { id: "3d", label: "3D", needs: ["c1", "size", "angle"], sample: { c1: "#7a5a00", size: 6, angle: 45 }, sampleColor: "#f2c94c" },
  { id: "3d-deep", label: "3D ជ្រៅ (ដឺក្រេពណ៌)", needs: ["c1", "c2", "size", "angle"], sample: { c1: "#b8860b", c2: "#3b2a00", size: 12, angle: 60 }, sampleColor: "#ffe08a" },
  { id: "long-shadow", label: "ស្រមោលវែង", needs: ["c1", "size", "angle"], sample: { c1: "#1d4ed8", size: 14, angle: 45 }, sampleColor: "#ffffff" },
  { id: "emboss", label: "ចម្លាក់", needs: ["c1", "c2"], sample: { c1: "#ffffff", c2: "#00000066" }, sampleColor: "#9aa4b2" },
  { id: "neon", label: "នេអុង", needs: ["c1", "size"], sample: { c1: "#ec4899", size: 10 }, sampleColor: "#ffffff" },
  { id: "gradient", label: "ពណ៌ដឺក្រេ", needs: ["c1", "c2", "angle"], sample: { c1: "#f59e0b", c2: "#dc2626", angle: 90 } },
  { id: "gradient-3d", label: "ដឺក្រេ + 3D", needs: ["c1", "c2", "size", "angle"], sample: { c1: "#ffe27a", c2: "#c98a0b", size: 5, angle: 90 } },
  { id: "retro", label: "រ៉េត្រូ", needs: ["c1", "c2", "size"], sample: { c1: "#e11d48", c2: "#1e293b", size: 4 }, sampleColor: "#fde68a" },
];

export const DEFAULT_FX: TextFx = { preset: "none", c1: "#7a5a00", c2: "#ffffff", size: 6, angle: 45 };

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function rgb(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(f.padEnd(6, "0"), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b, a] = rgb(hex);
  return `rgba(${r},${g},${b},${Math.round(alpha * a * 1000) / 1000})`;
}

/** Offsets along an angle (0° = right, 90° = down). */
function dir(angle: number): [number, number] {
  const r = (angle * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
}

/**
 * CSS for a text element's effect. Only widely supported properties are used
 * (text-shadow, background-clip:text, filter) so the effect is identical in the
 * editor, the print view and the PNG / PDF export.
 */
export function textFxStyle(fx: TextFx | undefined): CSSProperties {
  if (!fx || fx.preset === "none") return {};
  const size = clamp(fx.size, 1, 24);
  const [dx, dy] = dir(fx.angle);
  const c1 = fx.c1;
  const c2 = fx.c2;
  switch (fx.preset) {
    case "shadow":
      return { textShadow: `${(dx * size).toFixed(1)}px ${(dy * size).toFixed(1)}px ${(size * 0.6).toFixed(1)}px ${c1}` };
    case "soft-shadow":
      return { textShadow: `0 ${(size * 0.4).toFixed(1)}px ${size}px ${c1}, 0 1px 2px ${rgba(c1, 0.6)}` };
    case "glow":
      return { textShadow: `0 0 ${size * 0.5}px ${c1}, 0 0 ${size}px ${c1}, 0 0 ${size * 2}px ${rgba(c1, 0.7)}` };
    case "outline": {
      const w = clamp(size / 3, 0.6, 8);
      const pts: string[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pts.push(`${(Math.cos(a) * w).toFixed(2)}px ${(Math.sin(a) * w).toFixed(2)}px 0 ${c1}`);
      }
      return { textShadow: pts.join(",") };
    }
    case "3d":
    case "3d-deep": {
      const depth = fx.preset === "3d" ? size : Math.round(size * 1.6);
      const layers: string[] = [];
      for (let i = 1; i <= depth; i++) {
        const col = fx.preset === "3d" ? mix(c1, "#000000", (i / depth) * 0.35) : mix(c1, c2, i / depth);
        layers.push(`${(dx * i).toFixed(1)}px ${(dy * i).toFixed(1)}px 0 ${col}`);
      }
      layers.push(`${(dx * (depth + 3)).toFixed(1)}px ${(dy * (depth + 3)).toFixed(1)}px ${Math.round(depth * 0.8) + 2}px rgba(0,0,0,0.38)`);
      return { textShadow: layers.join(",") };
    }
    case "long-shadow": {
      const steps = Math.round(size * 3);
      const layers: string[] = [];
      for (let i = 1; i <= steps; i++) layers.push(`${(dx * i).toFixed(1)}px ${(dy * i).toFixed(1)}px 0 ${rgba(c1, 1 - (i / steps) * 0.85)}`);
      return { textShadow: layers.join(",") };
    }
    case "emboss":
      return { textShadow: `1px 1px 1px ${c1}, -1px -1px 1px ${c2}` };
    case "neon":
      return { textShadow: `0 0 ${size * 0.25}px #ffffff, 0 0 ${size * 0.6}px ${c1}, 0 0 ${size}px ${c1}, 0 0 ${size * 2}px ${c1}, 0 0 ${size * 3}px ${c1}` };
    case "gradient":
      return {
        backgroundImage: `linear-gradient(${fx.angle}deg, ${c1}, ${c2})`,
        WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent",
      };
    case "gradient-3d": {
      const dark = mix(c2, "#000000", 0.55);
      const layers: string[] = [];
      for (let i = 1; i <= Math.round(size); i++) layers.push(`drop-shadow(0px ${i}px 0 ${dark})`);
      layers.push(`drop-shadow(0px ${Math.round(size) + 2}px ${Math.round(size)}px rgba(0,0,0,0.35))`);
      return {
        backgroundImage: `linear-gradient(${fx.angle}deg, ${c1}, ${c2})`,
        WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent",
        filter: layers.join(" "),
      };
    }
    case "retro":
      return { textShadow: `${size}px ${size}px 0 ${c1}, ${size * 2}px ${size * 2}px 0 ${c2}` };
    default:
      return {};
  }
}
