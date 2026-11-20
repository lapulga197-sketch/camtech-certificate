"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { getUserById, isAdmin, type Role, type Status } from "@/lib/users";
import { query } from "@/lib/db";

type Result = { success: boolean; message?: string };

/** The signed-in admin, and the target user — with the rules of who may change whom. */
async function context(targetId: string): Promise<{ ok: true; me: NonNullable<Awaited<ReturnType<typeof currentUser>>>; target: NonNullable<Awaited<ReturnType<typeof getUserById>>> } | { ok: false; message: string }> {
  const me = await currentUser();
  if (!me || !isAdmin(me.role)) return { ok: false, message: "គ្មានសិទ្ធិ" };
  const target = await getUserById(targetId);
  if (!target) return { ok: false, message: "រកមិនឃើញអ្នកប្រើប្រាស់" };
  if (target.id === me.id) return { ok: false, message: "មិនអាចកែគណនីរបស់ខ្លួនឯងនៅទីនេះបានទេ" };
  if (me.role !== "SUPER_ADMIN" && isAdmin(target.role)) return { ok: false, message: "មានតែអេដមីនធំទេដែលអាចកែអេដមីនផ្សេងបាន" };
  return { ok: true, me, target };
}

export async function setUserStatus(id: string, status: Status): Promise<Result> {
  if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) return { success: false, message: "ស្ថានភាពមិនត្រឹមត្រូវ" };
  const c = await context(id);
  if (!c.ok) return { success: false, message: c.message };
  await query(
    "UPDATE app_user SET status = $1, approved_at = CASE WHEN $1 = 'APPROVED' THEN now() ELSE approved_at END, approved_by = CASE WHEN $1 = 'APPROVED' THEN $2 ELSE approved_by END WHERE id = $3",
    [status, c.me.id, id]
  );
  revalidatePath("/admin/users");
  return { success: true };
}

export async function setUserRole(id: string, role: Role): Promise<Result> {
  if (!["ADMIN", "USER"].includes(role)) return { success: false, message: "តួនាទីមិនត្រឹមត្រូវ" };
  const c = await context(id);
  if (!c.ok) return { success: false, message: c.message };
  if (c.me.role !== "SUPER_ADMIN") return { success: false, message: "មានតែអេដមីនធំទេដែលអាចប្តូរតួនាទី" };
  await query("UPDATE app_user SET role = $1 WHERE id = $2", [role, id]);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(id: string, password: string): Promise<Result> {
  if (password.length < 6) return { success: false, message: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ" };
  const c = await context(id);
  if (!c.ok) return { success: false, message: c.message };
  await query("UPDATE app_user SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(password, 10), id]);
  return { success: true };
}

export async function deleteUser(id: string): Promise<Result> {
  const c = await context(id);
  if (!c.ok) return { success: false, message: c.message };
  await query("DELETE FROM design_template WHERE owner_id = $1", [id]);
  await query("DELETE FROM app_user WHERE id = $1", [id]);
  revalidatePath("/admin/users");
  return { success: true };
}
