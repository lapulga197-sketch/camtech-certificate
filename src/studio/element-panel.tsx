"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, ChevronUp, Copy, Image as ImageIcon, Italic, Minus,
  Crop, QrCode, RotateCcw, Trash2, Type, UserSquare2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FONTS, variablesFor, newId, type CertDesign, type DesignElement, type ImageShape, type PhotoCrop, type PhotoFrameRef } from "@/lib/certificate-design";
import { BUILTIN_RINGS } from "@/lib/photo-frames";
import { listPhotoFrames } from "./actions";
import { fileToDataUrl } from "./image-utils";
import { DEFAULT_FX, FX_PRESETS, textFxStyle, type FxPreset, type TextFx } from "@/lib/text-effects";

type SetDesign = (next: CertDesign | ((d: CertDesign) => CertDesign), key?: string) => void;

function Range({ label, value, min, max, step = 1, onChange, suffix = "" }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(value * 100) / 100}{suffix}</span>
      </div>
      <input type="range" className="w-full accent-primary" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function elementLabel(e: DesignElement): string {
  if (e.type === "text") return (e.text ?? "").replace(/\s+/g, " ").slice(0, 28) || "(អត្ថបទទទេ)";
  if (e.type === "image") {
    const byRole: Record<string, string> = { logo: "Logo", emblem: "និមិត្តសញ្ញា", stamp: "ត្រា", signature: "ហត្ថលេខា" };
    return (e.role && byRole[e.role]) || "រូបភាព";
  }
  if (e.type === "photo") return "រូបថតអ្នកទទួល";
  if (e.type === "qr") return "QR ផ្ទៀងផ្ទាត់";
  return "បន្ទាត់";
}

function ElementIcon({ type }: { type: DesignElement["type"] }) {
  const cls = "size-3.5 shrink-0 text-muted-foreground";
  if (type === "text") return <Type className={cls} />;
  if (type === "image") return <ImageIcon className={cls} />;
  if (type === "photo") return <UserSquare2 className={cls} />;
  if (type === "qr") return <QrCode className={cls} />;
  return <Minus className={cls} />;
}

export type PhotoCtl = {
  hasPhoto: boolean;
  cropping: boolean;
  toggleCrop: (id: string) => void;
  value: (el: DesignElement) => PhotoCrop;
  apply: (id: string, patch: Partial<PhotoCrop>) => void;
  reset: (id: string) => void;
  /** Edits apply to the person shown (true) or to everybody (false). */
  perPerson: boolean;
  canScope: boolean;
  cropAll: boolean;
  setCropAll: (v: boolean) => void;
};

export function ElementPanel({
  design, setDesign, selectedId, onSelect, photo,
}: {
  design: CertDesign;
  setDesign: SetDesign;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  photo: PhotoCtl;
}) {
  const [uploadedFrames, setUploadedFrames] = useState<PhotoFrameRef[]>([]);
  const wantsFrames = design.elements.find((e) => e.id === selectedId)?.type === "photo";
  useEffect(() => {
    if (!wantsFrames) return;
    let alive = true;
    void listPhotoFrames().then((f) => alive && setUploadedFrames(f)).catch(() => undefined);
    return () => { alive = false; };
  }, [wantsFrames]);

  const imgInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  function update(id: string, patch: Partial<DesignElement>, key?: string) {
    setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }), key ? `${id}-${key}` : undefined);
  }

  function add(el: DesignElement) {
    setDesign((d) => ({ ...d, elements: [...d.elements, el] }));
    onSelect(el.id);
  }

  async function addImage(file: File | undefined) {
    if (!file) return;
    try {
      const { src, ar } = await fileToDataUrl(file, { max: 1000 });
      add({ id: newId("i"), type: "image", x: 40, y: 40, w: 14, ar, src, shape: "rect" });
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  async function replaceImage(file: File | undefined) {
    if (!file || !selected) return;
    try {
      const { src, ar } = await fileToDataUrl(file, { max: 1000 });
      update(selected.id, { src, ar });
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  function duplicate() {
    if (!selected) return;
    add({ ...selected, id: newId("d"), role: undefined, x: Math.min(95, selected.x + 2), y: Math.min(95, selected.y + 2) });
  }

  function remove() {
    if (!selected) return;
    setDesign((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== selected.id) }));
    onSelect(null);
  }

  function move(dir: 1 | -1) {
    if (!selected) return;
    setDesign((d) => {
      const i = d.elements.findIndex((e) => e.id === selected.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.elements.length) return d;
      const els = [...d.elements];
      [els[i], els[j]] = [els[j], els[i]];
      return { ...d, elements: els };
    });
  }

  function insertVariable(key: string) {
    if (!selected || selected.type !== "text") return;
    const ta = textRef.current;
    const cur = selected.text ?? "";
    const token = `{${key}}`;
    if (ta) {
      const s = ta.selectionStart ?? cur.length;
      const e = ta.selectionEnd ?? cur.length;
      update(selected.id, { text: cur.slice(0, s) + token + cur.slice(e) });
    } else update(selected.id, { text: cur + token });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">បន្ថែមធាតុ</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" data-testid="add-text"
            onClick={() => add({ id: newId("t"), type: "text", x: 25, y: 45, w: 50, text: "អត្ថបទថ្មី", fontFamily: "Hanuman", fontSize: 16, color: "#222222", align: "center", lineHeight: 1.4 })}>
            <Type className="size-4" /> អត្ថបទ
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => imgInput.current?.click()} data-testid="add-image">
            <ImageIcon className="size-4" /> រូបភាព / Logo / ហត្ថលេខា
          </Button>
          <Button type="button" variant="outline" size="sm" data-testid="add-photo"
            onClick={() => add(design.doc === "greeting"
              ? { id: newId("p"), type: "photo", ...(design.orientation === "portrait" ? { x: 33, y: 30, w: 34 } : { x: 76, y: 24, w: 17 }), ar: 0.8, shape: "oval", pframe: { id: "b:gold", title: "មាសរលោង" }, fit: "fill", zoom: 1, px: 50, py: 10 }
              : { id: newId("p"), type: "photo", x: 8, y: 40, w: 12, ar: 0.75, shape: "rect", borderColor: "#b8860b", borderWidth: 3, fit: "fill", zoom: 1, px: 50, py: 0 })}>
            <UserSquare2 className="size-4" /> រូបថតអ្នកទទួល
          </Button>
          <Button type="button" variant="outline" size="sm"
            onClick={() => add({ id: newId("q"), type: "qr", x: 85, y: 78, w: 9, ar: 1 })}>
            <QrCode className="size-4" /> QR
          </Button>
          <Button type="button" variant="outline" size="sm" className="col-span-2"
            onClick={() => add({ id: newId("l"), type: "line", x: 30, y: 60, w: 40, color: "#444444", thickness: 1.5 })}>
            <Minus className="size-4" /> បន្ទាត់
          </Button>
        </div>
        <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void addImage(e.target.files?.[0]); e.target.value = ""; }} data-testid="add-image-file" />
        <input ref={replaceInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void replaceImage(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">បញ្ជីធាតុ</h4>
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
          {[...design.elements].reverse().map((e) => (
            <li key={e.id}>
              <button
                type="button"
                data-testid={`el-${e.id}`}
                onClick={() => onSelect(e.id)}
                className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted", e.id === selectedId && "bg-primary/10 font-medium text-primary")}
              >
                <ElementIcon type={e.type} />
                <span className="truncate">{elementLabel(e)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!selected ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">ចុចលើធាតុក្នុងក្រដាស ដើម្បីកែសម្រួល (អូសដើម្បីរំកិល, ចុចចំណុចខៀវខាងស្តាំដើម្បីប្តូរទទឹង)</p>
      ) : (
        <div className="space-y-3 rounded-md border p-3" data-testid="props">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{elementLabel(selected)}</h4>
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="ghost" className="size-7" title="ទៅមុខ" onClick={() => move(1)}><ChevronUp className="size-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-7" title="ទៅក្រោយ" onClick={() => move(-1)}><ChevronDown className="size-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-7" title="ចម្លង" onClick={duplicate}><Copy className="size-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" title="លុប" onClick={remove} data-testid="el-delete"><Trash2 className="size-4" /></Button>
            </div>
          </div>

          {selected.type === "text" && (
            <>
              <Textarea ref={textRef} rows={3} value={selected.text ?? ""} onChange={(e) => update(selected.id, { text: e.target.value }, "text")} data-testid="el-text" />
              <div className="flex flex-wrap gap-1">
                {variablesFor(design.doc).map((v) => (
                  <button key={v.key} type="button" title={v.label} onClick={() => insertVariable(v.key)}
                    className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted">
                    {`{${v.key}}`}
                  </button>
                ))}
              </div>
              <Select value={selected.fontFamily ?? "Hanuman"} onValueChange={(v) => update(selected.id, { fontFamily: v as DesignElement["fontFamily"] })}>
                <SelectTrigger className="w-full" data-testid="el-font"><SelectValue /></SelectTrigger>
                <SelectContent>{FONTS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-[1fr_80px] items-end gap-2">
                <Range label="ទំហំអក្សរ" value={selected.fontSize ?? 14} min={6} max={90} step={0.5} suffix=" pt" onChange={(v) => update(selected.id, { fontSize: v }, "size")} />
                <Input type="number" value={selected.fontSize ?? 14} min={4} max={200} step={0.5} onChange={(e) => update(selected.id, { fontSize: Number(e.target.value) || 14 }, "size")} data-testid="el-size" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="color" value={selected.color ?? "#000000"} onChange={(e) => update(selected.id, { color: e.target.value, ck: undefined }, "color")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" data-testid="el-color" />
                {([
                  ["bold", Bold], ["italic", Italic],
                ] as const).map(([k, Icon]) => (
                  <Button key={k} type="button" size="icon" variant={selected[k] ? "default" : "outline"} className="size-8" onClick={() => update(selected.id, { [k]: !selected[k] })}><Icon className="size-4" /></Button>
                ))}
                {([
                  ["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight],
                ] as const).map(([a, Icon]) => (
                  <Button key={a} type="button" size="icon" variant={(selected.align ?? "center") === a ? "default" : "outline"} className="size-8" onClick={() => update(selected.id, { align: a })}><Icon className="size-4" /></Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={selected.hlColor ?? selected.color ?? "#000000"} onChange={(e) => update(selected.id, { hlColor: e.target.value, hlCk: undefined }, "hl")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                <p className="text-xs text-muted-foreground">ពណ៌ពាក្យក្នុង <code>{"[[ ]]"}</code> (អក្សរដិត)</p>
              </div>
              <Range label="គម្លាតបន្ទាត់" value={selected.lineHeight ?? 1.4} min={0.9} max={3} step={0.05} onChange={(v) => update(selected.id, { lineHeight: v }, "lh")} />
              <Range label="គម្លាតអក្សរ" value={selected.letterSpacing ?? 0} min={0} max={20} step={0.5} suffix=" px" onChange={(v) => update(selected.id, { letterSpacing: v }, "ls")} />

              <div className="space-y-2 border-t pt-3" data-testid="fx-section">
                <h5 className="text-sm font-semibold">ឥទ្ធិពលអក្សរ (3D / ស្រមោល / ពណ៌)</h5>
                <div className="grid grid-cols-3 gap-1.5">
                  {FX_PRESETS.map((p) => {
                    const active = (selected.fx?.preset ?? "none") === p.id;
                    const fx: TextFx = { ...DEFAULT_FX, ...p.sample, preset: p.id };
                    return (
                      <button
                        key={p.id} type="button" data-testid={`fx-${p.id}`} title={p.label}
                        onClick={() => update(selected.id, { fx: p.id === "none" ? undefined : { ...DEFAULT_FX, ...p.sample, preset: p.id as FxPreset } })}
                        className={cn("flex h-14 flex-col items-center justify-center overflow-hidden rounded-md border bg-slate-100 text-center leading-tight hover:shadow", active && "ring-2 ring-primary")}
                      >
                        <span style={{ fontFamily: "'Hanuman', serif", fontSize: 17, fontWeight: 700, color: p.sampleColor ?? "#1f2937", ...textFxStyle(p.id === "none" ? undefined : { ...fx, size: Math.min(fx.size, 6) }) }}>កខ Aa</span>
                        <span className="text-[10px] text-slate-600">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selected.fx && selected.fx.preset !== "none" && (() => {
                  const fx = selected.fx!;
                  const needs = FX_PRESETS.find((p) => p.id === fx.preset)?.needs ?? [];
                  const set = (patch: Partial<TextFx>, key: string) => update(selected.id, { fx: { ...fx, ...patch } }, key);
                  const label1 = fx.preset.startsWith("gradient") ? "ពណ៌ចាប់ផ្តើម" : fx.preset === "emboss" ? "ពណ៌ពន្លឺ" : "ពណ៌ឥទ្ធិពល";
                  const label2 = fx.preset.startsWith("gradient") ? "ពណ៌បញ្ចប់" : fx.preset === "emboss" ? "ពណ៌ស្រមោល" : "ពណ៌ទី ២";
                  return (
                    <div className="space-y-2 rounded-md bg-muted/40 p-2">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {needs.includes("c1") && (
                          <label className="flex items-center gap-1.5">
                            <input type="color" value={fx.c1.slice(0, 7)} onChange={(e) => set({ c1: e.target.value }, "fxc1")} className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5" data-testid="fx-c1" /> {label1}
                          </label>
                        )}
                        {needs.includes("c2") && (
                          <label className="flex items-center gap-1.5">
                            <input type="color" value={fx.c2.slice(0, 7)} onChange={(e) => set({ c2: e.target.value }, "fxc2")} className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5" data-testid="fx-c2" /> {label2}
                          </label>
                        )}
                      </div>
                      {needs.includes("size") && <Range label={fx.preset.startsWith("3d") || fx.preset.includes("3d") || fx.preset === "long-shadow" ? "ជម្រៅ" : "កម្លាំង"} value={fx.size} min={1} max={24} onChange={(v) => set({ size: v }, "fxs")} suffix=" px" />}
                      {needs.includes("angle") && <Range label="ទិស" value={fx.angle} min={0} max={360} step={5} onChange={(v) => set({ angle: v }, "fxa")} suffix="°" />}
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {(selected.type === "image" || selected.type === "photo") && (
            <>
              {selected.type === "image" && (
                <Button type="button" variant="outline" size="sm" onClick={() => replaceInput.current?.click()}>
                  <ImageIcon className="size-4" /> ប្តូររូបភាព
                </Button>
              )}
              {!(selected.type === "photo" && selected.pframe && !selected.pframe.id.startsWith("b:")) && (
              <div className="space-y-1">
                <Label className="text-xs">ទម្រង់</Label>
                <Select value={selected.shape ?? "rect"} onValueChange={(v) => update(selected.id, { shape: v as ImageShape })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rect">ចតុកោណកែង</SelectItem>
                    <SelectItem value="rounded">ជ្រុងមូល</SelectItem>
                    <SelectItem value="oval">អូវ៉ាល់</SelectItem>
                    <SelectItem value="circle">រង្វង់</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              )}
              {selected.type === "photo" && (() => {
                const el = selected;
                const pf = el.pframe;
                const uploaded = !!pf && !pf.id.startsWith("b:");
                const crop = photo.value(el);
                const pick = (f: PhotoFrameRef | null) => {
                  if (!f) return update(el.id, { pframe: undefined });
                  if (f.id.startsWith("b:")) return update(el.id, { pframe: f });
                  update(el.id, { pframe: f, ar: f.ar, borderWidth: 0 });
                };
                return (
                  <>
                    <div className="space-y-1.5 border-t pt-3" data-testid="pframe-section">
                      <h5 className="text-sm font-semibold">ស៊ុមរូបថត</h5>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button type="button" data-testid="pf-none" title="គ្មានស៊ុម" onClick={() => pick(null)}
                          className={cn("flex h-14 items-center justify-center rounded-md border bg-slate-50 text-[10px] text-slate-600 hover:shadow", !pf && "ring-2 ring-primary")}>គ្មាន</button>
                        {BUILTIN_RINGS.map((r) => (
                          <button key={r.id} type="button" data-testid={`pf-${r.id}`} title={r.title} onClick={() => pick({ id: r.id, title: r.title })}
                            className={cn("flex h-14 items-center justify-center rounded-md border bg-slate-50 hover:shadow", pf?.id === r.id && "ring-2 ring-primary")}>
                            <span className="block size-9 rounded-full" style={{ background: r.bg, boxShadow: `inset 0 0 0 5px transparent, 0 0 0 1px ${r.inner}` }}>
                              <span className="m-1.5 block size-6 rounded-full bg-sky-200" style={{ boxShadow: `0 0 0 1.5px ${r.inner}` }} />
                            </span>
                          </button>
                        ))}
                        {uploadedFrames.map((f) => (
                          <button key={f.id} type="button" data-testid={`pf-${f.id}`} title={f.title} onClick={() => pick(f)}
                            className={cn("flex h-14 items-center justify-center overflow-hidden rounded-md border bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:10px_10px] hover:shadow", pf?.id === f.id && "ring-2 ring-primary")}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/asset/${f.id}`} alt={f.title} className="max-h-full max-w-full object-contain" />
                          </button>
                        ))}
                      </div>
                      {uploadedFrames.length === 0 && <p className="text-[11px] text-muted-foreground">អេដមីនអាចបន្ថែមស៊ុមរូបថតផ្ទាល់ខ្លួនក្នុង «គ្រប់គ្រង → ស៊ុម»</p>}
                    </div>

                    {!uploaded && (
                      <Range label="សមាមាត្រ (ទទឹង/កម្ពស់)" value={el.ar ?? 0.75} min={0.5} max={1.5} step={0.05} onChange={(v) => update(el.id, { ar: v }, "ar")} />
                    )}
                    {!pf && (
                      <div className="flex items-center gap-2">
                        <input type="color" value={el.borderColor ?? "#000000"} onChange={(e) => update(el.id, { borderColor: e.target.value }, "bcolor")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                        <div className="flex-1"><Range label="កម្រាស់ស៊ុម" value={el.borderWidth ?? 0} min={0} max={12} onChange={(v) => update(el.id, { borderWidth: v }, "bwidth")} suffix=" px" /></div>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-3" data-testid="crop-section">
                      <h5 className="text-sm font-semibold">ការដាក់រូប (Fill / Fit / Crop)</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {([["fill", "Fill — ពេញស៊ុម"], ["fit", "Fit — ឃើញទាំងរូប"]] as const).map(([k, label]) => (
                          <Button key={k} type="button" size="sm" variant={crop.fit === k ? "default" : "outline"} data-testid={`crop-${k}`} onClick={() => photo.apply(el.id, { fit: k })}>{label}</Button>
                        ))}
                      </div>
                      {crop.fit === "fit" && (
                        <div className="flex items-center gap-2 text-xs">
                          <input type="color" value={el.fitBg ?? "#ffffff"} onChange={(e) => update(el.id, { fitBg: e.target.value }, "fitbg")} className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5" /> ពណ៌ផ្ទៃក្រោយរូប
                        </div>
                      )}
                      <Range label="ពង្រីករូប (Zoom)" value={crop.zoom} min={1} max={4} step={0.05} suffix="×" onChange={(v) => photo.apply(el.id, { zoom: Math.round(v * 100) / 100 })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Range label="រំកិលឆ្វេង-ស្តាំ" value={crop.px} min={0} max={100} onChange={(v) => photo.apply(el.id, { px: v })} />
                        <Range label="រំកិលលើ-ក្រោម" value={crop.py} min={0} max={100} onChange={(v) => photo.apply(el.id, { py: v })} />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant={photo.cropping ? "default" : "outline"} className="flex-1" disabled={!photo.hasPhoto} data-testid="crop-toggle" onClick={() => photo.toggleCrop(el.id)}>
                          <Crop className="size-4" /> {photo.cropping ? "បញ្ចប់ការកាត់" : "អូសកាត់រូប"}
                        </Button>
                        <Button type="button" size="icon" variant="outline" className="size-8" title="កំណត់ឡើងវិញ" data-testid="crop-reset" onClick={() => photo.reset(el.id)}><RotateCcw className="size-4" /></Button>
                      </div>
                      {photo.cropping && <p className="rounded bg-pink-50 px-2 py-1 text-xs text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">អូសលើរូបក្នុងក្រដាស ដើម្បីរំកិលរូបឲ្យត្រូវស៊ុម ហើយប្រើ Zoom ដើម្បីពង្រីក។</p>}
                      {!photo.hasPhoto && <p className="text-xs text-muted-foreground">បន្ថែមរូបថតអ្នកទទួលសិន (ផ្ទាំង «អ្នកទទួល») ទើបអាចអូសកាត់បាន។</p>}
                      {photo.canScope && (
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={photo.cropAll} onChange={(e) => photo.setCropAll(e.target.checked)} data-testid="crop-all" />
                          អនុវត្តការកាត់ទៅអ្នកទទួលទាំងអស់ {photo.perPerson && <span className="text-muted-foreground">(ឥឡូវនេះ៖ តែអ្នកនេះ)</span>}
                        </label>
                      )}
                    </div>
                  </>
                );
              })()}
              {selected.type === "image" && (
                <div className="flex items-center gap-2">
                  <input type="color" value={selected.borderColor ?? "#000000"} onChange={(e) => update(selected.id, { borderColor: e.target.value }, "bcolor")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                  <div className="flex-1"><Range label="កម្រាស់ស៊ុម" value={selected.borderWidth ?? 0} min={0} max={12} onChange={(v) => update(selected.id, { borderWidth: v }, "bwidth")} suffix=" px" /></div>
                </div>
              )}
            </>
          )}

          {selected.type === "line" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="color" value={selected.color ?? "#000000"} onChange={(e) => update(selected.id, { color: e.target.value }, "color")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                <div className="flex-1"><Range label="កម្រាស់" value={selected.thickness ?? 1} min={0.5} max={12} step={0.5} suffix=" px" onChange={(v) => update(selected.id, { thickness: v }, "thick")} /></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {([["x", "X %"], ["y", "Y %"], ["w", "ទទឹង %"]] as const).map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type="number" step={0.5} value={Math.round(selected[k] * 10) / 10} onChange={(e) => update(selected.id, { [k]: Number(e.target.value) || 0 }, k)} data-testid={`el-${k}`} />
              </div>
            ))}
          </div>
          <Range label="ភាពច្បាស់" value={selected.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => update(selected.id, { opacity: v }, "op")} />
          <Range label="រង្វិល" value={selected.rotate ?? 0} min={-180} max={180} onChange={(v) => update(selected.id, { rotate: v }, "rot")} suffix="°" />
        </div>
      )}
    </div>
  );
}
