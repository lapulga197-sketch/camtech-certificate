"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoView } from "@/components/certificates/photo-view";
import { SAMPLE_PORTRAIT } from "@/lib/photo-frames";
import type { DesignElement } from "@/lib/certificate-design";
import { uploadAsset } from "@/components/admin/upload";
import { deleteAsset, updatePFrame } from "../settings/actions";

export type PFrameItem = { id: string; title: string; ar: number; hole: [number, number, number, number]; shape: "rect" | "rounded" | "oval" };

const SHAPES = [["oval", "អូវ៉ាល់ / រង្វង់"], ["rounded", "ជ្រុងមូល"], ["rect", "ចតុកោណកែង"]] as const;
const SIDES = ["ឆ្វេង", "លើ", "ស្តាំ", "ក្រោម"];

/**
 * Finds the see-through window of a frame image: scans from the centre to the first
 * opaque pixel in four directions. Returns percentages from each edge and the shape.
 */
async function detect(file: File): Promise<{ ar: number; hole: [number, number, number, number]; shape: PFrameItem["shape"] }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("decode"));
      i.src = url;
    });
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 1000;
    const ar = nw / nh;
    const k = Math.min(1, 700 / Math.max(nw, nh));
    const w = Math.max(20, Math.round(nw * k));
    const h = Math.max(20, Math.round(nh * k));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const solid = (x: number, y: number) => px[(Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4 + 3] >= 128;
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    if (solid(cx, cy)) return { ar, hole: [15, 15, 15, 15], shape: "rect" };
    let l = cx; while (l > 0 && !solid(l, cy)) l--;
    let r = cx; while (r < w - 1 && !solid(r, cy)) r++;
    let t = cy; while (t > 0 && !solid(cx, t)) t--;
    let b = cy; while (b < h - 1 && !solid(cx, b)) b++;
    const bw = r - l, bh = b - t;
    // if the window's corner is covered by the frame it is oval / round, otherwise square
    const corner = solid(l + Math.round(bw * 0.09), t + Math.round(bh * 0.09)) && solid(r - Math.round(bw * 0.09), b - Math.round(bh * 0.09));
    const grow = 1.2; // let the photo slip a little under the frame so no seam shows
    const pct = (v: number, total: number) => Math.max(0, Math.round((v / total) * 1000) / 10);
    return {
      ar,
      hole: [Math.max(0, pct(l, w) - grow), Math.max(0, pct(t, h) - grow), Math.max(0, pct(w - r, w) - grow), Math.max(0, pct(h - b, h) - grow)].map((x) => Math.round(x * 10) / 10) as [number, number, number, number],
      shape: corner ? "oval" : "rect",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Preview({ f }: { f: PFrameItem }) {
  const el: DesignElement = { id: "p", type: "photo", x: 0, y: 0, w: 100, ar: f.ar, pframe: { id: f.id, title: f.title, ar: f.ar, hole: f.hole, shape: f.shape } };
  return (
    <div className="mx-auto w-40 rounded bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">
      <PhotoView el={el} photo={SAMPLE_PORTRAIT} crop={{ fit: "fill", zoom: 1, px: 50, py: 0 }} />
    </div>
  );
}

export function PhotoFramesManager({ initial }: { initial: PFrameItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of Array.from(files).slice(0, 10)) {
      try {
        const d = await detect(file).catch(() => ({ ar: 0.8, hole: [14, 14, 14, 14] as [number, number, number, number], shape: "rect" as const }));
        const u = await uploadAsset(file, "pframe", { title: files.length === 1 ? title.trim() : "", ar: String(d.ar), hole: d.hole.join(","), shape: d.shape }, 1600);
        setList((l) => [...l, { id: u.id, title: String(u.meta.title ?? file.name), ar: Number(u.meta.ar) || d.ar, hole: (u.meta.hole as PFrameItem["hole"]) ?? d.hole, shape: (u.meta.shape as PFrameItem["shape"]) ?? d.shape }]);
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (ok) {
      setTitle("");
      toast.success(`បានបន្ថែម ${ok} ស៊ុមរូបថត`);
      router.refresh();
    }
  }

  const patch = (id: string, p: Partial<PFrameItem>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4" data-testid="pframes">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">ស៊ុមរូបថត (សម្រាប់ដាក់រូបអ្នកទទួល)</h3>
        <p className="text-xs text-muted-foreground">
          អាបឡុតរូបស៊ុម PNG ថ្លា (ឬ SVG) ដែលចំណុចកណ្តាលទទេ — ប្រព័ន្ធរកទីតាំងរន្ធ និងទម្រង់ (អូវ៉ាល់/ចតុកោណ) ដោយស្វ័យប្រវត្តិ ហើយអ្នកអាចកែតម្លៃបាន។ រូបថតអ្នកទទួលនឹងបង្ហាញតាមរន្ធនោះ។
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5"><Label>ឈ្មោះស៊ុម</Label><Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="ឧ. ស៊ុមមាសអូវ៉ាល់" data-testid="pframe-title" /></div>
          <Button type="button" disabled={busy} onClick={() => input.current?.click()} data-testid="pframe-upload">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} ជ្រើសឯកសារស៊ុមរូបថត
          </Button>
        </div>
        <input ref={input} type="file" multiple accept="image/png,image/webp,image/svg+xml" className="hidden" data-testid="pframe-file" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">មិនទាន់មានស៊ុមរូបថតទេ (អ្នកប្រើនៅតែមានស៊ុមមាស/ប្រាក់ស្រាប់)</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="pframe-list">
          {list.map((f) => (
            <li key={f.id} className="space-y-2 rounded-lg border bg-card p-3" data-testid={`pframe-item-${f.id}`}>
              <Preview f={f} />
              <Input value={f.title} maxLength={80} onChange={(e) => patch(f.id, { title: e.target.value })} />
              <Select value={f.shape} onValueChange={(v) => patch(f.id, { shape: v as PFrameItem["shape"] })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{SHAPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-4 gap-1.5">
                {SIDES.map((label, i) => (
                  <label key={label} className="space-y-0.5 text-[11px] text-muted-foreground">
                    {label} %
                    <Input type="number" min={0} max={45} step={0.5} value={f.hole[i]} data-testid={`pframe-hole-${i}`}
                      onChange={(e) => { const h = [...f.hole] as PFrameItem["hole"]; h[i] = Math.max(0, Math.min(45, Number(e.target.value) || 0)); patch(f.id, { hole: h }); }} />
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" data-testid="pframe-save" onClick={async () => {
                  const r = await updatePFrame(f.id, f.title, f.ar, f.hole, f.shape);
                  if (r.success) toast.success("បានរក្សាទុក"); else toast.error(r.message || "មានបញ្ហា");
                }}><Save className="size-4" /> រក្សាទុក</Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                  if (!window.confirm("លុបស៊ុមរូបថតនេះ?")) return;
                  const r = await deleteAsset(f.id, "pframe");
                  if (r.success) { setList((l) => l.filter((x) => x.id !== f.id)); router.refresh(); } else toast.error("លុបមិនបាន");
                }}><Trash2 className="size-4" /> លុប</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
