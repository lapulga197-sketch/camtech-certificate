import ExcelJS from "exceljs";
import { currentUser } from "@/lib/session";
import { DOC_TYPES, FIELDS, fieldLabel, docBySlug, type FieldKey } from "@/lib/doc-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A ready-to-fill Excel file for importing recipients of one document type. */
export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Forbidden", { status: 403 });
  const slug = new URL(req.url).searchParams.get("type") ?? "certificate";
  const cfg = docBySlug(slug) ?? DOC_TYPES.certificate;

  const keys: FieldKey[] = cfg.rowFields.filter((k) => k !== "certNo");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("អ្នកទទួល");
  ws.columns = [
    { header: "ឈ្មោះ", key: "name", width: 28 },
    ...keys.map((k) => ({ header: fieldLabel(cfg.key, k), key: k, width: FIELDS[k].kind === "area" ? 50 : FIELDS[k].wide ? 28 : 16 })),
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3ECFF" } };
  const sample = { ...cfg.defaults, ...cfg.sample } as Record<string, string | undefined>;
  const second: Record<string, string | undefined> = { ...sample, name: "ឈ្មោះទីពីរ", nameEn: "SECOND NAME", code: sample.code ? sample.code.replace(/1$/, "2") : undefined };
  for (const s of [sample, second]) {
    const row: Record<string, string> = { name: s.name ?? "" };
    for (const k of keys) row[k] = s[k] ?? "";
    ws.addRow(row);
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${cfg.slug}-recipients-template.xlsx"`,
    },
  });
}
