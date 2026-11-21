/**
 * The kinds of document the studio can make. Each has its own default layouts,
 * paper, recipient fields, Excel template and sample — everything the designer
 * (theme, paper, background, border, watermark, elements, saved templates) then
 * works the same for all of them.
 */
import type { DocType, LangMode, LayoutKind, Orientation, PaperKey, Recipient } from "@/lib/certificate-design";

export type FieldKey =
  | "nameEn" | "code" | "gender" | "dob" | "nationality" | "nationalityEn"
  | "course" | "courseEn" | "grade" | "gradeEn" | "startDate" | "endDate" | "date" | "duration" | "certNo"
  | "position" | "positionEn" | "phone" | "address" | "validUntil"
  | "reason" | "reasonEn" | "occasion" | "occasionEn" | "subject" | "message" | "messageEn";

export type FieldDef = { label: string; kind: "text" | "date" | "gender" | "area"; placeholder?: string; wide?: boolean };

export const FIELDS: Record<FieldKey, FieldDef> = {
  nameEn: { label: "ឈ្មោះអង់គ្លេស", kind: "text" },
  code: { label: "កូដ / អត្តលេខ", kind: "text" },
  gender: { label: "ភេទ", kind: "gender" },
  dob: { label: "ថ្ងៃខែឆ្នាំកំណើត", kind: "date" },
  nationality: { label: "សញ្ជាតិ", kind: "text" },
  nationalityEn: { label: "Nationality", kind: "text" },
  course: { label: "វគ្គសិក្សា", kind: "text", wide: true },
  courseEn: { label: "វគ្គសិក្សា (អង់គ្លេស)", kind: "text", wide: true },
  grade: { label: "ពិន្ទុ / និទ្ទេស", kind: "text" },
  gradeEn: { label: "និទ្ទេស (អង់គ្លេស)", kind: "text" },
  startDate: { label: "ចាប់ផ្តើមសិក្សា", kind: "date" },
  endDate: { label: "បញ្ចប់សិក្សា", kind: "date" },
  date: { label: "កាលបរិច្ឆេទចេញ", kind: "date" },
  duration: { label: "រយៈពេល", kind: "text", placeholder: "ឧ. 3 ខែ" },
  certNo: { label: "លេខឯកសារ", kind: "text" },
  position: { label: "តួនាទី / ស្ថានភាព", kind: "text" },
  positionEn: { label: "តួនាទី (អង់គ្លេស)", kind: "text" },
  phone: { label: "ទូរស័ព្ទ", kind: "text" },
  address: { label: "អាសយដ្ឋាន", kind: "text", wide: true },
  validUntil: { label: "សុពលភាពដល់", kind: "date" },
  reason: { label: "ហេតុផលសរសើរ", kind: "area", wide: true },
  reasonEn: { label: "ហេតុផល (អង់គ្លេស)", kind: "area", wide: true },
  occasion: { label: "ឱកាសជូនពរ", kind: "text", wide: true },
  occasionEn: { label: "ឱកាស (អង់គ្លេស)", kind: "text", wide: true },
  subject: { label: "កម្មវត្ថុ", kind: "text", wide: true },
  message: { label: "ខ្លឹមសារលិខិត", kind: "area", wide: true },
  messageEn: { label: "ខ្លឹមសារ (អង់គ្លេស)", kind: "area", wide: true },
};

export type LayoutChoice = { key: LayoutKind; label: string; hint: string };

export type DocConfig = {
  key: DocType;
  label: string;
  labelEn: string;
  desc: string;
  slug: string;
  prefix: string;
  /** Layout choices shown in the designer. */
  layouts: LayoutChoice[];
  orientations: Orientation[];
  start: { theme: string; orientation: Orientation; layout: LayoutKind; lang: LangMode; paper: PaperKey };
  /** Fields in the "defaults for new recipients" box. */
  defaultFields: FieldKey[];
  /** Fields in each recipient's expanded editor. */
  rowFields: FieldKey[];
  /** Columns of the "name | a | b" quick-add box. */
  pasteCols: FieldKey[];
  /** Whether recipients carry a photo (and the card shows it). */
  photo: boolean;
  /** Whether "register + QR" is offered. */
  register: boolean;
  /** Printable on A4 sheets, several per page. */
  sheet: boolean;
  noLabel: string;
  fileBase: string;
  defaults: Partial<Recipient>;
  sample: Partial<Recipient>;
  datalist?: { field: FieldKey; options: string[] };
};

export const DOC_TYPES: Record<DocType, DocConfig> = {
  certificate: {
    key: "certificate", slug: "certificate", prefix: "CERT",
    label: "សញ្ញាបត្រ / វិញ្ញាបនបត្រ", labelEn: "Certificate",
    desc: "វិញ្ញាបនបត្របញ្ចប់ការសិក្សា — ម៉ូតទូទៅ ឬពីរជួរ (ខ្មែរ | អង់គ្លេស) បែបក្រសួង",
    layouts: [
      { key: "standard", label: "ទូទៅ (កណ្តាល)", hint: "ចំណងជើង ឈ្មោះ អត្ថបទ ហត្ថលេខា" },
      { key: "ministry", label: "ពីរជួរ (ខ្មែរ | អង់គ្លេស)", hint: "ក្បាលក្រសួង + ព័ត៌មានលម្អិតសិស្ស" },
    ],
    orientations: ["landscape", "portrait"],
    start: { theme: "classic-gold", orientation: "landscape", layout: "standard", lang: "mix", paper: "A4" },
    defaultFields: ["course", "grade", "date", "courseEn", "gradeEn", "nationality", "nationalityEn"],
    rowFields: ["course", "grade", "date", "nameEn", "duration", "gender", "dob", "nationality", "nationalityEn", "courseEn", "gradeEn", "startDate", "endDate", "certNo", "code"],
    pasteCols: ["course", "grade"],
    photo: true, register: true, sheet: false,
    noLabel: "លេខសញ្ញាបត្រ", fileBase: "certificates",
    defaults: { nationality: "ខ្មែរ", nationalityEn: "Khmer" },
    sample: {
      name: "ឈ្មោះអ្នកទទួល", nameEn: "RECIPIENT NAME", gender: "F", dob: "1995-02-02", nationality: "ខ្មែរ", nationalityEn: "Khmer",
      course: "ឈ្មោះវគ្គសិក្សា", courseEn: "Course Name", grade: "ល្អប្រសើរ", gradeEn: "A", startDate: "2026-07-01", endDate: "2026-09-30",
      certNo: "CERT-2026-0001", code: "STD-0001",
    },
  },
  award: {
    key: "award", slug: "award", prefix: "AWD",
    label: "ប័ណ្ណសរសើរ", labelEn: "Certificate of Appreciation",
    desc: "ប័ណ្ណសរសើរ / ប័ណ្ណអបអរសាទរ សម្រាប់សិស្ស គ្រូ ឬបុគ្គលមានស្នាដៃ",
    layouts: [{ key: "award", label: "ប័ណ្ណសរសើរ (កណ្តាល)", hint: "ចំណងជើង ឈ្មោះ ហេតុផល ហត្ថលេខា" }],
    orientations: ["landscape", "portrait"],
    start: { theme: "royal-blue", orientation: "landscape", layout: "award", lang: "mix", paper: "A4" },
    defaultFields: ["reason", "reasonEn", "position", "date"],
    rowFields: ["reason", "reasonEn", "position", "positionEn", "date", "nameEn", "course", "courseEn", "certNo"],
    pasteCols: ["reason", "position"],
    photo: false, register: true, sheet: false,
    noLabel: "លេខប័ណ្ណ", fileBase: "awards",
    defaults: { reason: "ការខិតខំប្រឹងប្រែង និងសមិទ្ធផលលេចធ្លោ", reasonEn: "outstanding effort and achievement" },
    sample: {
      name: "ឈ្មោះអ្នកទទួល", nameEn: "RECIPIENT NAME", reason: "ការខិតខំប្រឹងប្រែង និងសមិទ្ធផលលេចធ្លោ",
      reasonEn: "outstanding effort and achievement", certNo: "AWD-2026-0001",
    },
  },
  appreciation_letter: {
    key: "appreciation_letter", slug: "appreciation-letter", prefix: "LTR",
    label: "លិខិតសរសើរ", labelEn: "Letter of Appreciation",
    desc: "លិខិតផ្លូវការ សម្តែងការកោតសរសើរ និងអំណរគុណចំពោះបុគ្គល ឬអង្គភាព",
    layouts: [
      { key: "letter-official", label: "ផ្លូវការ (មានក្បាលព្រះរាជាណាចក្រ)", hint: "ជាតិ សាសនា ព្រះមហាក្សត្រ + លេខលិខិត" },
      { key: "letter-simple", label: "សាមញ្ញ (ក្បាលអង្គភាព)", hint: "ឡូហ្គោ + ឈ្មោះអង្គភាព" },
    ],
    orientations: ["portrait"],
    start: { theme: "minimal", orientation: "portrait", layout: "letter-official", lang: "km", paper: "A4" },
    defaultFields: ["subject", "message", "position", "date"],
    rowFields: ["position", "subject", "message", "reason", "date", "nameEn", "positionEn", "messageEn", "certNo"],
    pasteCols: ["position", "subject"],
    photo: false, register: true, sheet: false,
    noLabel: "លេខលិខិត", fileBase: "appreciation-letters",
    defaults: {
      subject: "ការសម្តែងអំណរគុណ និងការកោតសរសើរ",
      message:
        "អង្គភាព {org} សូមសម្តែងនូវអំណរគុណ និងការកោតសរសើរយ៉ាងជ្រាលជ្រៅចំពោះ {name} ចំពោះការខិតខំប្រឹងប្រែង ការលះបង់ និងវិភាគទានដ៏មានតម្លៃ ដែលបានរួមចំណែកដល់ភាពជោគជ័យរបស់អង្គភាពយើង។\nសូមជូនពរឱ្យ {name} ទទួលបាននូវសុខភាពល្អ សុភមង្គល និងជោគជ័យគ្រប់ភារកិច្ច។",
      messageEn:
        "{orgEn} would like to express its sincere gratitude and appreciation to {nameEn} for the dedication, effort and valuable contribution to our success.",
    },
    sample: {
      name: "ឈ្មោះអ្នកទទួល", nameEn: "RECIPIENT NAME", position: "គ្រូបង្រៀន", positionEn: "Teacher",
      subject: "ការសម្តែងអំណរគុណ និងការកោតសរសើរ", certNo: "LTR-2026-0001",
    },
  },
  greeting: {
    key: "greeting", slug: "greeting", prefix: "GRT",
    label: "លិខិតជូនពរ", labelEn: "Greeting Letter",
    desc: "កាត ឬលិខិតជូនពរ ក្នុងឱកាសបុណ្យចូលឆ្នាំ ខួបកំណើត មង្គលការ និងបុណ្យផ្សេងៗ",
    layouts: [
      { key: "greeting-card", label: "កាតជូនពរ (តុបតែង)", hint: "ឱកាស + ពាក្យជូនពរ ក្នុងស៊ុមលម្អ" },
      { key: "letter-simple", label: "លិខិតជូនពរ (ក្បាលអង្គភាព)", hint: "ទម្រង់លិខិតផ្លូវការ" },
      { key: "letter-official", label: "លិខិតជូនពរ (ផ្លូវការ)", hint: "មានក្បាលព្រះរាជាណាចក្រ" },
    ],
    orientations: ["landscape", "portrait"],
    start: { theme: "festive-red", orientation: "landscape", layout: "greeting-card", lang: "km", paper: "A4" },
    defaultFields: ["occasion", "message", "date", "occasionEn", "messageEn"],
    rowFields: ["occasion", "message", "date", "position", "nameEn", "occasionEn", "messageEn", "certNo"],
    pasteCols: ["occasion", "message"],
    photo: true, register: false, sheet: false,
    noLabel: "លេខលិខិត", fileBase: "greetings",
    datalist: {
      field: "occasion",
      options: ["ពិធីបុណ្យចូលឆ្នាំខ្មែរ", "ពិធីបុណ្យភ្ជុំបិណ្ឌ", "ពិធីបុណ្យអុំទូក", "ពិធីបុណ្យចូលឆ្នាំសកល", "ខួបកំណើត", "មង្គលការ", "ថ្ងៃគ្រូ", "ថ្ងៃបញ្ចប់ការសិក្សា"],
    },
    defaults: {
      occasion: "ពិធីបុណ្យចូលឆ្នាំខ្មែរ",
      occasionEn: "Khmer New Year",
      message: "សូមឱ្យ {name} និងក្រុមគ្រួសារ ទទួលបាននូវសុខភាពល្អ សុភមង្គល សំណាងល្អ និងជោគជ័យគ្រប់ភារកិច្ច ក្នុង{occasion}នេះ។",
      messageEn: "Wishing {nameEn} and family good health, happiness, good fortune and success in every endeavour.",
    },
    sample: {
      name: "ឈ្មោះអ្នកទទួល", nameEn: "RECIPIENT NAME", occasion: "ពិធីបុណ្យចូលឆ្នាំខ្មែរ", occasionEn: "Khmer New Year",
      message: "សូមឱ្យ {name} និងក្រុមគ្រួសារ ទទួលបាននូវសុខភាពល្អ សុភមង្គល សំណាងល្អ និងជោគជ័យគ្រប់ភារកិច្ច ក្នុង{occasion}នេះ។",
      messageEn: "Wishing {nameEn} and family good health, happiness, good fortune and success in every endeavour.",
    },
  },
  student_card: {
    key: "student_card", slug: "student-card", prefix: "CARD",
    label: "កាតសិស្ស", labelEn: "Student ID Card",
    desc: "កាតសម្គាល់សិស្ស (CR80) — មុខ និងក្រោយ មានរូបថត QR ព្រីនច្រើនកាតក្នុងសន្លឹក A4",
    layouts: [
      { key: "card-front", label: "មុខកាត", hint: "រូបថត ឈ្មោះ អត្តលេខ ថ្នាក់" },
      { key: "card-back", label: "ខាងក្រោយកាត", hint: "លក្ខខណ្ឌ ទំនាក់ទំនង QR" },
    ],
    orientations: ["portrait", "landscape"],
    start: { theme: "royal-blue", orientation: "portrait", layout: "card-front", lang: "mix", paper: "CR80" },
    defaultFields: ["position", "course", "validUntil", "date"],
    rowFields: ["code", "position", "course", "validUntil", "nameEn", "gender", "dob", "phone", "address", "startDate", "date", "certNo"],
    pasteCols: ["code", "course"],
    photo: true, register: true, sheet: true,
    noLabel: "លេខកាត", fileBase: "student-cards",
    defaults: { position: "សិស្ស", positionEn: "Student" },
    sample: {
      name: "ឈ្មោះសិស្ស", nameEn: "STUDENT NAME", code: "STD-0001", gender: "F", dob: "2008-03-14", position: "សិស្ស", positionEn: "Student",
      course: "កុំព្យូទ័រ", courseEn: "Computer", validUntil: "2027-06-30", phone: "012 345 678", address: "ភ្នំពេញ", certNo: "CARD-2026-0001",
    },
  },
};

export const DOC_ORDER: DocType[] = ["certificate", "award", "appreciation_letter", "greeting", "student_card"];

export function docBySlug(slug: string): DocConfig | null {
  return Object.values(DOC_TYPES).find((d) => d.slug === slug) ?? null;
}

/** Row labels that differ by document type. */
export function fieldLabel(doc: DocType, key: FieldKey): string {
  if (doc === "student_card") {
    if (key === "course") return "ថ្នាក់ / ជំនាញ";
    if (key === "courseEn") return "ថ្នាក់ (អង់គ្លេស)";
    if (key === "certNo") return "លេខកាត";
    if (key === "date") return "កាលបរិច្ឆេទចេញកាត";
  }
  if (doc === "appreciation_letter" || doc === "greeting") {
    if (key === "certNo") return "លេខលិខិត";
    if (key === "date") return "កាលបរិច្ឆេទលិខិត";
    if (key === "position") return "តួនាទី / អង្គភាព";
  }
  if (doc === "award" && key === "certNo") return "លេខប័ណ្ណ";
  if (doc === "award" && key === "course") return "វគ្គសិក្សា (បើមាន)";
  if (key === "certNo") return "លេខសញ្ញាបត្រ";
  return FIELDS[key].label;
}
