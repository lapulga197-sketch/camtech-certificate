import type { ThemeDefaults } from "@/lib/settings-types";

export type ThemePrefs = { mode: "light" | "dark" | "system"; accent: string; primary: string; bg: string };

export const THEME_KEYS = { mode: "theme-mode", accent: "theme-accent", primary: "theme-primary", bg: "theme-bg" } as const;

/** Inline script run before first paint (no flash). `d` = the admin's default theme. */
export function themeInitScript(d: ThemeDefaults): string {
  const D = JSON.stringify({ mode: d.mode, accent: d.accent, primary: d.primary, bg: d.bg }).replace(/</g, "\\u003c");
  return `(function(){try{var D=${D};var g=function(k,f){var v=localStorage.getItem(k);return v===null?f:v};
var mode=g('theme-mode',D.mode),acc=g('theme-accent',D.accent),pr=g('theme-primary',D.primary),bg=g('theme-bg',D.bg);
var r=document.documentElement;
var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(dark)r.classList.add('dark');
if(acc&&acc!=='default'&&/^[a-z-]+$/.test(acc))r.classList.add('accent-'+acc);
var hex=/^#[0-9a-fA-F]{6}$/;
function lum(h){var n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
if(hex.test(pr)){r.style.setProperty('--primary',pr);r.style.setProperty('--ring',pr);r.style.setProperty('--primary-foreground',lum(pr)>0.45?'#111111':'#ffffff')}
if(hex.test(bg)){var l=lum(bg)>0.4;r.style.setProperty('--background',bg);r.style.setProperty('--foreground',l?'#171717':'#f5f5f5');r.style.setProperty('--muted-foreground',l?'#6b6b6b':'#b5b5b5')}
}catch(e){}})();`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Applies a theme to <html> live (mirrors the init script). */
export function applyTheme(t: ThemePrefs) {
  const r = document.documentElement;
  const dark = t.mode === "dark" || (t.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  r.classList.toggle("dark", dark);
  [...r.classList].filter((c) => c.startsWith("accent-")).forEach((c) => r.classList.remove(c));
  if (t.accent && t.accent !== "default" && /^[a-z-]+$/.test(t.accent)) r.classList.add(`accent-${t.accent}`);
  for (const v of ["--primary", "--ring", "--primary-foreground", "--background", "--foreground", "--muted-foreground"]) r.style.removeProperty(v);
  if (HEX.test(t.primary)) {
    r.style.setProperty("--primary", t.primary);
    r.style.setProperty("--ring", t.primary);
    r.style.setProperty("--primary-foreground", lum(t.primary) > 0.45 ? "#111111" : "#ffffff");
  }
  if (HEX.test(t.bg)) {
    const light = lum(t.bg) > 0.4;
    r.style.setProperty("--background", t.bg);
    r.style.setProperty("--foreground", light ? "#171717" : "#f5f5f5");
    r.style.setProperty("--muted-foreground", light ? "#6b6b6b" : "#b5b5b5");
  }
}

export function readTheme(d: ThemePrefs): ThemePrefs {
  const g = (k: string, f: string) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? f : v;
    } catch {
      return f;
    }
  };
  return { mode: g(THEME_KEYS.mode, d.mode) as ThemePrefs["mode"], accent: g(THEME_KEYS.accent, d.accent), primary: g(THEME_KEYS.primary, d.primary), bg: g(THEME_KEYS.bg, d.bg) };
}

export function storeTheme(t: ThemePrefs) {
  try {
    localStorage.setItem(THEME_KEYS.mode, t.mode);
    localStorage.setItem(THEME_KEYS.accent, t.accent);
    localStorage.setItem(THEME_KEYS.primary, t.primary);
    localStorage.setItem(THEME_KEYS.bg, t.bg);
  } catch {
    /* private mode — theme still applies for this visit */
  }
}
