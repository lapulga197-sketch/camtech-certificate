"use server";

import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { newId, query, queryOne } from "@/lib/db";
import { parseRecipientWorkbook } from "@/lib/certificate-sheet";
import { DOC_TYPES } from "@/lib/doc-types";
import { allow } from "@/lib/security";
import { logActivity, type Action } from "@/lib/activity";
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
  const me = await guard();
  if (!me) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!(await allow(`xl:${me.id}`, 30, 600))) return { success: false, message: "នាំចូលច្រើនដងពេក — សូមរង់ចាំបន្តិច" };
  const file = formData.get("file");
  const doc = String(formData.get("doc") ?? "certificate") as DocType;
  if (!DOCS.has(doc)) return { success: false, message: "ប្រភេទឯកសារមិនត្រឹមត្រូវ" };
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "សូមជ្រើសរើសឯកសារ Excel" };
  if (file.size > 3 * 1024 * 1024) return { success: false, message: "ឯកសារធំពេក (អតិបរមា 3MB)" };
  try {
    const rows = await parseRecipientWorkbook(Buffer.from(await file.arrayBuffer()), file.name, doc);
    if (rows.length === 0) return { success: false, message: "រកមិនឃើញឈ្មោះក្នុងឯកសារទេ" };
    await logActivity("excel_import", { userId: me.id, email: me.email, doc, amount: rows.length });
    return { success: true, rows: rows.slice(0, 2000) };
  } catch {
    return { success: false, message: "មិនអាចអានឯកសារបានទេ — សូមប្រើ .xlsx ឬ .csv" };
  }
}

// ---------------------------------------------------------------------------
// Registering documents (number + verification QR)
// ---------------------------------------------------------------------------

export type RegisterItem = { key: string; name: string; detail?: string; date: string };
export type RegisterResult = { key: string; certNo: string };

export async function registerDocuments(
  doc: DocType,
  items: RegisterItem[],
  origin: string
): Promise<{ success: boolean; message?: string; results?: RegisterResult[]; verifyBase?: string }> {
  const user = await guard();
  if (!user) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!DOCS.has(doc) || !DOC_TYPES[doc].register) return { success: false, message: "ប្រភេទឯកសារនេះមិនត្រូវការចុះបញ្ជីទេ" };
  if (!(await allow(`rd:${user.id}`, 40, 600))) return { success: false, message: "ចុះបញ្ជីច្រើនដងពេក — សូមរង់ចាំបន្តិច" };
  const valid = items.slice(0, 200).filter((it) => /^\d{4}-\d{2}-\d{2}$/.test(it.date) && String(it.name ?? "").trim());
  if (valid.length === 0) return { success: true, results: [] };
  const origin0 = /^https?:\/\/[^\s/]+$/.test(origin) ? origin : "";
  const baseUrl = (process.env.NEXTAUTH_URL || origin0 || "http://localhost:3000").replace(/\/$/, "");
  const prefix = DOC_TYPES[doc].prefix;

  try {
    // One counter bump reserves the whole range of numbers, one INSERT stores them all —
    // so many users registering at once only cost a handful of queries each.
    const year = new Date(Date.now() + 7 * 3600_000).getUTCFullYear();
    const row = await queryOne<{ value: number }>(
      "INSERT INTO doc_counter (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = doc_counter.value + $2 RETURNING value",
      [`${prefix}-${year}`, valid.length]
    );
    const start = (row?.value ?? valid.length) - valid.length + 1;
    const nos = valid.map((_, i) => `${prefix}-${year}-${String(start + i).padStart(4, "0")}`);
    await query(
      `INSERT INTO issued_doc (id, doc_no, doc_type, owner_id, recipient_name, detail, org_name, issued_date)
       SELECT t.id, t.no, $1, $2, t.name, NULLIF(t.detail, ''), $3, t.dt::date
       FROM unnest($4::text[], $5::text[], $6::text[], $7::text[], $8::text[]) AS t(id, no, name, detail, dt)`,
      [
        doc, user.id, user.org_name,
        valid.map(() => newId()), nos,
        valid.map((it) => it.name.trim().slice(0, 200)), valid.map((it) => (it.detail ?? "").slice(0, 300)), valid.map((it) => it.date),
      ]
    );
    // QR images are drawn in the user's browser — the server only reserves numbers (fast, even with many users).
    const results: RegisterResult[] = valid.map((it, i) => ({ key: it.key, certNo: nos[i] }));
    await logActivity("register_docs", { userId: user.id, email: user.email, doc, amount: valid.length });
    return { success: true, results, verifyBase: baseUrl };
  } catch (e) {
    console.error("register failed", e);
    return { success: false, message: "មិនអាចចុះបញ្ជីបានទេ" };
  }
}

// ---------------------------------------------------------------------------
// Saved designs (templates)
// ---------------------------------------------------------------------------

const MAX_CONFIG = 3_000_000;

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
    await logActivity("template_save", { userId: user.id, email: user.email, doc });
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

// ---------------------------------------------------------------------------
// Frames (uploaded by an admin, chosen by users)
// ---------------------------------------------------------------------------

export type FrameRow = { id: string; title: string };

export async function listFrames(doc: DocType, orientation: "landscape" | "portrait"): Promise<FrameRow[]> {
  if (!(await guard()) || !DOCS.has(doc)) return [];
  const rows = await query<{ id: string; meta: string | null }>("SELECT id, meta FROM asset WHERE kind = 'frame' ORDER BY sort_order, created_at LIMIT 300");
  const out: FrameRow[] = [];
  for (const r of rows) {
    let m: { title?: string; docs?: string[]; orientation?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    const docs = m.docs ?? [];
    if (docs.length > 0 && !docs.includes(doc)) continue;
    if (m.orientation && m.orientation !== "both" && m.orientation !== orientation) continue;
    out.push({ id: r.id, title: m.title || "ស៊ុម" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Usage tracking for downloads / printing done in the browser
// ---------------------------------------------------------------------------

const TRACKED = new Set<Action>(["export_png", "export_zip", "export_pdf", "export_sheet", "print"]);

export async function trackUse(action: Action, doc: DocType, amount: number): Promise<void> {
  const user = await guard();
  if (!user || !TRACKED.has(action) || !DOCS.has(doc)) return;
  if (!(await allow(`tr:${user.id}`, 240, 600))) return;
  await logActivity(action, { userId: user.id, email: user.email, doc, amount: Math.max(1, Math.min(Math.floor(Number(amount) || 1), 5000)) });
}
