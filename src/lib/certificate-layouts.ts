/**
 * Default layouts of the certificate studio.
 *
 * Two layouts × three language modes × two orientations:
 *  - "standard": centred certificate (title, name, body, signatures).
 *  - "ministry": official two-column certificate (Khmer column + English column,
 *    emblem / logo header, hand-written date lines), modelled on the common
 *    Cambodian training-centre certificate.
 * Language modes: "km" (Khmer only), "en" (English only), "mix" (Khmer + English).
 *
 * Positions / widths are % of the page, font sizes are pt. Text can use
 * {variables} and [[highlighted]] segments (bold + highlight colour).
 */
import type {
  ColorKey, DesignElement, DocType, FontKey, LangMode, LayoutKind, Org, Orientation, Theme,
} from "@/lib/certificate-design";
import { themeColor } from "@/lib/theme-color";

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

type TextOpts = {
  font: FontKey;
  size: number;
  ck: ColorKey;
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  ls?: number;
  lh?: number;
  hl?: ColorKey;
};

class Builder {
  els: DesignElement[] = [];
  constructor(readonly theme: Theme) {}

  text(role: string, text: string, x: number, y: number, w: number, o: TextOpts) {
    this.els.push({
      id: id("t"), type: "text", role, x: r1(x), y: r1(y), w: r1(w), text,
      fontFamily: o.font, fontSize: o.size, color: themeColor(this.theme, o.ck), ck: o.ck,
      align: o.align ?? "center", lineHeight: o.lh ?? 1.4,
      bold: o.bold, italic: o.italic, letterSpacing: o.ls,
      hlCk: o.hl, hlColor: o.hl ? themeColor(this.theme, o.hl) : undefined,
    });
  }

  line(role: string, x: number, y: number, w: number, ck: ColorKey, thickness = 1.2, opacity = 0.8) {
    this.els.push({ id: id("l"), type: "line", role, x: r1(x), y: r1(y), w: r1(w), color: themeColor(this.theme, ck), ck, thickness, opacity });
  }

  image(role: string, x: number, y: number, w: number, ar: number, label: string, src?: string, extra: Partial<DesignElement> = {}) {
    this.els.push({ id: id("i"), type: "image", role, x: r1(x), y: r1(y), w: r1(w), ar, src, label, shape: "rect", ...extra });
  }

  photo(x: number, y: number, w: number, ar: number, borderWidth: number) {
    this.els.push({
      id: id("p"), type: "photo", role: "photo", x: r1(x), y: r1(y), w: r1(w), ar, shape: "rounded",
      borderColor: this.theme.primary, borderWidth,
    });
  }

  qr(x: number, y: number, w: number) {
    this.els.push({ id: id("q"), type: "qr", role: "qr", x: r1(x), y: r1(y), w: r1(w), ar: 1 });
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Centred layout — certificate, appreciation certificate (award), greeting card
// ---------------------------------------------------------------------------

type CenterKind = "certificate" | "award" | "greeting";

type CenterCopy = {
  kmTitle: string; kmLead: string; kmBody: string; kmSub1: string; kmSub2: string;
  enTitle: string; enSub: string; enLead: string; enBody: string;
  mixSub: string; mixLeadEn: string;
  signs: 1 | 2;
  kmNameFont?: FontKey;
};

const KH_BODY = "បានបញ្ចប់ការសិក្សាវគ្គ «{course}» ដោយទទួលបាននិទ្ទេស {grade}\nរយៈពេលសិក្សា ចាប់ពី {startDate} ដល់ {endDate}";
const EN_BODY = "has successfully completed the course «{courseEn}» with grade {gradeEn}\nPeriod: {startDateEn} – {endDateEn}";

const COPY: Record<CenterKind, CenterCopy> = {
  certificate: {
    kmTitle: "វិញ្ញាបនបត្រ", kmLead: "សូមប្រគល់ជូនចំពោះ", kmBody: KH_BODY, kmSub1: "គ្រូបង្រៀន / អ្នកអនុម័ត", kmSub2: "នាយកមជ្ឈមណ្ឌល",
    enTitle: "CERTIFICATE", enSub: "OF COMPLETION", enLead: "This certificate is proudly presented to", enBody: EN_BODY,
    mixSub: "CERTIFICATE OF COMPLETION", mixLeadEn: "This certificate is proudly presented to", signs: 2,
  },
  award: {
    kmTitle: "ប័ណ្ណសរសើរ", kmLead: "សូមប្រគល់ជូនចំពោះ", kmBody: "ដើម្បីជាការកោតសរសើរ និងអបអរសាទរចំពោះ [[{reason}]]\n{position}",
    kmSub1: "អ្នកអនុម័ត", kmSub2: "នាយក",
    enTitle: "CERTIFICATE", enSub: "OF APPRECIATION", enLead: "is proudly presented to", enBody: "in recognition of {reasonEn}\n{positionEn}",
    mixSub: "CERTIFICATE OF APPRECIATION", mixLeadEn: "is proudly presented to", signs: 2,
  },
  greeting: {
    kmTitle: "សូមជូនពរ", kmLead: "ជូនចំពោះ", kmBody: "{message}", kmSub1: "ដោយក្តីគោរព និងស្រលាញ់", kmSub2: "",
    enTitle: "BEST WISHES", enSub: "{occasionEn}", enLead: "Dear", enBody: "{messageEn}",
    mixSub: "BEST WISHES", mixLeadEn: "Dear", signs: 1,
  },
};

function centered(b: Builder, lang: LangMode, land: boolean, org: Org, kind: CenterKind) {
  const c = COPY[kind];
  // centred block helper: landscape uses the given width, portrait is wider
  const cx = (wL: number) => {
    const w = land ? wL : Math.min(88, wL + 14);
    return { x: (100 - w) / 2, w };
  };
  const km = lang === "km";
  const en = lang === "en";
  const mix = lang === "mix";

  if (org.logo) b.image("logo", land ? 5.5 : 7, land ? 5 : 4, land ? 9 : 14, 1, "Logo", org.logo);

  const T = (role: string, text: string, y: number, wL: number, o: TextOpts) => {
    const cc = cx(wL);
    b.text(role, text, cc.x, y, cc.w, o);
  };
  const greeting = kind === "greeting";

  if (km) {
    T("org", "{org}", 5, 70, { font: "Moul", size: 15, ck: "primary" });
    if (greeting) {
      T("title", c.kmTitle, 14, 80, { font: "Moul", size: 36, ck: "primary", lh: 1.3 });
      T("subtitle", "{occasion}", 29, 80, { font: "Moul", size: 18, ck: "accent", lh: 1.3 });
    } else {
      T("title", c.kmTitle, 15, 80, { font: "Moul", size: 44, ck: "primary", lh: 1.3 });
    }
    T("lead", c.kmLead, greeting ? 41 : 37, 70, { font: "Hanuman", size: 14, ck: "muted" });
    T("name", "{name}", greeting ? 46.5 : 43.5, 80, { font: "Moul", size: greeting ? 26 : 32, ck: "accent", lh: 1.3 });
    b.line("nameLine", land ? 25 : 20, greeting ? (land ? 58 : 56.5) : land ? 56 : 54.5, land ? 50 : 60, "accent", 1.5, 0.7);
    T("body", c.kmBody, greeting ? 61 : 60, 74, { font: "Hanuman", size: 14, ck: "text", lh: 1.7 });
    T("date", "{date}", land ? 74.5 : 74, 32, { font: "Hanuman", size: 12, ck: "text" });
  } else if (en) {
    T("orgEn", "{orgEn}", 5, 70, { font: "Cinzel", size: 15, ck: "primary", bold: true, ls: 1.5 });
    T("titleEn", c.enTitle, 15, 80, { font: "Cinzel", size: 44, ck: "primary", bold: true, ls: 6, lh: 1.2 });
    T("subtitleEn", c.enSub, 29.5, 80, { font: "Cinzel", size: 16, ck: "accent", bold: true, ls: 5 });
    T("leadEn", c.enLead, 38, 70, { font: "Playfair Display", size: 14, ck: "muted", italic: true });
    T("nameEn", "{nameEn}", 43.5, 80, { font: "Great Vibes", size: 40, ck: "accent", lh: 1.25 });
    b.line("nameLine", land ? 25 : 20, land ? 57 : 55, land ? 50 : 60, "accent", 1.5, 0.7);
    T("bodyEn", c.enBody, 61, 74, { font: "Playfair Display", size: 14, ck: "text", lh: 1.7 });
    T("dateEn", "Date: {dateEn}", 75, 32, { font: "Playfair Display", size: 12, ck: "text" });
  } else {
    T("org", "{org}", 5, 70, { font: "Moul", size: 14, ck: "primary" });
    T("orgEn", "{orgEn}", 10.3, 70, { font: "Cinzel", size: 9.5, ck: "muted", ls: 1.5 });
    T("title", c.kmTitle, 14.5, 80, { font: "Moul", size: 34, ck: "primary", lh: 1.3 });
    T("subtitleEn", c.mixSub, 25.3, 80, { font: "Cinzel", size: 13, ck: "accent", bold: true, ls: 4 });
    T("lead", c.kmLead, 32.5, 70, { font: "Hanuman", size: 12, ck: "muted" });
    T("leadEn", c.mixLeadEn, 37, 70, { font: "Playfair Display", size: 9.5, ck: "muted", italic: true });
    T("name", "{name}", 41.3, 80, { font: "Moul", size: 26, ck: "accent", lh: 1.3 });
    T("nameEn", "{nameEn}", 49.2, 80, { font: "Playfair Display", size: 15, ck: "accent", bold: true });
    b.line("nameLine", land ? 25 : 20, land ? 54.5 : 53.5, land ? 50 : 60, "accent", 1.5, 0.7);
    T("body", c.kmBody, 56, 76, { font: "Hanuman", size: 12.5, ck: "text", lh: 1.6 });
    T("bodyEn", c.enBody, 65.8, 76, { font: "Playfair Display", size: 10, ck: "muted", lh: 1.5 });
    T("date", "{date}", 75, 32, { font: "Hanuman", size: 11, ck: "text" });
    T("dateEn", "{dateEn}", 79, 32, { font: "Playfair Display", size: 9, ck: "muted" });
  }

  // Signature blocks (line + role under it)
  const one = c.signs === 1;
  const s1 = one ? (land ? { x: 60, w: 30 } : { x: 56, w: 38 }) : land ? { x: 8, w: 30 } : { x: 8, w: 38 };
  const s2 = land ? { x: 56, w: 28 } : { x: 54, w: 38 };
  const sy = mix ? 86 : 87;
  const blocks = one ? ([["sign1", s1]] as const) : ([["sign1", s1], ["sign2", s2]] as const);
  for (const [k, p] of blocks) b.line(`${k}Line`, p.x + 3, sy - 1.2, p.w - 6, "text", 1, 0.8);
  const sign = (role: string, kh: string, enT: string, p: { x: number; w: number }) => {
    if (km) b.text(role, kh, p.x, sy, p.w, { font: "Hanuman", size: 12, ck: "text", bold: true });
    else if (en) b.text(role, enT, p.x, sy, p.w, { font: "Playfair Display", size: 12, ck: "text", bold: true });
    else {
      b.text(role, kh, p.x, sy, p.w, { font: "Hanuman", size: 11, ck: "text", bold: true });
      b.text(`${role}En`, enT, p.x, sy + 4, p.w, { font: "Playfair Display", size: 9, ck: "muted" });
    }
  };
  if (kind === "greeting") sign("sign1Title", "{org}", "{orgEn}", s1);
  else {
    sign("sign1Title", c.kmSub1, kind === "award" ? "Approver" : "Instructor / Approver", s1);
    sign("sign2Title", c.kmSub2, kind === "award" ? "Director" : "Director", s2);
  }
  if (kind !== "greeting") {
    b.text("certNo", en ? "No.: {certNo}" : "លេខ៖ {certNo}", 6.5, land ? 93.2 : 95, 40, { font: "Montserrat", size: 9, ck: "muted", align: "left" });
    b.qr(land ? 87 : 84, land ? 79 : 89, land ? 8 : 10);
  }
  // Hand-signature and stamp (empty placeholders, visible only in the editor until an image is uploaded)
  b.image("signature", s1.x + 3, sy - 11, land ? 14 : 20, 2.2, "ហត្ថលេខា");
  if (!one) b.image("stamp", s2.x + (land ? 6 : 8), sy - 14, land ? 10 : 14, 1, "ត្រា");
  else b.image("stamp", s1.x + s1.w - (land ? 10 : 12), sy - 12, land ? 10 : 14, 1, "ត្រា");
}

// ---------------------------------------------------------------------------
// Letters — appreciation letter / greeting letter (portrait)
// ---------------------------------------------------------------------------

function letter(b: Builder, lang: LangMode, org: Org, official: boolean, doc: DocType) {
  const greeting = doc === "greeting";
  const km = lang === "km";
  const en = lang === "en";
  const mix = lang === "mix";
  const FK = "Hanuman" as const;
  const FE = "Playfair Display" as const;
  const bodyFont = en ? FE : FK;

  if (official) {
    if (!en) {
      b.text("nation", "ព្រះរាជាណាចក្រកម្ពុជា", 15, 4, 70, { font: "Moul", size: 14, ck: "primary", lh: 1.3 });
      b.text("motto", "ជាតិ សាសនា ព្រះមហាក្សត្រ", 15, 8, 70, { font: "Moul", size: 11, ck: "primary", lh: 1.3 });
    } else {
      b.text("nationEn", "KINGDOM OF CAMBODIA", 15, 4, 70, { font: FE, size: 13, ck: "primary", bold: true });
      b.text("mottoEn", "NATION RELIGION KING", 15, 7.6, 70, { font: FE, size: 11, ck: "primary" });
    }
    b.line("mottoLine", 42, 12.4, 16, "primary", 1.5, 0.8);
  }
  // letterhead
  const headY = official ? 14 : 4;
  b.image("logo", 8, headY, 11, 1, "Logo", org.logo ?? undefined);
  if (!en) b.text("orgName", "{org}", 5, headY + 9, 36, { font: "Moul", size: 10.5, ck: "primary", lh: 1.4 });
  if (!km) b.text("orgNameEn", "{orgEn}", 5, headY + (en ? 9 : 12.6), 36, { font: FE, size: 9, ck: "muted" });
  if (!official) {
    // a rule under the letterhead
    b.line("headLine", 8, headY + 16.5, 84, "primary", 1.5, 0.8);
  }
  b.text("refNo", en ? "No.: {certNo}" : "លេខ៖ {certNo}", 8, official ? headY + 17 : headY + 18.5, 40, { font: bodyFont, size: 11, ck: "text", align: "left" });

  const ty = official ? 36 : 29;
  const title = greeting ? "លិខិតជូនពរ" : "លិខិតសរសើរ";
  const titleEn = greeting ? "GREETING LETTER" : "LETTER OF APPRECIATION";
  if (!en) b.text("title", title, 20, ty, 60, { font: "Moul", size: 22, ck: "accent", lh: 1.3 });
  if (en) b.text("titleEn", titleEn, 10, ty, 80, { font: "Cinzel", size: 20, ck: "accent", bold: true, ls: 3 });
  if (mix) b.text("subtitleEn", titleEn, 20, ty + 5.5, 60, { font: "Cinzel", size: 10.5, ck: "muted", ls: 3 });

  let y = ty + (mix ? 11 : 7);
  if (greeting) {
    b.text("occasion", en ? "{occasionEn}" : "{occasion}", 10, y, 80, { font: en ? FE : "Moul", size: en ? 16 : 15, ck: "primary", lh: 1.35 });
    y += 6.5;
  }
  b.text("to", en ? "To: [[{nameEn}]]" : "ជូនចំពោះ៖ [[{name}]]", 10, y, 80, { font: bodyFont, size: 13, ck: "text", align: "left", hl: "primary" });
  b.text("position", en ? "Position: {positionEn}" : "តួនាទី/អង្គភាព៖ {position}", 10, y + 4, 80, { font: bodyFont, size: 12, ck: "muted", align: "left" });
  b.text("subject", en ? "Subject: {subject}" : "កម្មវត្ថុ៖ {subject}", 10, y + 8, 80, { font: bodyFont, size: 12.5, ck: "text", align: "left", bold: true });
  b.text("body", en ? "{messageEn}" : "{message}", 10, y + 14, 80, { font: bodyFont, size: 13, ck: "text", align: "left", lh: 1.85 });

  // place + date, then signature
  const sy = 77;
  b.text("date", en ? "Phnom Penh, {dateEn}" : "ភ្នំពេញ, {date}", 50, sy, 42, { font: bodyFont, size: 12, ck: "text" });
  b.text("signTitle", en ? "Director" : "នាយក / អ្នកផ្តល់លិខិត", 50, sy + 4.5, 42, { font: bodyFont, size: 12, ck: "text", bold: true });
  b.image("signature", 62, sy + 8.5, 18, 2.2, "ហត្ថលេខា");
  b.image("stamp", 80, sy + 8, 12, 1, "ត្រា");
  b.line("signLine", 56, sy + 17.5, 30, "text", 1, 0.8);
  b.text("signName", en ? "(Name and signature)" : "(ឈ្មោះ និងហត្ថលេខា)", 50, sy + 18.5, 42, { font: bodyFont, size: 10, ck: "muted" });
  if (!greeting) b.qr(10, 80, 9);
  b.text("footer", "{orgAddress}\n" + (en ? "Tel: {orgPhone}" : "ទូរស័ព្ទ៖ {orgPhone}"), 10, 92.5, 42, { font: bodyFont, size: 9, ck: "muted", lh: 1.3, align: "left" });
}

// ---------------------------------------------------------------------------
// Student ID card (CR80, front / back)
// ---------------------------------------------------------------------------

function card(b: Builder, lang: LangMode, land: boolean, org: Org, back: boolean) {
  const km = lang === "km";
  const en = lang === "en";
  const FK = "Noto Sans Khmer" as const;
  const FE = "Montserrat" as const;
  const rowFont = en ? FE : FK;
  const label = (kh: string, enT: string) => (en ? enT : kh);

  if (!back) {
    if (land) {
      b.line("band", 0, 0, 100, "primary", 36, 1);
      b.image("logo", 3, 2, 8.5, 1, "Logo", org.logo ?? undefined);
      b.text("org", en ? "{orgEn}" : "{org}", 13, 3.6, 84, { font: en ? "Cinzel" : "Moul", size: 8, ck: "onPrimary", align: "left", bold: en, lh: 1.25 });
      b.line("stripe", 0, 96.5, 100, "accent", 7, 1);
      b.photo(4, 27, 27, 0.8, 1.5);
      b.text("name", en ? "{nameEn}" : "{name}", 34, 26, 62, { font: rowFont, size: 11, ck: "primary", align: "left", bold: true, lh: 1.25 });
      if (!km && !en) b.text("nameEn", "{nameEn}", 34, 36.5, 62, { font: FE, size: 7.5, ck: "muted", align: "left" });
      b.text("position", en ? "{positionEn}" : "{position}", 34, 44, 62, { font: rowFont, size: 8, ck: "accent", align: "left", bold: true });
      const rows: [string, string][] = [
        [label("អត្តលេខ៖ {code}", "ID: {code}"), "code"],
        [label("ថ្នាក់/ជំនាញ៖ {course}", "Class: {courseEn}"), "course"],
        [label("ថ្ងៃកំណើត៖ {dob}", "DOB: {dobEn}"), "dob"],
        [label("សុពលភាព៖ {validUntil}", "Valid until: {validUntilEn}"), "valid"],
      ];
      rows.forEach(([t, r], i) => b.text(`row-${r}`, t, 34, 53 + i * 8.3, 62, { font: rowFont, size: 7.5, ck: "text", align: "left" }));
    } else {
      b.line("band", 0, 0, 100, "primary", 58, 1);
      b.image("logo", 4, 2.6, 17, 1, "Logo", org.logo ?? undefined);
      b.text("org", en ? "{orgEn}" : "{org}", 24, 3.8, 72, { font: en ? "Cinzel" : "Moul", size: 7.5, ck: "onPrimary", align: "left", bold: en, lh: 1.3 });
      b.line("stripe", 0, 97, 100, "accent", 9, 1);
      b.photo(30, 20, 40, 0.8, 2);
      b.text("name", en ? "{nameEn}" : "{name}", 4, 53, 92, { font: rowFont, size: 10.5, ck: "primary", bold: true, lh: 1.25 });
      if (!km && !en) b.text("nameEn", "{nameEn}", 4, 59.3, 92, { font: FE, size: 7.5, ck: "muted" });
      b.text("position", en ? "{positionEn}" : "{position}", 4, 65, 92, { font: rowFont, size: 8.5, ck: "accent", bold: true });
      const rows: [string, string][] = [
        [label("អត្តលេខ៖ {code}", "ID: {code}"), "code"],
        [label("ថ្នាក់/ជំនាញ៖ {course}", "Class: {courseEn}"), "course"],
        [label("ថ្ងៃកំណើត៖ {dob}", "DOB: {dobEn}"), "dob"],
        [label("សុពលភាព៖ {validUntil}", "Valid until: {validUntilEn}"), "valid"],
      ];
      rows.forEach(([t, r], i) => b.text(`row-${r}`, t, 10, 71 + i * 4.6, 84, { font: rowFont, size: 7, ck: "text", align: "left" }));
    }
    return;
  }

  // ---- back ----
  const termsKh = "កាតនេះជាកម្មសិទ្ធិរបស់ {org}។ សូមយកមកជាមួយនៅពេលមករៀន។ ប្រសិនបើរកឃើញ សូមប្រគល់មកអង្គភាពតាមអាសយដ្ឋានខាងក្រោម។";
  const termsEn = "This card is the property of {orgEn}. Please carry it when attending. If found, please return it to the address below.";
  if (land) {
    b.line("band", 0, 0, 100, "primary", 24, 1);
    b.text("org", en ? "{orgEn}" : "{org}", 3, 1.8, 94, { font: en ? "Cinzel" : "Moul", size: 8, ck: "onPrimary", bold: en });
    b.text("terms", en ? termsEn : termsKh, 4, 17, 56, { font: rowFont, size: 6.5, ck: "text", align: "left", lh: 1.5 });
    b.text("contact", "{orgAddress}\n" + label("ទូរស័ព្ទ៖ {orgPhone}", "Tel: {orgPhone}"), 4, 44, 56, { font: rowFont, size: 6.5, ck: "muted", align: "left", lh: 1.5 });
    b.text("holder", (km || !en ? "ទូរស័ព្ទអ្នកកាន់៖ {phone}\n" : "Holder tel: {phone}\n") + (en ? "Address: {address}" : "អាសយដ្ឋាន៖ {address}"), 4, 60, 56, { font: rowFont, size: 6.5, ck: "text", align: "left", lh: 1.5 });
    b.qr(66, 20, 28);
    b.text("certNo", "{certNo}", 62, 66, 36, { font: FE, size: 6.5, ck: "muted" });
    b.image("signature", 6, 74, 18, 2.2, "ហត្ថលេខា");
    b.line("signLine", 4, 90, 30, "text", 0.8, 0.8);
    b.text("signTitle", en ? "Director" : "អ្នកគ្រប់គ្រង", 4, 91.5, 30, { font: rowFont, size: 6, ck: "muted" });
    b.image("stamp", 42, 72, 12, 1, "ត្រា");
    b.line("stripe", 0, 96.5, 100, "accent", 7, 1);
  } else {
    b.line("band", 0, 0, 100, "primary", 36, 1);
    b.text("org", en ? "{orgEn}" : "{org}", 4, 3.6, 92, { font: en ? "Cinzel" : "Moul", size: 7.5, ck: "onPrimary", bold: en, lh: 1.3 });
    b.text("terms", en ? termsEn : termsKh, 8, 14, 84, { font: rowFont, size: 6.5, ck: "text", lh: 1.55 });
    b.text("contact", "{orgAddress}\n" + label("ទូរស័ព្ទ៖ {orgPhone}", "Tel: {orgPhone}"), 8, 33, 84, { font: rowFont, size: 6.5, ck: "muted", lh: 1.5 });
    b.text("holder", (!en ? "ទូរស័ព្ទអ្នកកាន់៖ {phone}\n" : "Holder tel: {phone}\n") + (en ? "Address: {address}" : "អាសយដ្ឋាន៖ {address}"), 8, 43, 84, { font: rowFont, size: 6.5, ck: "text", lh: 1.5 });
    b.qr(33, 54, 34);
    b.text("certNo", "{certNo}", 8, 76, 84, { font: FE, size: 6.5, ck: "muted" });
    b.image("signature", 55, 80, 26, 2.2, "ហត្ថលេខា");
    b.line("signLine", 50, 91, 42, "text", 0.8, 0.8);
    b.text("signTitle", en ? "Director" : "អ្នកគ្រប់គ្រង", 50, 92, 42, { font: rowFont, size: 6, ck: "muted" });
    b.image("stamp", 10, 80, 16, 1, "ត្រា");
    b.line("stripe", 0, 97, 100, "accent", 9, 1);
  }
}

// ---------------------------------------------------------------------------
// Ministry (official two-column) layout
// ---------------------------------------------------------------------------

function ministry(b: Builder, lang: LangMode, land: boolean, org: Org) {
  const km = lang === "km";
  const en = lang === "en";
  const mix = lang === "mix";
  const FK = "Noto Sans Khmer" as const;
  const FE = "Kantumruy Pro" as const;

  // ---- header ------------------------------------------------------------
  const mixY = land ? { a: 7.5, b: 13, c: 17, d: 21.8 } : { a: 3.2, b: 6.4, c: 9, d: 11.9 };
  const oneY = land ? { a: 8.5, b: 16 } : { a: 3.6, b: 8.2 };
  const hx = land ? { x: 28, w: 44 } : { x: 22, w: 56 };
  const nationSize = land ? 19 : 17;
  const mottoSize = land ? 14 : 13;
  const enSize = land ? 13 : 12;
  if (mix) {
    b.text("nation", "ព្រះរាជាណាចក្រកម្ពុជា", hx.x, mixY.a, hx.w, { font: "Moul", size: nationSize, ck: "primary", lh: 1.3 });
    b.text("nationEn", "KINGDOM OF CAMBODIA", hx.x, mixY.b, hx.w, { font: "Playfair Display", size: enSize, ck: "primary" });
    b.text("motto", "ជាតិ សាសនា ព្រះមហាក្សត្រ", hx.x, mixY.c, hx.w, { font: "Moul", size: mottoSize, ck: "primary", lh: 1.3 });
    b.text("mottoEn", "NATION RELIGION KING", hx.x, mixY.d, hx.w, { font: "Playfair Display", size: enSize, ck: "primary" });
  } else if (km) {
    b.text("nation", "ព្រះរាជាណាចក្រកម្ពុជា", hx.x, oneY.a, hx.w, { font: "Moul", size: nationSize, ck: "primary", lh: 1.3 });
    b.text("motto", "ជាតិ សាសនា ព្រះមហាក្សត្រ", hx.x, oneY.b, hx.w, { font: "Moul", size: mottoSize, ck: "primary", lh: 1.3 });
  } else {
    b.text("nationEn", "KINGDOM OF CAMBODIA", hx.x, oneY.a, hx.w, { font: "Playfair Display", size: enSize + 2, ck: "primary" });
    b.text("mottoEn", "NATION RELIGION KING", hx.x, oneY.b, hx.w, { font: "Playfair Display", size: enSize + 2, ck: "primary" });
  }

  // emblem (left) + logo (right) — upload your own images
  b.image("emblem", land ? 18 : 7, land ? 13.5 : 3.6, land ? 7.6 : 11, 0.92, "និមិត្តសញ្ញា");
  b.image("logo", land ? 74.5 : 82, land ? 13.5 : 3.6, land ? 9.8 : 11, 1, "Logo", org.logo ?? undefined);

  // organisations under the images
  const orgY = land ? 29 : 17;
  if (land) {
    if (!en) b.text("authority", "ក្រសួងអប់រំ យុវជន និង កីឡា\nមន្ទីរអប់រំ យុវជន និង កីឡារាជធានីភ្នំពេញ", 6.5, orgY, 31, { font: "Moul", size: 11.5, ck: "primary", lh: 1.55 });
    if (en) b.text("authorityEn", "Ministry of Education, Youth and Sport\nPhnom Penh Municipal Department of Education, Youth and Sport", 6.5, orgY, 31, { font: "Playfair Display", size: 11.5, ck: "primary", lh: 1.4 });
    if (!en) b.text("orgName", "{org}", 66.5, orgY, 26, { font: "Moul", size: 12, ck: "primary", lh: 1.4 });
    if (!km) b.text("orgNameEn", "{orgEn}", 66.5, en ? orgY : 35, 26, { font: "Playfair Display", size: 11.5, ck: "primary" });
  } else {
    if (!en) b.text("authority", "ក្រសួងអប់រំ យុវជន និង កីឡា\nមន្ទីរអប់រំ យុវជន និង កីឡារាជធានីភ្នំពេញ", 2.5, orgY, 47, { font: "Moul", size: 8.5, ck: "primary", lh: 1.55 });
    if (en) b.text("authorityEn", "Ministry of Education, Youth and Sport\nPhnom Penh Municipal Department of Education, Youth and Sport", 2.5, orgY, 47, { font: "Playfair Display", size: 9, ck: "primary", lh: 1.4 });
    if (!en) b.text("orgName", "{org}", 52, orgY, 46, { font: "Moul", size: 9, ck: "primary", lh: 1.4 });
    if (!km) b.text("orgNameEn", "{orgEn}", 52, en ? orgY : 20.2, 46, { font: "Playfair Display", size: 10, ck: "primary" });
  }

  // title (red)
  const tx = land ? { x: 36, w: 30 } : { x: 20, w: 60 };
  const ty = land ? 27.5 : 24.5;
  if (!en) b.text("title", "វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា", tx.x, ty, tx.w, { font: "Moul", size: land ? 16 : 15, ck: "accent", lh: 1.3 });
  if (!km) b.text("titleEn", "CERTIFICATE", tx.x, en ? ty : ty + (land ? 5.5 : 3.6), tx.w, { font: "Playfair Display", size: land ? 24 : 21, ck: "accent", ls: 7 });

  // ---- body rows ----------------------------------------------------------
  const kx = land ? 1 : 1.41; // horizontal scale of the label/value offsets
  const khRows = (x0: number, y0: number, pitch: number, wFull: number) => {
    const y = (i: number) => y0 + i * pitch;
    const lab = (role: string, t: string, ox: number, i: number, w = 14) => b.text(role, t, x0 + ox * kx, y(i), w * kx, { font: FK, size: 12, ck: "muted", align: "left" });
    const val = (role: string, t: string, ox: number, i: number, w = 22) => b.text(role, t, x0 + ox * kx, y(i), w * kx, { font: FK, size: 12, ck: "primary", align: "left", bold: true });
    lab("kLeadL", "សូមបញ្ជាក់ថា:", 0, 0);
    val("kName", "{name}", 11.9, 0, 22);
    lab("kGenderL", "ភេទ:", 25.9, 0, 6);
    val("kGender", "{gender}", 31.3, 0, 8);
    lab("kNatL", "សញ្ជាតិ:", 0, 1, 8);
    val("kNat", "{nationality}", 7.3, 1, 7);
    lab("kDobL", "ថ្ងៃខែឆ្នាំកំណើត", 13, 1, 10);
    val("kDob", "{dob}", 22.2, 1, 16);
    b.text("kDid", "បានចូលរៀន និងបញ្ចប់ដោយជោគជ័យវគ្គបណ្តុះបណ្តាល ផ្នែកកុំព្យូទ័រ", x0, y(2), wFull, { font: FK, size: 12, ck: "muted", align: "left" });
    lab("kSkillL", "ជំនាញ:", 0, 3, 8);
    val("kSkill", "{course}", 6.4, 3, 30);
    lab("kGradeL", "និទ្ទេស:", 0, 4, 8);
    val("kGrade", "{grade}", 6.4, 4, 30);
    b.text("kPeriod", "ចាប់ផ្តើមពីថ្ងៃទី [[{startDate}]]  ដល់ ថ្ងៃទី [[{endDate}]]", x0, y(5), wFull, { font: FK, size: 12, ck: "muted", align: "left", hl: "primary" });
    b.text("kPlace", "នៅ [[{org}]]", x0, y(6), wFull, { font: FK, size: 12, ck: "muted", align: "left", hl: "primary" });
    b.text("kClosing", "វិញ្ញាបនបត្រនេះប្រគល់ជូនសាមីជនដើម្បីប្រើប្រាស់តាមការដែលអាចប្រើបាន។", x0, y(7), wFull, { font: FK, size: 12, ck: "muted", align: "left" });
  };
  const enRows = (x0: number, y0: number, pitch: number, wFull: number) => {
    const y = (i: number) => y0 + i * pitch;
    const lab = (role: string, t: string, ox: number, i: number, w = 16) => b.text(role, t, x0 + ox * kx, y(i), w * kx, { font: FE, size: 11.5, ck: "muted", align: "left" });
    const val = (role: string, t: string, ox: number, i: number, w = 22) => b.text(role, t, x0 + ox * kx, y(i), w * kx, { font: FE, size: 11.5, ck: "primary", align: "left", bold: true });
    lab("eLeadL", "This is to certify that :", 0, 0, 16);
    val("eName", "{nameEn}", 15.6, 0, 20);
    lab("eGenderL", "Sex :", 28.6, 0, 6);
    val("eGender", "{genderEn}", 32.6, 0, 10);
    lab("eNatL", "Nationality :", 0, 1, 10);
    val("eNat", "{nationalityEn}", 9.4, 1, 8);
    lab("eDobL", "Date of birth :", 15.2, 1, 10);
    val("eDob", "{dobEn}", 25, 1, 16);
    b.text("eDid", "Has successfully completed in the computer skill training", x0, y(2), wFull, { font: FE, size: 11.5, ck: "muted", align: "left" });
    lab("eCourseL", "Course of :", 0, 3, 10);
    val("eCourse", "{courseEn}", 9.1, 3, 30);
    lab("eGradeL", "Grade :", 0, 4, 8);
    val("eGrade", "{gradeEn}", 9.1, 4, 30);
    b.text("ePeriod", "Held from : [[{startDateEn}]]   to   [[{endDateEn}]]", x0, y(5), wFull, { font: FE, size: 12, ck: "muted", align: "left", hl: "primary" });
    b.text("ePlace", "At the [[{orgEn}]]", x0, y(6), wFull, { font: FE, size: 12, ck: "muted", align: "left", hl: "primary" });
    b.text("eClosing", "This certificate is issued for official use.", x0, y(7), wFull, { font: FE, size: 11.5, ck: "muted", align: "left" });
  };

  // ---- footer pieces -------------------------------------------------------
  const khFooter = (x0: number, y0: number, pitch: number, w: number) => {
    b.text("kDate1", "ថ្ងៃទី......................ខែ.............ឆ្នាំ........សប្តស័ក ព.ស. ២៥៦៨", x0 + 1.5, y0, w, { font: FK, size: 11, ck: "muted", align: "left" });
    b.text("kDate2", "រាជធានីភ្នំពេញ, ថ្ងៃទី...............ខែ...................ឆ្នាំ.................", x0 + 2.5, y0 + pitch, w, { font: FK, size: 11, ck: "muted", align: "left" });
    b.text("kDirector", "ប្រធានមន្ទីរអប់រំ យុវជន និង កីឡារាជធានីភ្នំពេញ", x0 + 1.5, y0 + pitch * 2, w, { font: "Moul", size: 11, ck: "primary", align: "left", lh: 1.4 });
  };
  const enFooter = (x0: number, y0: number, pitch: number, w: number) => {
    b.text("ePhnom", "Phnom Penh,   [[{dateEn}]]", x0, y0, w, { font: FE, size: 11, ck: "muted", align: "left", hl: "primary" });
    b.text("eDirector", "The Director {orgEn}", x0, y0 + pitch, w, { font: FE, size: 11, ck: "muted", align: "left" });
  };

  if (land) {
    const y0 = 39.5, pitch = 3.7;
    if (mix) {
      khRows(7.2, y0, pitch, 40.3);
      enRows(54.3, y0, pitch, 40.5);
      khFooter(7.2, 70.6, 3.5, 38);
      b.text("kNo", "លេខ ៥៩ ស.បជសីស៊ី", 45.6, 70.6, 14, { font: FK, size: 11, ck: "primary", align: "left", bold: true });
      enFooter(60.8, 70.2, 4, 34);
    } else if (km) {
      khRows(14, 40, 4.2, 72);
      khFooter(14, 73.5, 3.6, 40);
      b.text("kNo", "លេខ ៥៩ ស.បជសីស៊ី", 58, 73.5, 14, { font: FK, size: 11, ck: "primary", align: "left", bold: true });
    } else {
      enRows(14, 40, 4.2, 72);
      enFooter(56, 74, 4, 38);
    }
  } else {
    if (mix) {
      khRows(10, 33.5, 2.75, 80);
      enRows(10, 57, 2.65, 80);
      khFooter(10, 80, 2.7, 44);
      b.text("kNo", "លេខ ៥៩ ស.បជសីស៊ី", 10, 89.5, 30, { font: FK, size: 11, ck: "primary", align: "left", bold: true });
      enFooter(54, 80, 2.9, 40);
    } else if (km) {
      khRows(10, 33, 3.6, 80);
      khFooter(10, 74, 3, 55);
      b.text("kNo", "លេខ ៥៩ ស.បជសីស៊ី", 62, 74, 28, { font: FK, size: 11, ck: "primary", align: "left", bold: true });
    } else {
      enRows(10, 33, 3.6, 80);
      enFooter(50, 74, 3.4, 44);
    }
  }

  // stamp + signature placeholders (below the director's title), and the verification QR
  if (land) {
    const sig = mix ? { x: 63, y: 79 } : en ? { x: 58, y: 80 } : { x: 17, y: 85 };
    const stp = mix ? { x: 79, y: 76 } : en ? { x: 74, y: 78 } : { x: 34, y: 82 };
    b.image("signature", sig.x, sig.y, 13, 2.2, "ហត្ថលេខា");
    b.image("stamp", stp.x, stp.y, 9, 1, "ត្រា");
    b.qr(88.5, 84, 6.5);
  } else {
    const sig = mix ? { x: 54, y: 86 } : en ? { x: 54, y: 82 } : { x: 14, y: 82 };
    const stp = mix ? { x: 74, y: 84.5 } : en ? { x: 72, y: 79 } : { x: 36, y: 79 };
    b.image("signature", sig.x, sig.y, 17, 2.2, "ហត្ថលេខា");
    b.image("stamp", stp.x, stp.y, 12, 1, "ត្រា");
    b.qr(87, 91.5, 8);
  }
  b.text("certNo", en ? "Certificate No.: {certNo}" : "លេខសញ្ញាបត្រ៖ {certNo}", land ? 6 : 6, land ? 95 : 96.5, 40, { font: "Montserrat", size: 8.5, ck: "muted", align: "left" });
}

// ---------------------------------------------------------------------------

export function buildElements(theme: Theme, orientation: Orientation, org: Org, lang: LangMode, layout: LayoutKind, doc: DocType = "certificate"): DesignElement[] {
  const b = new Builder(theme);
  const land = orientation === "landscape";
  switch (layout) {
    case "ministry": ministry(b, lang, land, org); break;
    case "award": centered(b, lang, land, org, "award"); break;
    case "greeting-card": centered(b, lang, land, org, "greeting"); break;
    case "letter-official": letter(b, lang, org, true, doc === "greeting" ? "greeting" : "appreciation_letter"); break;
    case "letter-simple": letter(b, lang, org, false, doc === "greeting" ? "greeting" : "appreciation_letter"); break;
    case "card-front": card(b, lang, land, org, false); break;
    case "card-back": card(b, lang, land, org, true); break;
    default: centered(b, lang, land, org, "certificate");
  }
  return b.els;
}
