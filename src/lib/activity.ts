import "server-only";
import { query } from "@/lib/db";
import { clientInfo } from "@/lib/request-info";

export type Action =
  | "login" | "login_fail" | "register" | "open" | "export_png" | "export_zip" | "export_pdf" | "export_sheet" | "print"
  | "register_docs" | "excel_import" | "template_save" | "password_reset";

export const ACTION_LABEL: Record<string, string> = {
  login: "ចូលប្រព័ន្ធ", login_fail: "ចូលបរាជ័យ", register: "ចុះឈ្មោះ", open: "បើកស្ទូឌីយោ",
  export_png: "ទាញយក PNG", export_zip: "ទាញយក ZIP", export_pdf: "ទាញយក PDF", export_sheet: "PDF តារាងកាត", print: "បោះពុម្ព",
  register_docs: "ចុះបញ្ជី + QR", excel_import: "នាំចូល Excel", template_save: "រក្សាទុកគំរូ", password_reset: "ប្តូរលេខសម្ងាត់",
};

/** Actions that count as "running a function" in the statistics. */
export const RUN_ACTIONS = ["export_png", "export_zip", "export_pdf", "export_sheet", "print", "register_docs", "excel_import"];

/** Best-effort usage log: it must never break the request it belongs to. */
export async function logActivity(action: Action, opts: { userId?: string | null; email?: string | null; doc?: string | null; amount?: number } = {}): Promise<void> {
  try {
    const c = await clientInfo();
    await query(
      `INSERT INTO activity_log (user_id, email, action, doc_type, amount, ip, country, region, city, device, os, browser)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [opts.userId ?? null, opts.email ?? null, action, opts.doc ?? null, Math.max(1, Math.min(opts.amount ?? 1, 100000)), c.ip, c.country, c.region, c.city, c.device, c.os, c.browser]
    );
    if (Math.random() < 0.005) void query("DELETE FROM activity_log WHERE created_at < now() - interval '400 days'").catch(() => undefined);
  } catch (e) {
    console.error("activity log failed", e);
  }
}
