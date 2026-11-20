"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";

export type AccountState = { error?: string; ok?: string };

const MAX_LOGO = 700_000;

export async function updateProfile(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const me = await currentUser();
  if (!me) return { error: "សូមចូលប្រព័ន្ធឡើងវិញ" };
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "សូមបញ្ចូលឈ្មោះ" };
  const logo = String(fd.get("orgLogo") ?? "");
  if (logo.length > MAX_LOGO) return { error: "រូប Logo ធំពេក — សូមប្រើរូបតូចជាងនេះ" };
  if (logo && !/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(logo)) return { error: "ទម្រង់រូប Logo មិនត្រឹមត្រូវ" };
  await query(
    "UPDATE app_user SET name = $1, phone = $2, org_name = $3, org_name_en = $4, org_address = $5, org_phone = $6, org_logo = $7 WHERE id = $8",
    [
      name, String(fd.get("phone") ?? "").trim() || null, String(fd.get("orgName") ?? "").trim() || null,
      String(fd.get("orgNameEn") ?? "").trim() || null, String(fd.get("orgAddress") ?? "").trim() || null,
      String(fd.get("orgPhone") ?? "").trim() || null, logo || null, me.id,
    ]
  );
  revalidatePath("/", "layout");
  return { ok: "បានរក្សាទុក" };
}

export async function changePassword(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const me = await currentUser();
  if (!me) return { error: "សូមចូលប្រព័ន្ធឡើងវិញ" };
  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 6) return { error: "លេខសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM app_user WHERE id = $1", [me.id]);
  if (!row || !(await bcrypt.compare(cur, row.password_hash))) return { error: "លេខសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ" };
  await query("UPDATE app_user SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(next, 10), me.id]);
  return { ok: "បានប្តូរលេខសម្ងាត់" };
}
