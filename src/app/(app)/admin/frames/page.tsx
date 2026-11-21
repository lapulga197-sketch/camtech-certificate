import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { FramesManager, type FrameItem } from "./frames-manager";
import { PhotoFramesManager, type PFrameItem } from "./photo-frames-manager";

export const dynamic = "force-dynamic";

export default async function FramesPage() {
  await requireAdmin();
  const rows = await query<{ id: string; size: number; meta: string | null }>("SELECT id, size, meta FROM asset WHERE kind = 'frame' ORDER BY sort_order, created_at LIMIT 300");
  const items: FrameItem[] = rows.map((r) => {
    let m: { title?: string; docs?: string[]; orientation?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    return { id: r.id, size: r.size, title: m.title || "ស៊ុម", docs: m.docs ?? [], orientation: (m.orientation as FrameItem["orientation"]) || "both" };
  });
  const prows = await query<{ id: string; meta: string | null }>("SELECT id, meta FROM asset WHERE kind = 'pframe' ORDER BY sort_order, created_at LIMIT 200");
  const pitems: PFrameItem[] = prows.map((r) => {
    let m: { title?: string; ar?: number; hole?: number[]; shape?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    const hole = (Array.isArray(m.hole) && m.hole.length === 4 ? m.hole.map((x) => Number(x) || 0) : [14, 14, 14, 14]) as PFrameItem["hole"];
    return { id: r.id, title: m.title || "ស៊ុមរូបថត", ar: Number(m.ar) || 0.8, hole, shape: m.shape === "oval" || m.shape === "rounded" ? m.shape : "rect" };
  });
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="ស៊ុម / ម៉ូតឯកសារ" description="អាបឡុតស៊ុម (PNG ថ្លា ឬ SVG) សម្រាប់សញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិត និងកាត — អ្នកប្រើជ្រើសរើសបានក្នុងស្ទូឌីយោ" />
      <FramesManager initial={items} />
      <PhotoFramesManager initial={pitems} />
    </div>
  );
}
