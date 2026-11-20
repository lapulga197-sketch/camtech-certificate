import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById, isAdmin, type UserRow } from "@/lib/users";

/** The signed-in user, re-read from the database so a suspension takes effect at once. */
export async function currentUser(): Promise<UserRow | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await getUserById(id);
  if (!u || u.status !== "APPROVED") return null;
  return u;
}

export async function requireUser(): Promise<UserRow> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<UserRow> {
  const u = await requireUser();
  if (!isAdmin(u.role)) redirect("/studio");
  return u;
}
