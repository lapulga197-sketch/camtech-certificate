import ExcelJS from "exceljs";
import { toPhnomPenhDateInput, todayInPhnomPenh } from "@/lib/timezone";
import type { DocType, Recipient } from "@/lib/certificate-design";
import { DOC_TYPES, FIELDS, fieldLabel, type FieldKey } from "@/lib/doc-types";

const NAME_ALIASES = ["name", "fullname", "studentname", "recipient", "ឈ្មោះ", "ឈ្មោះសិស្ស", "ឈ្មោះអ្នកទទួល", "គោត្តនាម នាម", "គោត្តនាមនាម"];

const EXTRA_ALIASES: Partial<Record<FieldKey, string[]>> = {
  nameEn: ["nameen", "englishname", "ឈ្មោះអង់គ្លេស", "ឈ្មោះឡាតាំង"],
  course: ["course", "coursename", "class", "skill", "វគ្គ", "វគ្គសិក្សា", "មុខវិជ្ជា", "ថ្នាក់", "ជំនាញ"],
  courseEn: ["courseen", "englishcourse"],
  grade: ["grade", "result", "score", "ពិន្ទុ", "និទ្ទេស", "លទ្ធផល"],
  gradeEn: ["gradeen", "englishgrade"],
  date: ["date", "issuedate", "issueddate", "កាលបរិច្ឆេទ", "ថ្ងៃចេញ", "ថ្ងៃខែ"],
  duration: ["duration", "រយៈពេល"],
  gender: ["gender", "sex", "ភេទ"],
  dob: ["dob", "dateofbirth", "birthdate", "birthday", "ថ្ងៃកំណើត", "ថ្ងៃខែឆ្នាំកំណើត"],
  nationality: ["nationality", "សញ្ជាតិ"],
  startDate: ["startdate", "start", "from", "ចាប់ផ្តើម", "ថ្ងៃចាប់ផ្តើម", "ចាប់ពី"],
  endDate: ["enddate", "end", "to", "បញ្ចប់", "ថ្ងៃបញ្ចប់", "ដល់"],
  certNo: ["certno", "number", "no", "លេខ", "លេខឯកសារ"],
  code: ["code", "studentcode", "id", "idno", "កូដ", "កូដសិស្ស", "លេខសម្គាល់", "អត្តលេខ"],
  position: ["position", "title", "role", "តួនាទី", "មុខតំណែង"],
  phone: ["phone", "tel", "mobile", "ទូរស័ព្ទ", "លេខទូរស័ព្ទ"],
  address: ["address", "អាសយដ្ឋាន"],
  validUntil: ["validuntil", "valid", "expiry", "expire", "សុពលភាព", "សុពលភាពដល់", "ផុតកំណត់"],
  reason: ["reason", "achievement", "ហេតុផល", "ហេតុផលសរសើរ", "សមិទ្ធផល"],
  occasion: ["occasion", "event", "ឱកាស", "ឱកាសជូនពរ"],
  subject: ["subject", "កម្មវត្ថុ"],
  message: ["message", "body", "content", "ខ្លឹមសារ", "ខ្លឹមសារលិខិត", "ពាក្យជូនពរ"],
};

function norm(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/[\s_\-./:()]+/g, "");
}

function aliasesFor(key: FieldKey): Set<string> {
  const set = new Set<string>([norm(key), norm(FIELDS[key].label)]);
  for (const a of EXTRA_ALIASES[key] ?? []) set.add(norm(a));
  for (const d of Object.keys(DOC_TYPES) as DocType[]) set.add(norm(fieldLabel(d, key)));
  return set;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return toPhnomPenhDateInput(v);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return String(o.result);
    return "";
  }
  return String(v).trim();
}

function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

/** Reads recipients from an .xlsx / .csv upload. The header row is found by column names (Khmer or English). */
export async function parseRecipientWorkbook(buf: Buffer, fileName: string, doc: DocType): Promise<Omit<Recipient, "id">[]> {
  const wb = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    const { Readable } = await import("stream");
    await wb.csv.read(Readable.from(buf));
  } else {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  }
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const cfg = DOC_TYPES[doc];
  const fieldKeys = (Object.keys(FIELDS) as FieldKey[]);
  const aliasMap = new Map(fieldKeys.map((k) => [k, aliasesFor(k)]));
  const nameAliases = new Set(NAME_ALIASES.map(norm));

  let headerRow = 0;
  let nameCol = 0;
  const colMap = new Map<FieldKey, number>();
  for (let r = 1; r <= Math.min(10, ws.rowCount) && !headerRow; r++) {
    let nc = 0;
    const map = new Map<FieldKey, number>();
    ws.getRow(r).eachCell((cell, col) => {
      const n = norm(cellText(cell.value));
      if (!nc && nameAliases.has(n)) nc = col;
      for (const k of fieldKeys) if (!map.has(k) && aliasMap.get(k)!.has(n) && !nameAliases.has(n)) map.set(k, col);
    });
    if (nc) {
      headerRow = r;
      nameCol = nc;
      map.forEach((v, k) => colMap.set(k, v));
    }
  }
  // No header → first column = name, then the quick-add columns of this document type.
  if (!headerRow) {
    nameCol = 1;
    cfg.pasteCols.forEach((k, i) => colMap.set(k, i + 2));
  }

  const today = todayInPhnomPenh();
  const rows: Omit<Recipient, "id">[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount && rows.length < 500; r++) {
    const row = ws.getRow(r);
    const name = cellText(row.getCell(nameCol).value);
    if (!name) continue;
    const rec: Record<string, string | undefined> = { name, course: "", grade: "", date: today };
    for (const [k, col] of colMap) {
      const raw = cellText(row.getCell(col).value);
      if (!raw) continue;
      rec[k] = FIELDS[k].kind === "date" ? normalizeDate(raw) || undefined : raw;
    }
    rows.push(rec as unknown as Omit<Recipient, "id">);
  }
  return rows;
}
