"use server";

import { redirect } from "next/navigation";
import { registerUser } from "@/lib/users";

export type RegisterState = { error?: string };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (name.length < 2) return { error: "សូមបញ្ចូលឈ្មោះ" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "អ៊ីមែលមិនត្រឹមត្រូវ" };
  if (password.length < 6) return { error: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" };
  if (password !== confirm) return { error: "លេខសម្ងាត់បញ្ជាក់មិនដូចគ្នា" };

  let first = false;
  try {
    const r = await registerUser({ name, email, password, phone, orgName, note: note.slice(0, 300) });
    if (!r.ok) return { error: r.message };
    first = r.firstAdmin;
  } catch (err) {
    console.error("register failed", err);
    return { error: "មិនអាចតភ្ជាប់ទៅ database បានទេ — សូមពិនិត្យ DATABASE_URL ក្នុង Vercel" };
  }
  redirect(first ? "/login" : "/login?registered=1");
}
