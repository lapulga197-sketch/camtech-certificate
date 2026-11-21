import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { FramesManager, type FrameItem } from "./frames-manager";

export const dynamic = "force-dynamic";

export default async function FramesPage() {
  await requireAdmin();
  const rows = await query<{ id: string; size: number; meta: string | null }>("SELECT id, size, meta FROM asset WHERE kind = 'frame' ORDER BY sort_order, created_at LIMIT 300");
  const items: FrameItem[] = rows.map((r) => {
    let m: { title?: string; docs?: string[]; orientation?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    return { id: r.id, size: r.size, title: m.title || "ស៊ុម", docs: m.docs ?? [], orientation: (m.orientation as FrameItem["orientation"]) || "both" };
  });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="ស៊ុម / ម៉ូតឯកសារ" description="អាបឡុតស៊ុម (PNG ថ្លា ឬ SVG) សម្រាប់សញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិត និងកាត — អ្នកប្រើជ្រើសរើសបានក្នុងស្ទូឌីយោ" />
      <FramesManager initial={items} />
    </div>
  );
}
