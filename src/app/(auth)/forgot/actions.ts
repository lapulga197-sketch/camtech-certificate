"use server";

import { createResetToken } from "@/lib/users";
import { allow } from "@/lib/security";
import { clientInfo } from "@/lib/request-info";
import { mailConfigured, sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export type ForgotState = { error?: string; ok?: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function forgotAction(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { error: "អ៊ីមែលមិនត្រឹមត្រូវ" };
  const mail = mailConfigured();
  // The answer never says whether the e-mail exists (so it cannot be used to probe for accounts).
  const generic: ForgotState = {
    ok: mail
      ? "បើអ៊ីមែលនេះមានក្នុងប្រព័ន្ធ យើងបានផ្ញើតំណកំណត់លេខសម្ងាត់ទៅហើយ (មានសុពលភាព ១ ម៉ោង) — សូមពិនិត្យ Inbox និង Spam។ អេដមីនក៏អាចជួយកំណត់ឲ្យបានដែរ។"
      : "បានជូនដំណឹងដល់អេដមីនហើយ — អេដមីននឹងកំណត់លេខសម្ងាត់ថ្មី ហើយប្រាប់អ្នក។",
  };
  try {
    const ip = (await clientInfo()).ip;
    if (!(await allow(`fg:ip:${ip}`, 8, 3600)) || !(await allow(`fg:e:${email}`, 3, 3600))) {
      return { error: "ស្នើច្រើនដងពេក — សូមព្យាយាមម្តងទៀតក្រោយមួយរយៈ" };
    }
    const r = await createResetToken(email);
    if (r && r.token && mail) {
      const { brand } = await getSettings();
      const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "") || (await originFromHeaders());
      const link = `${base}/reset/${r.token}`;
      await sendMail(
        r.user.email,
        `កំណត់លេខសម្ងាត់ថ្មី — ${brand.appName}`,
        `<p>សួស្តី ${esc(r.user.name)},</p><p>សូមចុចតំណខាងក្រោមដើម្បីកំណត់លេខសម្ងាត់ថ្មី (មានសុពលភាព ១ ម៉ោង)៖</p><p><a href="${link}">${link}</a></p><p>បើអ្នកមិនបានស្នើទេ សូមមិនអើពើអ៊ីមែលនេះ។</p>`,
        `សួស្តី ${r.user.name},\n\nកំណត់លេខសម្ងាត់ថ្មី (មានសុពលភាព ១ ម៉ោង)៖\n${link}\n\nបើអ្នកមិនបានស្នើទេ សូមមិនអើពើអ៊ីមែលនេះ។`
      );
    }
  } catch (e) {
    console.error("forgot failed", e);
    return { error: "មានបញ្ហាបច្ចេកទេស — សូមព្យាយាមម្តងទៀត" };
  }
  return generic;
}

async function originFromHeaders(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
