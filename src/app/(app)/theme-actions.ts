"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { query } from "@/lib/db";
import { saveSetting } from "@/lib/settings";

type Prefs = { mode: string; accent: string; primary: string; bg: string };

function sanitize(p: Prefs): Prefs | null {
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (!["light", "dark", "system"].includes(p.mode)) return null;
  if (!/^[a-z-]{1,30}$/.test(p.accent)) return null;
  return { mode: p.mode, accent: p.accent, primary: hex.test(p.primary) ? p.primary : "", bg: hex.test(p.bg) ? p.bg : "" };
}

export async function saveMyTheme(p: Prefs): Promise<{ success: boolean }> {
  const me = await currentUser();
  const clean = sanitize(p);
  if (!me || !clean) return { success: false };
  await query("UPDATE app_user SET prefs = $1 WHERE id = $2", [JSON.stringify({ theme: clean }), me.id]);
  return { success: true };
}

export async function saveDefaultTheme(p: Prefs): Promise<{ success: boolean; message?: string }> {
  const me = await currentUser();
  if (!me || !isAdmin(me.role)) return { success: false, message: "គ្មានសិទ្ធិ" };
  const clean = sanitize(p);
  if (!clean) return { success: false, message: "ទិន្នន័យមិនត្រឹមត្រូវ" };
  await saveSetting("theme", clean as never);
  revalidatePath("/", "layout");
  return { success: true };
}
