"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadAsset } from "@/components/admin/upload";
import { DOC_ORDER, DOC_TYPES } from "@/lib/doc-types";
import { deleteAsset, updateFrame } from "../settings/actions";

export type FrameItem = { id: string; size: number; title: string; docs: string[]; orientation: "landscape" | "portrait" | "both" };

const ORIENT = [["both", "ទាំងពីរទិស"], ["landscape", "ផ្តេក"], ["portrait", "បញ្ឈរ"]] as const;

function DocChecks({ docs, onChange }: { docs: string[]; onChange: (d: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {DOC_ORDER.map((k) => (
        <label key={k} className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={docs.includes(k)} onCheckedChange={(c) => onChange(c ? [...docs, k] : docs.filter((x) => x !== k))} data-testid={`fdoc-${k}`} />
          {DOC_TYPES[k].label}
        </label>
      ))}
    </div>
  );
}

export function FramesManager({ initial }: { initial: FrameItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [title, setTitle] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<FrameItem["orientation"]>("both");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of Array.from(files).slice(0, 10)) {
      try {
        const u = await uploadAsset(file, "frame", { title: files.length === 1 ? title.trim() : "", docs: docs.join(","), orientation }, 2400);
        setList((l) => [...l, { id: u.id, size: file.size, title: String(u.meta.title ?? file.name), docs: (u.meta.docs as string[]) ?? docs, orientation: (u.meta.orientation as FrameItem["orientation"]) ?? orientation }]);
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (ok) {
      setTitle("");
      toast.success(`បានបន្ថែម ${ok} ស៊ុម`);
      router.refresh();
    }
  }

  async function save(f: FrameItem) {
    const r = await updateFrame(f.id, f.title, f.docs, f.orientation);
    if (r.success) toast.success("បានរក្សាទុក");
    else toast.error(r.message || "មានបញ្ហា");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">បន្ថែមស៊ុមថ្មី</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>ឈ្មោះស៊ុម</Label><Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="ឧ. ស៊ុមមាសបុរាណ" data-testid="frame-title" /></div>
          <div className="space-y-1.5"><Label>ទិសក្រដាស</Label>
            <Select value={orientation} onValueChange={(v) => setOrientation(v as FrameItem["orientation"])}>
              <SelectTrigger className="w-full" data-testid="frame-orient"><SelectValue /></SelectTrigger>
              <SelectContent>{ORIENT.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>សម្រាប់ប្រភេទឯកសារ <span className="text-xs font-normal text-muted-foreground">(មិនជ្រើស = ប្រើបានទាំងអស់)</span></Label><DocChecks docs={docs} onChange={setDocs} /></div>
        <Button type="button" disabled={busy} onClick={() => input.current?.click()} data-testid="frame-upload">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} ជ្រើសឯកសារស៊ុម (អាចជ្រើសច្រើន)
        </Button>
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" data-testid="frame-file" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        <p className="text-xs text-muted-foreground">គន្លឹះ៖ ប្រើ PNG ថ្លា (ចំណុចកណ្តាលទទេ) ទំហំសមាមាត្រដូចក្រដាស ឧ. A4 ផ្តេក 3508×2480px (ប្រព័ន្ធនឹងបង្រួមស្វ័យប្រវត្តិ ≤ 4MB)។ ស៊ុមត្រូវទាញឲ្យពេញក្រដាស។</p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">មិនទាន់មានស៊ុមទេ</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="frame-list">
          {list.map((f) => (
            <li key={f.id} className="space-y-2 rounded-lg border bg-card p-3" data-testid={`frame-item-${f.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/asset/${f.id}`} alt={f.title} className="h-40 w-full rounded border bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
              <Input value={f.title} maxLength={80} onChange={(e) => setList((l) => l.map((x) => (x.id === f.id ? { ...x, title: e.target.value } : x)))} />
              <Select value={f.orientation} onValueChange={(v) => setList((l) => l.map((x) => (x.id === f.id ? { ...x, orientation: v as FrameItem["orientation"] } : x)))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ORIENT.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <DocChecks docs={f.docs} onChange={(d) => setList((l) => l.map((x) => (x.id === f.id ? { ...x, docs: d } : x)))} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void save(f)} data-testid="frame-save"><Save className="size-4" /> រក្សាទុក</Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                  if (!window.confirm("លុបស៊ុមនេះ? (គំរូដែលបានប្រើស៊ុមនេះនឹងបាត់ស៊ុម)")) return;
                  const r = await deleteAsset(f.id, "frame");
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
