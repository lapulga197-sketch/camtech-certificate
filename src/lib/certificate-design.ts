/**
 * Data model + helpers for the document studio (ស្ទូឌីយោឯកសារ): certificates,
 * appreciation certificates, appreciation letters, greeting letters and student cards.
 *
 * A design is a page (paper size + orientation), a background (colour, theme
 * decoration, optional uploaded image), a border, an optional watermark and a
 * list of freely positioned elements (text, images, photo, QR, lines).
 * Positions and widths are percentages of the page so the same design scales
 * to any paper size; font sizes are in pt.
 */
import { MONTH_NAMES_KH } from "@/lib/khmer";
import { buildElements } from "@/lib/certificate-layouts";
import { themeColor } from "@/lib/theme-color";
import type { TextFx } from "@/lib/text-effects";

export type DocType = "certificate" | "award" | "appreciation_letter" | "greeting" | "student_card";
export type PaperKey = "A4" | "A5" | "A6" | "A3" | "LETTER" | "CR80" | "CUSTOM";
export type Orientation = "landscape" | "portrait";

/** Portrait size in mm. */
export const PAPERS: Record<PaperKey, { label: string; w: number; h: number }> = {
  A4: { label: "A4 (210 × 297 mm)", w: 210, h: 297 },
  A5: { label: "A5 (148 × 210 mm)", w: 148, h: 210 },
  A6: { label: "A6 (105 × 148 mm)", w: 105, h: 148 },
  CR80: { label: "កាត CR80 (54 × 85.6 mm)", w: 53.98, h: 85.6 },
  A3: { label: "A3 (297 × 420 mm)", w: 297, h: 420 },
  LETTER: { label: "Letter (216 × 279 mm)", w: 215.9, h: 279.4 },
  CUSTOM: { label: "ទំហំផ្ទាល់ខ្លួន (mm)", w: 210, h: 297 },
};

export const MM_TO_PX = 96 / 25.4;
export const PT_TO_PX = 96 / 72;

export type FontKey =
  | "Moul" | "Battambang" | "Hanuman" | "Koulen" | "Siemreap" | "Noto Serif Khmer" | "Bokor"
  | "Kantumruy Pro" | "Noto Sans Khmer" | "Playfair Display" | "Great Vibes" | "Cinzel" | "Montserrat";

export const FONTS: { key: FontKey; label: string; css: string; khmer: boolean; weights: number[] }[] = [
  { key: "Moul", label: "Moul — ចំណងជើងបុរាណ", css: "'Moul', 'Noto Serif Khmer', serif", khmer: true, weights: [400] },
  { key: "Bokor", label: "Bokor — ចំណងជើងប្រពៃណី", css: "'Bokor', 'Noto Serif Khmer', serif", khmer: true, weights: [400] },
  { key: "Koulen", label: "Koulen — ចំណងជើងក្រាស់", css: "'Koulen', 'Noto Sans Khmer', sans-serif", khmer: true, weights: [400] },
  { key: "Battambang", label: "Battambang — អក្សរទូទៅ", css: "'Battambang', 'Noto Serif Khmer', serif", khmer: true, weights: [400, 700] },
  { key: "Hanuman", label: "Hanuman — អក្សរមានជើង", css: "'Hanuman', 'Noto Serif Khmer', serif", khmer: true, weights: [400, 700] },
  { key: "Siemreap", label: "Siemreap — អក្សររាងស្រាល", css: "'Siemreap', 'Noto Sans Khmer', sans-serif", khmer: true, weights: [400] },
  { key: "Noto Serif Khmer", label: "Noto Serif Khmer", css: "'Noto Serif Khmer', serif", khmer: true, weights: [400, 700] },
  { key: "Noto Sans Khmer", label: "Noto Sans Khmer", css: "'Noto Sans Khmer', sans-serif", khmer: true, weights: [400, 700] },
  { key: "Kantumruy Pro", label: "Kantumruy Pro — ទំនើប", css: "'Kantumruy Pro', 'Noto Sans Khmer', sans-serif", khmer: true, weights: [400, 700] },
  { key: "Playfair Display", label: "Playfair Display (EN)", css: "'Playfair Display', 'Noto Serif Khmer', serif", khmer: false, weights: [400, 700] },
  { key: "Cinzel", label: "Cinzel (EN)", css: "'Cinzel', 'Noto Serif Khmer', serif", khmer: false, weights: [400, 700] },
  { key: "Great Vibes", label: "Great Vibes — ស្គ្រីប (EN)", css: "'Great Vibes', 'Noto Serif Khmer', cursive", khmer: false, weights: [400] },
  { key: "Montserrat", label: "Montserrat (EN)", css: "'Montserrat', 'Noto Sans Khmer', sans-serif", khmer: false, weights: [400, 700] },
];

export function fontCss(key: string | undefined): string {
  return (FONTS.find((f) => f.key === key) ?? FONTS[3]).css;
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export type DecorKind = "none" | "corners" | "bands" | "waves" | "frame" | "geometric";
export type BorderStyle = "none" | "single" | "double" | "thick-thin" | "ornate";
export type ColorKey = "primary" | "accent" | "text" | "muted" | "onPrimary";
export type LangMode = "km" | "en" | "mix";
export type LayoutKind =
  | "standard" | "ministry" | "award"
  | "letter-official" | "letter-simple"
  | "greeting-card"
  | "card-front" | "card-back";

export type Theme = {
  id: string;
  label: string;
  bgColor: string;
  /** Optional CSS background (gradient) drawn over bgColor when there is no image. */
  bgGradient?: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  decor: DecorKind;
  border: { style: BorderStyle; color: string; color2: string; widthMm: number; insetMm: number };
};

export const THEMES: Theme[] = [
  {
    id: "classic-gold", label: "មាសបុរាណ",
    bgColor: "#fffaf0", bgGradient: "radial-gradient(ellipse at center, #ffffff 0%, #fff7e0 100%)",
    primary: "#1f3a68", accent: "#a67c00", text: "#2b2b2b", muted: "#6b6b6b", decor: "corners",
    border: { style: "double", color: "#b8860b", color2: "#d4af37", widthMm: 1.2, insetMm: 7 },
  },
  {
    id: "ministry-blue", label: "ខៀវក្រសួង (ស៊ុមលម្អ)",
    bgColor: "#ffffff", bgGradient: "radial-gradient(ellipse at center, #ffffff 0%, #eef6fd 100%)",
    primary: "#1f4e9c", accent: "#c0272d", text: "#2b4a7a", muted: "#4d6a96", decor: "none",
    border: { style: "ornate", color: "#a7c3de", color2: "#2f6aa6", widthMm: 1.4, insetMm: 6 },
  },
  {
    id: "royal-blue", label: "ខៀវភ្លឺ",
    bgColor: "#f3f8ff", bgGradient: "linear-gradient(135deg, #ffffff 0%, #e6f0ff 100%)",
    primary: "#0b4a9e", accent: "#c9971a", text: "#1d2b44", muted: "#5b6b86", decor: "bands",
    border: { style: "none", color: "#0b4a9e", color2: "#c9971a", widthMm: 1, insetMm: 6 },
  },
  {
    id: "emerald", label: "បៃតងធម្មជាតិ",
    bgColor: "#f4fbf6", bgGradient: "linear-gradient(160deg, #ffffff 0%, #e4f5e9 100%)",
    primary: "#146c43", accent: "#b8860b", text: "#1f2d25", muted: "#587064", decor: "waves",
    border: { style: "single", color: "#146c43", color2: "#b8860b", widthMm: 1.2, insetMm: 6 },
  },
  {
    id: "maroon", label: "ក្រហមរាជវង្ស",
    bgColor: "#fff8f1", bgGradient: "radial-gradient(ellipse at center, #ffffff 0%, #fdeedd 100%)",
    primary: "#7a1022", accent: "#b8860b", text: "#2a1a1a", muted: "#7a5c5c", decor: "frame",
    border: { style: "thick-thin", color: "#7a1022", color2: "#b8860b", widthMm: 1.6, insetMm: 6 },
  },
  {
    id: "geometric", label: "ធរណីមាត្រទំនើប",
    bgColor: "#ffffff",
    primary: "#6d28d9", accent: "#f59e0b", text: "#27272a", muted: "#71717a", decor: "geometric",
    border: { style: "none", color: "#6d28d9", color2: "#f59e0b", widthMm: 1, insetMm: 6 },
  },
  {
    id: "minimal", label: "សាមញ្ញស្អាត",
    bgColor: "#ffffff",
    primary: "#111827", accent: "#6b7280", text: "#1f2937", muted: "#6b7280", decor: "none",
    border: { style: "single", color: "#111827", color2: "#9ca3af", widthMm: 0.6, insetMm: 8 },
  },
  {
    id: "midnight", label: "ងងឹតប្រណីត",
    bgColor: "#0f1b33", bgGradient: "radial-gradient(ellipse at center, #1b2d52 0%, #0b1426 100%)",
    primary: "#f2d27a", accent: "#e8c15a", text: "#f3f4f6", muted: "#b6bfd0", decor: "frame",
    border: { style: "double", color: "#d4af37", color2: "#f2d27a", widthMm: 1, insetMm: 7 },
  },
  {
    id: "festive-red", label: "ក្រហមបុណ្យចូលឆ្នាំ",
    bgColor: "#fff6ec", bgGradient: "radial-gradient(ellipse at center, #fffdf8 0%, #ffe7cc 100%)",
    primary: "#a3121f", accent: "#c98a0b", text: "#3a1a14", muted: "#8a5a4a", decor: "corners",
    border: { style: "double", color: "#a3121f", color2: "#d9a521", widthMm: 1.2, insetMm: 7 },
  },
  {
    id: "blossom", label: "ផ្កាផ្កាឈូក",
    bgColor: "#fff5f8", bgGradient: "linear-gradient(160deg, #ffffff 0%, #ffe3ec 100%)",
    primary: "#b0285a", accent: "#d98a1a", text: "#3b2230", muted: "#8a6577", decor: "waves",
    border: { style: "single", color: "#b0285a", color2: "#e8a9c0", widthMm: 1, insetMm: 6 },
  },
  {
    id: "blank", label: "ទទេ (គ្មានតុបតែង)",
    bgColor: "#ffffff",
    primary: "#111827", accent: "#374151", text: "#111827", muted: "#6b7280", decor: "none",
    border: { style: "none", color: "#111827", color2: "#9ca3af", widthMm: 1, insetMm: 6 },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// ---------------------------------------------------------------------------
// Design / elements
// ---------------------------------------------------------------------------

export type ElementType = "text" | "image" | "photo" | "qr" | "line";
export type ImageShape = "rect" | "rounded" | "circle";

export type DesignElement = {
  id: string;
  type: ElementType;
  /** Semantic name of a default element, used to keep text when the layout is rebuilt. */
  role?: string;
  /** Which theme colour the text/line follows (so a theme change recolours it). */
  ck?: ColorKey;
  /** Colour of [[highlighted]] segments in a text element (bold + this colour). */
  hlColor?: string;
  hlCk?: ColorKey;
  /** Placeholder caption of an empty image slot (editor only), e.g. "ត្រា". */
  label?: string;
  /** Left / top / width as % of the page. */
  x: number;
  y: number;
  w: number;
  /** width / height for image, photo and qr. */
  ar?: number;
  text?: string;
  src?: string;
  fontFamily?: FontKey;
  fontSize?: number; // pt
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number; // px
  /** Text effect (3D, shadow, outline, glow, gradient…). */
  fx?: TextFx;
  opacity?: number; // 0..1
  rotate?: number; // deg
  shape?: ImageShape;
  borderColor?: string;
  borderWidth?: number; // px
  thickness?: number; // px, for line
};

export type WatermarkType = "text" | "image";

export type CertDesign = {
  v: 1;
  /** Which kind of document this design is for. Older saved designs have none = certificate. */
  doc: DocType;
  langMode: LangMode;
  layout: LayoutKind;
  paper: PaperKey;
  orientation: Orientation;
  customW: number;
  customH: number;
  themeId: string;
  bgColor: string;
  bgImage?: string;
  bgFit: "cover" | "contain" | "stretch";
  bgImageOpacity: number;
  /** Decorative frame uploaded by an admin (a transparent PNG / SVG laid over the page). */
  frame?: { id: string; title: string; opacity: number };
  showDecor: boolean;
  border: { style: BorderStyle; color: string; color2: string; widthMm: number; insetMm: number };
  watermark: {
    enabled: boolean;
    type: WatermarkType;
    text: string;
    image?: string;
    fontFamily: FontKey;
    color: string;
    opacity: number;
    sizePct: number; // text: % of page width as font size basis; image: width %
    rotate: number;
  };
  dateStyle: "kh" | "khNum" | "en" | "iso";
  elements: DesignElement[];
};

export type Org = { name: string; nameEn: string; logo?: string | null; address?: string; phone?: string };

export type Recipient = {
  id: string;
  studentId?: string;
  code?: string;
  name: string;
  nameEn?: string;
  course: string;
  courseId?: string;
  /** Class the study period was read from (so it can be refreshed later). */
  batchId?: string;
  grade: string;
  gradeEn?: string;
  courseEn?: string;
  /** "M" / "F" (or Khmer / English words, see genderKh / genderEn). */
  gender?: string;
  dob?: string; // YYYY-MM-DD
  nationality?: string;
  nationalityEn?: string;
  /** Study period, YYYY-MM-DD. */
  startDate?: string;
  endDate?: string;
  date: string; // YYYY-MM-DD
  duration?: string;
  certNo?: string;
  qr?: string;
  photo?: string;
  /** Job title / student status (card, letters). */
  position?: string;
  positionEn?: string;
  phone?: string;
  address?: string;
  /** Card validity, YYYY-MM-DD. */
  validUntil?: string;
  /** Why the appreciation is given (award certificate / appreciation letter). */
  reason?: string;
  reasonEn?: string;
  /** Occasion of a greeting (e.g. Khmer New Year). */
  occasion?: string;
  occasionEn?: string;
  /** Subject line of a letter. */
  subject?: string;
  /** Free body text of a letter / greeting (may contain {variables}). */
  message?: string;
  messageEn?: string;
};

export function pageSizeMm(d: Pick<CertDesign, "paper" | "orientation" | "customW" | "customH">): { w: number; h: number } {
  const base = d.paper === "CUSTOM" ? { w: d.customW, h: d.customH } : PAPERS[d.paper];
  const w = Math.min(base.w, base.h);
  const h = Math.max(base.w, base.h);
  return d.orientation === "landscape" ? { w: h, h: w } : { w, h };
}

export function pageSizePx(d: Pick<CertDesign, "paper" | "orientation" | "customW" | "customH">): { w: number; h: number } {
  const mm = pageSizeMm(d);
  return { w: Math.round(mm.w * MM_TO_PX), h: Math.round(mm.h * MM_TO_PX) };
}

let seq = 0;
export function newId(prefix = "e"): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

// ---------------------------------------------------------------------------
// Default layout
// ---------------------------------------------------------------------------

export type LayoutOpts = { lang: LangMode; layout: LayoutKind; doc?: DocType; paper?: PaperKey };

/** Border / decoration sizes in a theme are tuned for A4; small cards use a fraction of them. */
export function borderScale(doc: DocType | undefined): number {
  return doc === "student_card" ? 0.3 : 1;
}

function scaledBorder(theme: Theme, doc: DocType | undefined): Theme["border"] {
  const k = borderScale(doc);
  return { ...theme.border, widthMm: Math.round(theme.border.widthMm * k * 100) / 100, insetMm: Math.round(theme.border.insetMm * k * 10) / 10 };
}

export function buildDefaultElements(theme: Theme, orientation: Orientation, org: Org, opts: LayoutOpts = { lang: "mix", layout: "standard" }): DesignElement[] {
  return buildElements(theme, orientation, org, opts.lang, opts.layout, opts.doc ?? "certificate");
}

const LEGACY_COLOR_BY_ROLE: Record<string, ColorKey> = {
  org: "primary", orgEn: "muted", title: "primary", subtitle: "accent", lead: "muted",
  name: "accent", nameLine: "accent", body: "text", date: "text",
  sign1Title: "text", sign2Title: "text", sign1Line: "text", sign2Line: "text", certNo: "muted",
};

/** Recolours the semantic elements of a design to a theme's palette. */
export function recolorForTheme(elements: DesignElement[], theme: Theme): DesignElement[] {
  return elements.map((e) => {
    const ck = e.ck ?? (e.role ? LEGACY_COLOR_BY_ROLE[e.role] : undefined);
    if (!ck || (e.type !== "text" && e.type !== "line")) return e;
    const next: DesignElement = { ...e, ck, color: themeColor(theme, ck) };
    if (e.hlCk) next.hlColor = themeColor(theme, e.hlCk);
    return next;
  });
}

export function createDesign(themeId: string, orientation: Orientation, org: Org, opts: LayoutOpts = { lang: "mix", layout: "standard" }): CertDesign {
  const theme = getTheme(themeId);
  return {
    v: 1,
    doc: opts.doc ?? "certificate",
    langMode: opts.lang,
    layout: opts.layout,
    paper: opts.paper ?? "A4",
    orientation,
    customW: 210,
    customH: 297,
    themeId: theme.id,
    bgColor: theme.bgColor,
    bgFit: "cover",
    bgImageOpacity: 1,
    showDecor: true,
    border: scaledBorder(theme, opts.doc),
    watermark: {
      enabled: false, type: "text", text: "ឈ្មោះមជ្ឈមណ្ឌល", fontFamily: "Moul", color: theme.primary,
      opacity: 0.07, sizePct: 8, rotate: -25,
    },
    dateStyle: "kh",
    elements: buildDefaultElements(theme, orientation, org, opts),
  };
}

/** Applies a theme to an existing design (background, border, decoration, element colours). */
export function applyTheme(d: CertDesign, themeId: string): CertDesign {
  const theme = getTheme(themeId);
  return {
    ...d,
    themeId: theme.id,
    bgColor: theme.bgColor,
    // an uploaded frame replaces the theme's own border and decoration
    border: d.frame ? { ...scaledBorder(theme, d.doc), style: "none" } : scaledBorder(theme, d.doc),
    showDecor: !d.frame,
    elements: recolorForTheme(d.elements, theme),
    watermark: { ...d.watermark, color: theme.primary },
  };
}

/**
 * Rebuilds the default layout (another orientation, language mode or layout
 * kind). Text/font/colour the user EDITED are carried over per role, uploaded
 * images (logo, emblem, stamp, signature) always are; everything the user did
 * not touch simply takes the new default.
 */
export function rebuildLayout(d: CertDesign, patch: Partial<LayoutOpts> & { orientation?: Orientation }, org: Org): CertDesign {
  const theme = getTheme(d.themeId);
  const orientation = patch.orientation ?? d.orientation;
  const opts: LayoutOpts = { lang: patch.lang ?? d.langMode ?? "mix", layout: patch.layout ?? d.layout ?? "standard", doc: d.doc };
  const fresh = buildDefaultElements(theme, orientation, org, opts);
  // What the OLD configuration would have generated, to tell edited from untouched.
  const oldDefaults = new Map(
    buildDefaultElements(theme, d.orientation, org, { lang: d.langMode ?? "mix", layout: d.layout ?? "standard", doc: d.doc })
      .filter((e) => e.role)
      .map((e) => [e.role!, e])
  );
  const oldByRole = new Map(d.elements.filter((e) => e.role).map((e) => [e.role!, e]));
  const merged = fresh.map((e) => {
    const old = e.role ? oldByRole.get(e.role) : undefined;
    if (!old) return e;
    const base = e.role ? oldDefaults.get(e.role) : undefined;
    const next: DesignElement = { ...e };
    if (e.type === "image") {
      if (old.src) { next.src = old.src; next.ar = old.ar ?? e.ar; }
      return next;
    }
    if (e.type === "text" && base) {
      if (old.text !== base.text) next.text = old.text;
      if (old.fontFamily !== base.fontFamily) next.fontFamily = old.fontFamily;
      if (old.color !== base.color) { next.color = old.color; next.ck = undefined; }
      if (old.bold !== base.bold) next.bold = old.bold;
      if (old.italic !== base.italic) next.italic = old.italic;
    }
    return next;
  });
  // Elements added by the user keep their place (positions are percentages).
  const custom = d.elements.filter((e) => !e.role);
  return { ...d, orientation, langMode: opts.lang, layout: opts.layout, elements: [...merged, ...custom] };
}

/** Rebuilds the default layout for another orientation (kept for older callers). */
export function relayout(d: CertDesign, orientation: Orientation, org: Org): CertDesign {
  return rebuildLayout(d, { orientation }, org);
}

/** Scales every font size (used when the paper size changes). */
export function scaleFonts(elements: DesignElement[], factor: number): DesignElement[] {
  return elements.map((e) => (e.fontSize ? { ...e, fontSize: Math.max(4, Math.round(e.fontSize * factor * 10) / 10) } : e));
}

// ---------------------------------------------------------------------------
// Text variables + dates
// ---------------------------------------------------------------------------

const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
export function toKhmerDigits(s: string): string {
  return s.replace(/\d/g, (d) => KH_DIGITS[Number(d)]);
}

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatCertDate(iso: string, style: CertDesign["dateStyle"]): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [m[1], parseInt(m[2], 10), m[3]];
  if (style === "iso") return `${d}/${m[2]}/${y}`;
  if (style === "en") return `${EN_MONTHS[mo - 1]} ${parseInt(d, 10)}, ${y}`;
  const kh = `ថ្ងៃទី ${d} ខែ ${MONTH_NAMES_KH[mo - 1]} ឆ្នាំ ${y}`;
  return style === "khNum" ? toKhmerDigits(kh) : kh;
}

/** "15 មករា 2025" — a plain day-month-year in Khmer (Khmer digits when the date style asks for them). */
export function formatShortKh(iso: string | undefined, style: CertDesign["dateStyle"]): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return "";
  const t = `${m[3]} ${MONTH_NAMES_KH[parseInt(m[2], 10) - 1]} ${m[1]}`;
  return style === "khNum" ? toKhmerDigits(t) : t;
}

/** "15 January 2025". */
export function formatShortEn(iso: string | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return "";
  return `${m[3]} ${EN_MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export function genderKh(g: string | undefined): string {
  const v = (g ?? "").trim().toUpperCase();
  if (!v) return "";
  if (v === "M" || v === "MALE" || v === "ប្រុស") return "ប្រុស";
  if (v === "F" || v === "FEMALE" || v === "ស្រី") return "ស្រី";
  return g ?? "";
}

export function genderEn(g: string | undefined): string {
  const v = (g ?? "").trim().toUpperCase();
  if (!v) return "";
  if (v === "M" || v === "MALE" || v === "ប្រុស") return "Male";
  if (v === "F" || v === "FEMALE" || v === "ស្រី") return "Female";
  return g ?? "";
}

/** Study length between two dates, e.g. { km: "៣ ខែ", en: "3 months" }. Empty when a date is missing. */
export function computeDuration(start: string | undefined, end: string | undefined, style: CertDesign["dateStyle"]): { km: string; en: string } {
  const a = start ? Date.parse(start.slice(0, 10) + "T00:00:00Z") : NaN;
  const b = end ? Date.parse(end.slice(0, 10) + "T00:00:00Z") : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return { km: "", en: "" };
  const days = Math.round((b - a) / 86400000) + 1;
  const months = Math.round(days / 30.44);
  const num = (n: number) => (style === "khNum" ? toKhmerDigits(String(n)) : String(n));
  if (months >= 1) return { km: `${num(months)} ខែ`, en: `${months} month${months > 1 ? "s" : ""}` };
  return { km: `${num(days)} ថ្ងៃ`, en: `${days} day${days > 1 ? "s" : ""}` };
}

export type VariableDef = { key: string; label: string; docs?: DocType[] };

export const VARIABLES: VariableDef[] = [
  { key: "name", label: "ឈ្មោះអ្នកទទួល" },
  { key: "nameEn", label: "ឈ្មោះអង់គ្លេស" },
  { key: "gender", label: "ភេទ (ខ្មែរ)", docs: ["certificate", "student_card"] },
  { key: "genderEn", label: "ភេទ (អង់គ្លេស)", docs: ["certificate", "student_card"] },
  { key: "nationality", label: "សញ្ជាតិ", docs: ["certificate", "student_card"] },
  { key: "nationalityEn", label: "សញ្ជាតិ (EN)", docs: ["certificate", "student_card"] },
  { key: "dob", label: "ថ្ងៃកំណើត", docs: ["certificate", "student_card"] },
  { key: "dobEn", label: "ថ្ងៃកំណើត (EN)", docs: ["certificate", "student_card"] },
  { key: "course", label: "វគ្គសិក្សា / ថ្នាក់ / ជំនាញ", docs: ["certificate", "award", "student_card"] },
  { key: "courseEn", label: "វគ្គសិក្សា (EN)", docs: ["certificate", "award", "student_card"] },
  { key: "grade", label: "ពិន្ទុ / និទ្ទេស", docs: ["certificate", "award"] },
  { key: "gradeEn", label: "និទ្ទេស (EN)", docs: ["certificate", "award"] },
  { key: "startDate", label: "ថ្ងៃចាប់ផ្តើមសិក្សា", docs: ["certificate", "student_card"] },
  { key: "endDate", label: "ថ្ងៃបញ្ចប់សិក្សា", docs: ["certificate", "student_card"] },
  { key: "startDateEn", label: "ចាប់ផ្តើម (EN)", docs: ["certificate", "student_card"] },
  { key: "endDateEn", label: "បញ្ចប់ (EN)", docs: ["certificate", "student_card"] },
  { key: "duration", label: "រយៈពេល", docs: ["certificate"] },
  { key: "durationEn", label: "រយៈពេល (EN)", docs: ["certificate"] },
  { key: "position", label: "តួនាទី / ស្ថានភាព", docs: ["appreciation_letter", "greeting", "student_card", "award"] },
  { key: "positionEn", label: "តួនាទី (EN)", docs: ["appreciation_letter", "greeting", "student_card", "award"] },
  { key: "reason", label: "ហេតុផលសរសើរ", docs: ["award", "appreciation_letter"] },
  { key: "reasonEn", label: "ហេតុផលសរសើរ (EN)", docs: ["award", "appreciation_letter"] },
  { key: "occasion", label: "ឱកាសជូនពរ", docs: ["greeting"] },
  { key: "occasionEn", label: "ឱកាសជូនពរ (EN)", docs: ["greeting"] },
  { key: "subject", label: "កម្មវត្ថុ", docs: ["appreciation_letter", "greeting"] },
  { key: "message", label: "អត្ថបទខ្លឹមសារ", docs: ["appreciation_letter", "greeting"] },
  { key: "messageEn", label: "អត្ថបទខ្លឹមសារ (EN)", docs: ["appreciation_letter", "greeting"] },
  { key: "phone", label: "ទូរស័ព្ទអ្នកទទួល", docs: ["student_card"] },
  { key: "address", label: "អាសយដ្ឋានអ្នកទទួល", docs: ["student_card"] },
  { key: "validUntil", label: "សុពលភាពដល់", docs: ["student_card"] },
  { key: "validUntilEn", label: "សុពលភាពដល់ (EN)", docs: ["student_card"] },
  { key: "date", label: "កាលបរិច្ឆេទចេញ" },
  { key: "dateEn", label: "កាលបរិច្ឆេទចេញ (EN)" },
  { key: "certNo", label: "លេខឯកសារ" },
  { key: "code", label: "កូដ / អត្តលេខ", docs: ["certificate", "student_card"] },
  { key: "org", label: "ឈ្មោះអង្គភាព" },
  { key: "orgEn", label: "ឈ្មោះអង្គភាព (EN)" },
  { key: "orgAddress", label: "អាសយដ្ឋានអង្គភាព" },
  { key: "orgPhone", label: "ទូរស័ព្ទអង្គភាព" },
];

export function variablesFor(doc: DocType | undefined): VariableDef[] {
  const d = doc ?? "certificate";
  return VARIABLES.filter((v) => !v.docs || v.docs.includes(d));
}

/**
 * Replaces {variables}. A line that contains a variable with no value is
 * dropped, so optional lines (e.g. the study period of a student who has no
 * dates yet) simply disappear instead of printing "ពី  ដល់".
 */
export function fillVariables(text: string, r: Recipient | null, org: Org, d: Pick<CertDesign, "dateStyle">): string {
  const dur = computeDuration(r?.startDate, r?.endDate, d.dateStyle);
  const base: Record<string, string> = {
    name: r?.name ?? "",
    nameEn: r?.nameEn || r?.name || "",
    gender: genderKh(r?.gender),
    genderEn: genderEn(r?.gender),
    nationality: r?.nationality ?? "",
    nationalityEn: r?.nationalityEn ?? "",
    dob: formatShortKh(r?.dob, d.dateStyle),
    dobEn: formatShortEn(r?.dob),
    course: r?.course ?? "",
    courseEn: r?.courseEn || r?.course || "",
    grade: r?.grade ?? "",
    gradeEn: r?.gradeEn || r?.grade || "",
    startDate: formatShortKh(r?.startDate, d.dateStyle),
    endDate: formatShortKh(r?.endDate, d.dateStyle),
    startDateEn: formatShortEn(r?.startDate),
    endDateEn: formatShortEn(r?.endDate),
    duration: r?.duration || dur.km,
    durationEn: dur.en,
    date: r?.date ? formatCertDate(r.date, d.dateStyle) : "",
    dateEn: formatShortEn(r?.date),
    certNo: r?.certNo ?? "",
    code: r?.code ?? "",
    org: org.name,
    orgEn: org.nameEn,
    orgAddress: org.address ?? "",
    orgPhone: org.phone ?? "",
    position: r?.position ?? "",
    positionEn: r?.positionEn || r?.position || "",
    phone: r?.phone ?? "",
    address: r?.address ?? "",
    validUntil: formatShortKh(r?.validUntil, d.dateStyle),
    validUntilEn: formatShortEn(r?.validUntil),
    reason: r?.reason ?? "",
    reasonEn: r?.reasonEn || r?.reason || "",
    occasion: r?.occasion ?? "",
    occasionEn: r?.occasionEn || r?.occasion || "",
    subject: r?.subject ?? "",
    message: r?.message ?? "",
    messageEn: r?.messageEn || r?.message || "",
  };
  // Free-text fields may themselves use {name}, {org}... — fill those (one level).
  const FREE = new Set(["message", "messageEn", "reason", "reasonEn", "subject", "occasion", "occasionEn"]);
  const values: Record<string, string> = { ...base };
  for (const k of FREE) {
    values[k] = (base[k] ?? "").replace(/\{(\w+)\}/g, (all, key: string) => (key in base && key !== "message" && key !== "messageEn" ? base[key] : all));
  }
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    let missing = false;
    const filled = line.replace(/\{(\w+)\}/g, (all, key: string) => {
      if (!(key in values)) return all;
      if (!values[key]) missing = true;
      return values[key];
    });
    // Drop a line with an empty variable — except a line that is only a single variable (it just renders empty).
    if (missing && line.trim() !== "" && !/^\s*\{\w+\}\s*$/.test(line) && /\{\w+\}/.test(line)) continue;
    out.push(filled);
  }
  return out.join("\n");
}

/** Rough check used for the estimated JSON size of a saved design. */
export function designByteSize(d: CertDesign): number {
  return JSON.stringify(d).length;
}

/** Parses a saved design defensively (older / partial JSON). */
export function parseDesign(json: string, org: Org): CertDesign | null {
  try {
    const raw = JSON.parse(json) as Partial<CertDesign>;
    if (!raw || raw.v !== 1 || !Array.isArray(raw.elements)) return null;
    const base = createDesign(raw.themeId ?? "classic-gold", raw.orientation ?? "landscape", org);
    return {
      ...base,
      ...raw,
      border: { ...base.border, ...(raw.border ?? {}) },
      watermark: { ...base.watermark, ...(raw.watermark ?? {}) },
      elements: raw.elements as DesignElement[],
    };
  } catch {
    return null;
  }
}
