"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type Uploaded = { id: string; url: string; mime: string; meta: Record<string, unknown> };

/** Shrinks big raster images in the browser so they fit Vercel's ~4 MB request limit and load fast. */
async function shrink(file: File, maxDim: number): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (k >= 1 && file.size < 3.5 * 1024 * 1024) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const png = file.type === "image/png";
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, png ? "image/png" : "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, png ? ".png" : ".jpg"), { type: blob.type });
  } catch {
    return file;
  }
}

export async function uploadAsset(file: File, kind: string, extra: Record<string, string> = {}, maxDim = 1800): Promise<Uploaded> {
  const f = kind === "help" ? file : await shrink(file, maxDim);
  if (f.size > 4 * 1024 * 1024) throw new Error("ឯកសារធំពេក (អតិបរមា 4MB)");
  const fd = new FormData();
  fd.set("file", f);
  fd.set("kind", kind);
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "ផ្ទុកឡើងមិនបានទេ");
  return j as Uploaded;
}

/** Single-image slot (logo, favicon…): preview + choose + remove. */
export function ImageSlot({ label, hint, kind, value, onChange, maxDim, testId, square }: {
  label: string; hint?: string; kind: string; value: string | null; onChange: (id: string | null) => void; maxDim?: number; testId?: string; square?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const u = await uploadAsset(file, kind, {}, maxDim);
      onChange(u.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className={`flex ${square ? "size-16" : "h-16 w-28"} shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/asset/${value}`} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()} data-testid={testId}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} ជ្រើសរូប
          </Button>
          {value && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onChange(null)}><Trash2 className="size-4" /></Button>}
        </div>
        <input ref={input} type="file" className="hidden" accept={kind === "favicon" ? "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico" : "image/png,image/jpeg,image/webp,image/svg+xml"} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} data-testid={testId ? `${testId}-file` : undefined} />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
