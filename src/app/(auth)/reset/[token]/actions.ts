"use server";

import { redirect } from "next/navigation";
import { consumeResetToken } from "@/lib/users";
import { allow } from "@/lib/security";
import { clientInfo } from "@/lib/request-info";
import { logActivity } from "@/lib/activity";

export type ResetState = { error?: string };

export async function resetAction(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 6) return { error: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" };
  if (password.length > 200) return { error: "លេខសម្ងាត់វែងពេក" };
  if (password !== confirm) return { error: "លេខសម្ងាត់បញ្ជាក់មិនដូចគ្នា" };
  try {
    const ip = (await clientInfo()).ip;
    if (!(await allow(`rs:ip:${ip}`, 15, 3600))) return { error: "ព្យាយាមច្រើនដងពេក — សូមរង់ចាំមួយរយៈ" };
    if (!(await consumeResetToken(token, password))) return { error: "តំណមិនត្រឹមត្រូវ ឬផុតកំណត់ — សូមស្នើតំណថ្មី" };
    await logActivity("password_reset");
  } catch (e) {
    console.error("reset failed", e);
    return { error: "មានបញ្ហាបច្ចេកទេស — សូមព្យាយាមម្តងទៀត" };
  }
  redirect("/login?reset=1");
}
