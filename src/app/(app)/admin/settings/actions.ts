"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { query } from "@/lib/db";
import { saveSetting } from "@/lib/settings";
import type { About, Brand, Contact, LinkItem, Welcome } from "@/lib/settings-types";

type Result = { success: boolean; message?: string };

async function admin() {
  const me = await currentUser();
  return me && isAdmin(me.role) ? me : null;
}

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const idOrNull = (v: unknown) => (typeof v === "string" && /^[a-f0-9]{32}$/.test(v) ? v : null);

function safeHref(v: string): string {
  const t = v.trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(t) && t.length <= 500 ? t : "";
}
function links(v: unknown, max = 12): LinkItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map((x) => ({ label: s(x?.label, 80), value: s(x?.value, 200), href: safeHref(s(x?.href, 500)) })).filter((x) => x.label || x.value);
}

/** Removes uploaded files that are no longer referenced (older than an hour, so in-progress uploads are safe). */
async function sweep(kind: string, keep: (string | null)[]) {
  await query("DELETE FROM asset WHERE kind = $1 AND id <> ALL($2::text[]) AND created_at < now() - interval '1 hour'", [kind, keep.filter(Boolean)]);
}

export async function saveSite(key: "brand" | "welcome" | "about" | "contact", raw: unknown): Promise<Result> {
  if (!(await admin())) return { success: false, message: "គ្មានសិទ្ធិ" };
  const r = (raw ?? {}) as Record<string, unknown>;
  if (key === "brand") {
    const v: Brand = {
      appName: s(r.appName, 80) || "ស្ទូឌីយោឯកសារ", tagline: s(r.tagline, 160), footer: s(r.footer, 200),
      faviconId: idOrNull(r.faviconId), iconId: idOrNull(r.iconId), logoId: idOrNull(r.logoId),
    };
    await saveSetting("brand", v);
    await sweep("favicon", [v.faviconId]);
    await sweep("icon", [v.iconId]);
    await sweep("logo", [v.logoId]);
  } else if (key === "welcome") {
    const imgs = Array.isArray(r.images) ? r.images : [];
    const v: Welcome = {
      enabled: r.enabled !== false, title: s(r.title, 120), body: s(r.body, 2000),
      images: imgs.slice(0, 3).map((i) => ({ assetId: idOrNull((i as { assetId?: unknown })?.assetId) ?? "", caption: s((i as { caption?: unknown })?.caption, 120) })).filter((i) => i.assetId),
    };
    await saveSetting("welcome", v);
    await sweep("welcome", v.images.map((i) => i.assetId));
  } else if (key === "about") {
    const v: About = { title: s(r.title, 120) || "អំពីយើង", body: s(r.body, 6000), imageId: idOrNull(r.imageId), links: links(r.links) };
    await saveSetting("about", v);
    await sweep("about", [v.imageId]);
  } else {
    const v: Contact = { title: s(r.title, 120) || "ទំនាក់ទំនង", intro: s(r.intro, 1000), items: links(r.items) };
    await saveSetting("contact", v);
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateGuide(id: string, title: string, doc: string): Promise<Result> {
  if (!(await admin())) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!/^[a-f0-9]{32}$/.test(id)) return { success: false };
  await query("UPDATE asset SET meta = $1 WHERE id = $2 AND kind = 'help'", [JSON.stringify({ title: s(title, 120), doc: s(doc, 40).replace(/[^a-z_-]/g, "") || "general" }), id]);
  revalidatePath("/help");
  return { success: true };
}

export async function deleteAsset(id: string, kind: "help" | "frame"): Promise<Result> {
  if (!(await admin())) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!/^[a-f0-9]{32}$/.test(id)) return { success: false };
  await query("DELETE FROM asset WHERE id = $1 AND kind = $2", [id, kind]);
  revalidatePath(kind === "help" ? "/help" : "/admin/frames");
  return { success: true };
}

export async function updateFrame(id: string, title: string, docs: string[], orientation: string): Promise<Result> {
  if (!(await admin())) return { success: false, message: "គ្មានសិទ្ធិ" };
  if (!/^[a-f0-9]{32}$/.test(id)) return { success: false };
  const meta = {
    title: s(title, 80), docs: docs.filter((d) => /^[a-z_]+$/.test(d)).slice(0, 10),
    orientation: ["landscape", "portrait", "both"].includes(orientation) ? orientation : "both",
  };
  await query("UPDATE asset SET meta = $1 WHERE id = $2 AND kind = 'frame'", [JSON.stringify(meta), id]);
  revalidatePath("/admin/frames");
  return { success: true };
}
