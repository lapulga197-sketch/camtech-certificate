"use server";

import { redirect } from "next/navigation";
import { registerUser } from "@/lib/users";
import { allow, checkFormToken } from "@/lib/security";
import { clientInfo } from "@/lib/request-info";
import { logActivity } from "@/lib/activity";
import { queryOne } from "@/lib/db";

export type RegisterState = { error?: string };

const MAX_PENDING = 500;

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  // Bots: a filled honeypot, or a form posted instantly / long after it was issued.
  if (String(formData.get("website") ?? "") !== "") redirect("/login?registered=1");
  if (!checkFormToken(String(formData.get("ft") ?? ""))) return { error: "សូមផ្ទុកទំព័រឡើងវិញ ហើយបំពេញម្តងទៀត (ទម្រង់ផុតកំណត់ ឬបំពេញលឿនពេក)" };

  if (name.length < 2) return { error: "សូមបញ្ចូលឈ្មោះ" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { error: "អ៊ីមែលមិនត្រឹមត្រូវ" };
  if (password.length < 6) return { error: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" };
  if (password.length > 200) return { error: "លេខសម្ងាត់វែងពេក" };
  if (password !== confirm) return { error: "លេខសម្ងាត់បញ្ជាក់មិនដូចគ្នា" };

  let first = false;
  try {
    const ip = (await clientInfo()).ip;
    if (!(await allow(`reg:ip:${ip}`, 5, 3600)) || !(await allow(`reg:all`, 300, 3600))) {
      return { error: "ចុះឈ្មោះច្រើនដងពេក — សូមព្យាយាមម្តងទៀតក្រោយមួយរយៈ" };
    }
    const pending = await queryOne<{ n: string }>("SELECT count(*)::text AS n FROM app_user WHERE status = 'PENDING'");
    if (Number(pending?.n ?? 0) >= MAX_PENDING) return { error: "សំណើរង់ចាំពេញហើយ — សូមទាក់ទងអេដមីន" };
    const r = await registerUser({ name, email, password, phone, orgName, note: note.slice(0, 300) });
    if (!r.ok) return { error: r.message };
    first = r.firstAdmin;
    await logActivity("register", { email });
  } catch (err) {
    console.error("register failed", err);
    return { error: "មិនអាចតភ្ជាប់ទៅ database បានទេ — សូមពិនិត្យ DATABASE_URL ក្នុង Vercel" };
  }
  redirect(first ? "/login" : "/login?registered=1");
}
