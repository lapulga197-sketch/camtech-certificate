"use server";

import QRCode from "qrcode";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { newId, query, queryOne } from "@/lib/db";
import { parseRecipientWorkbook } from "@/lib/certificate-sheet";
import { DOC_TYPES } from "@/lib/doc-types";
import type { DocType, Recipient } from "@/lib/certificate-design";

async function guard() {
  return currentUser();
}

const DOCS = new Set(Object.keys(DOC_TYPES));

// ---------------------------------------------------------------------------
// Excel import
// ---------------------------------------------------------------------------

export async function parseRecipientSheet(
  formData: FormData
): Promise<{ success: boolean; message?: string; rows?: Omit<Recipient, "id">[] }> {
  if (!(await guard())) return { success: false, message: "គ្មានសិទ្ធិ" };
  const file = formData.get("file");
  const doc = String(formData.get("doc") ?? "certificate") as DocType;
  if (!DOCS.has(doc)) return { success: false, message: "ប្រភេទឯកសារមិនត្រឹមត្រូវ" };
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "សូមជ្រើសរើសឯកសារ Excel" };
  if (file.size > 3 * 1024 * 1024) return { success: false, message: "ឯកសារធំពេក (អតិបរមា 3MB)" };
  try {
    const rows = await parseRecipientWorkbook(Buffer.from(await file.arrayBuffer()), file.name, doc);
    if (rows.length === 0) return { success: false, message: "រកមិនឃើញឈ្មោះក្នុងឯកសារទេ" };
    return { success: true, rows };
  } catch {
    return { success: false, message: "មិនអាចអានឯកសារបានទេ — សូមប្រើ .xlsx ឬ .csv" };
  }
}

// ---------------------------------------------------------------------------
// Registering documents (number + verification QR)
// ---------------------------------------------------------------------------

export type RegisterItem = { key: string; name: string; detail?: string; date: string };
export type RegisterResult = { key: string; certNo: string; qr: string };

async function nextNo(prefix: string): Promise<string> {
  const year = new Date(Date.now() + 7 * 3600_000).getUTCFullYear();
  const id = `${prefix}-${year}`;
  const row = await queryOne<{ value: number }>(
    "INSERT INTO doc_counter (id, value) VALUES ($1, 1) ON CONFLICT (id) DO UPDATE SET value = doc_counter.value + 1 RETURNING value",
    [id]
  );
  return `${prefix}-${year}-${String(row?.value ?? 1).padStart(4, "0")}`;
}

export async function registerDocuments(
  doc: DocType,
  items: RegisterItem[],
  origin: string
): Promise<{ success: boolean; message?: string; results?: RegisterResult[] }> {
  const user = await guard();
  if (!user) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!DOCS.has(doc) || !DOC_TYPES[doc].register) return { success: false, message: "ប្រភេទឯកសារនេះមិនត្រូវការចុះបញ្ជីទេ" };
  const list = items.slice(0, 200);
  if (list.length === 0) return { success: true, results: [] };
  const baseUrl = process.env.NEXTAUTH_URL || origin || "http://localhost:3000";
  const prefix = DOC_TYPES[doc].prefix;

  try {
    const results: RegisterResult[] = [];
    for (const it of list) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date) || !it.name.trim()) continue;
      const certNo = await nextNo(prefix);
      await query(
        "INSERT INTO issued_doc (id, doc_no, doc_type, owner_id, recipient_name, detail, org_name, issued_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [newId(), certNo, doc, user.id, it.name.trim().slice(0, 200), (it.detail ?? "").slice(0, 300) || null, user.org_name, it.date]
      );
      const qr = await QRCode.toDataURL(`${baseUrl.replace(/\/$/, "")}/verify/${certNo}`, { width: 300, margin: 1 });
      results.push({ key: it.key, certNo, qr });
    }
    return { success: true, results };
  } catch (e) {
    console.error("register failed", e);
    return { success: false, message: "មិនអាចចុះបញ្ជីបានទេ" };
  }
}

// ---------------------------------------------------------------------------
// Saved designs (templates)
// ---------------------------------------------------------------------------

const MAX_CONFIG = 3_500_000;

export type TemplateRow = { id: string; name: string; updatedAt: string; shared: boolean; own: boolean };

type DbTemplate = { id: string; name: string; updated_at: Date; shared: boolean; owner_id: string };

function toRow(r: DbTemplate, userId: string): TemplateRow {
  return { id: r.id, name: r.name, updatedAt: new Date(r.updated_at).toISOString(), shared: r.shared, own: r.owner_id === userId };
}

/** Own templates plus the ones an admin shared with everybody. */
export async function listTemplates(userId: string, doc: DocType): Promise<TemplateRow[]> {
  const rows = await query<DbTemplate>(
    "SELECT id, name, updated_at, shared, owner_id FROM design_template WHERE doc_type = $1 AND (owner_id = $2 OR shared) ORDER BY updated_at DESC",
    [doc, userId]
  );
  return rows.map((r) => toRow(r, userId));
}

export async function saveTemplate(
  id: string | null,
  doc: DocType,
  name: string,
  config: string
): Promise<{ success: boolean; message?: string; template?: TemplateRow }> {
  const user = await guard();
  if (!user) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!DOCS.has(doc)) return { success: false, message: "ប្រភេទឯកសារមិនត្រឹមត្រូវ" };
  const title = name.trim().slice(0, 80);
  if (!title) return { success: false, message: "សូមបញ្ចូលឈ្មោះគំរូ" };
  if (config.length > MAX_CONFIG) return { success: false, message: "រូបភាពក្នុងគំរូធំពេក — សូមប្រើរូបតូចជាងនេះ" };
  try {
    let row: DbTemplate | null;
    if (id) {
      row = await queryOne<DbTemplate>(
        `UPDATE design_template SET name = $1, config = $2, updated_at = now()
         WHERE id = $3 AND doc_type = $4 AND (owner_id = $5 OR $6) RETURNING id, name, updated_at, shared, owner_id`,
        [title, config, id, doc, user.id, isAdmin(user.role)]
      );
      if (!row) return { success: false, message: "មិនអាចកែគំរូនេះបានទេ" };
    } else {
      row = await queryOne<DbTemplate>(
        "INSERT INTO design_template (id, owner_id, doc_type, name, config) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, updated_at, shared, owner_id",
        [newId(), user.id, doc, title, config]
      );
    }
    return { success: true, template: toRow(row!, user.id) };
  } catch (e) {
    console.error("save template failed", e);
    return { success: false, message: "មិនអាចរក្សាទុកគំរូបានទេ" };
  }
}

export async function loadTemplate(id: string): Promise<{ success: boolean; message?: string; config?: string }> {
  const user = await guard();
  if (!user) return { success: false, message: "គ្មានសិទ្ធិ" };
  try {
    const row = await queryOne<{ config: string }>("SELECT config FROM design_template WHERE id = $1 AND (owner_id = $2 OR shared)", [id, user.id]);
    if (!row) return { success: false, message: "រកមិនឃើញគំរូ" };
    return { success: true, config: row.config };
  } catch {
    return { success: false, message: "មិនអាចបើកគំរូបានទេ" };
  }
}

export async function deleteTemplate(id: string): Promise<{ success: boolean; message?: string }> {
  const user = await guard();
  if (!user) return { success: false, message: "គ្មានសិទ្ធិ" };
  try {
    const r = await queryOne<{ id: string }>("DELETE FROM design_template WHERE id = $1 AND (owner_id = $2 OR $3) RETURNING id", [id, user.id, isAdmin(user.role)]);
    return r ? { success: true } : { success: false, message: "មិនអាចលុបគំរូនេះបានទេ" };
  } catch {
    return { success: false, message: "មិនអាចលុបគំរូបានទេ" };
  }
}

/** Admins can publish a template so every approved user sees it. */
export async function setTemplateShared(id: string, shared: boolean): Promise<{ success: boolean; message?: string }> {
  const user = await guard();
  if (!user || !isAdmin(user.role)) return { success: false, message: "គ្មានសិទ្ធិ" };
  try {
    await query("UPDATE design_template SET shared = $1 WHERE id = $2", [shared, id]);
    return { success: true };
  } catch {
    return { success: false, message: "មានបញ្ហាកើតឡើង" };
  }
}
