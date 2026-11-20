"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { authenticate } from "@/lib/users";

export type LoginState = { error?: string; info?: string };

function safeTarget(v: string): string {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/studio";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const target = safeTarget(String(formData.get("callbackUrl") ?? "/studio"));
  if (!email || !password) return { error: "សូមបំពេញអ៊ីមែល និងលេខសម្ងាត់" };

  try {
    const r = await authenticate(email, password, { touch: false });
    if (r.state === "bad") return { error: "អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវ" };
    if (r.state === "pending") return { info: "គណនីរបស់អ្នកកំពុងរង់ចាំអេដមីនអនុម័ត។ សូមរង់ចាំ ហើយព្យាយាមចូលម្តងទៀតនៅពេលក្រោយ។" };
    if (r.state === "rejected") return { error: "សំណើចុះឈ្មោះរបស់អ្នកត្រូវបានបដិសេធ។ សូមទាក់ទងអេដមីន។" };
    if (r.state === "suspended") return { error: "គណនីរបស់អ្នកត្រូវបានផ្អាក។ សូមទាក់ទងអេដមីន។" };
  } catch (err) {
    console.error("login check failed", err);
    return { error: "មិនអាចតភ្ជាប់ទៅ database បានទេ — សូមពិនិត្យ DATABASE_URL ក្នុង Vercel" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: target });
    return {};
  } catch (err) {
    if (err instanceof AuthError) return { error: "មានបញ្ហាកើតឡើងក្នុងការចូលប្រព័ន្ធ" };
    throw err; // NEXT_REDIRECT on success
  }
}
