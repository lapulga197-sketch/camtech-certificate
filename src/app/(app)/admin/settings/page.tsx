import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/shared/page-header";
import { mailConfigured } from "@/lib/mail";
import { SettingsForm, type GuideItem } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const rows = await query<{ id: string; name: string; size: number; meta: string | null }>(
    "SELECT id, name, size, meta FROM asset WHERE kind = 'help' ORDER BY sort_order, created_at"
  );
  const guides: GuideItem[] = rows.map((r) => {
    let m: { title?: string; doc?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    return { id: r.id, name: r.name, size: r.size, title: m.title || r.name, doc: m.doc || "general" };
  });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="ការកំណត់ប្រព័ន្ធ" description="ឈ្មោះ app, favicon, logo, ផ្ទាំងស្វាគមន៍, អំពីយើង, ទំនាក់ទំនង និងឯកសារណែនាំ (PDF)" />
      <SettingsForm initial={settings} guides={guides} mail={mailConfigured()} />
    </div>
  );
}
