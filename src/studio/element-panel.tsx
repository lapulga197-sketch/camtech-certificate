"use client";

import { useRef } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, ChevronUp, Copy, Image as ImageIcon, Italic, Minus,
  QrCode, Trash2, Type, UserSquare2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FONTS, variablesFor, newId, type CertDesign, type DesignElement, type ImageShape } from "@/lib/certificate-design";
import { fileToDataUrl } from "./image-utils";

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

export function ElementPanel({
  design, setDesign, selectedId, onSelect,
}: {
  design: CertDesign;
  setDesign: SetDesign;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
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
            onClick={() => add({ id: newId("p"), type: "photo", x: 8, y: 40, w: 12, ar: 0.75, shape: "rect", borderColor: "#b8860b", borderWidth: 3 })}>
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
            </>
          )}

          {(selected.type === "image" || selected.type === "photo") && (
            <>
              {selected.type === "image" && (
                <Button type="button" variant="outline" size="sm" onClick={() => replaceInput.current?.click()}>
                  <ImageIcon className="size-4" /> ប្តូររូបភាព
                </Button>
              )}
              <div className="space-y-1">
                <Label className="text-xs">ទម្រង់</Label>
                <Select value={selected.shape ?? "rect"} onValueChange={(v) => update(selected.id, { shape: v as ImageShape })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rect">ចតុកោណកែង</SelectItem>
                    <SelectItem value="rounded">ជ្រុងមូល</SelectItem>
                    <SelectItem value="circle">រង្វង់</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selected.type === "photo" && (
                <Range label="សមាមាត្រ (ទទឹង/កម្ពស់)" value={selected.ar ?? 0.75} min={0.5} max={1.5} step={0.05} onChange={(v) => update(selected.id, { ar: v }, "ar")} />
              )}
              <div className="flex items-center gap-2">
                <input type="color" value={selected.borderColor ?? "#000000"} onChange={(e) => update(selected.id, { borderColor: e.target.value }, "bcolor")} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                <div className="flex-1"><Range label="កម្រាស់ស៊ុម" value={selected.borderWidth ?? 0} min={0} max={12} onChange={(v) => update(selected.id, { borderWidth: v }, "bwidth")} suffix=" px" /></div>
              </div>
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
