"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, PenLine, RectangleHorizontal, RectangleVertical, RotateCcw, Save, Share2, Stamp, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FONTS, PAPERS, THEMES, applyTheme, newId, pageSizeMm, rebuildLayout, relayout, scaleFonts,
  type BorderStyle, type CertDesign, type LangMode, type Org, type PaperKey,
} from "@/lib/certificate-design";
import { deleteTemplate, loadTemplate, saveTemplate, setTemplateShared, type TemplateRow } from "./actions";
import { DOC_TYPES } from "@/lib/doc-types";
import { fileToDataUrl, fileToTransparentPng } from "./image-utils";

type SetDesign = (next: CertDesign | ((d: CertDesign) => CertDesign), key?: string) => void;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b pb-4 last:border-b-0">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </div>
  );
}

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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}

/** Upload slot for the stamp (ត្រា) or the hand signature (ហត្ថលេខា): sets the image of the element with that role. */
function ImageSlot({
  role, label, icon, design, setDesign,
}: {
  role: "stamp" | "signature";
  label: string;
  icon: React.ReactNode;
  design: CertDesign;
  setDesign: SetDesign;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [knock, setKnock] = useState(true);
  const el = design.elements.find((e) => e.role === role);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      const { src, ar } = knock ? await fileToTransparentPng(file) : await fileToDataUrl(file, { max: 900 });
      setDesign((d) => {
        const cur = d.elements.find((e) => e.role === role);
        if (cur) return { ...d, elements: d.elements.map((e) => (e === cur ? { ...e, src, ar } : e)) };
        const fresh = { id: newId("i"), type: "image" as const, role, x: role === "stamp" ? 72 : 60, y: 70, w: role === "stamp" ? 11 : 14, ar, src, label, shape: "rect" as const };
        return { ...d, elements: [...d.elements, fresh] };
      });
      toast.success(`បានដាក់${label}`);
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  function patch(p: Partial<NonNullable<typeof el>>, key: string) {
    setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.role === role ? { ...e, ...p } : e)) }), `${role}-${key}`);
  }

  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <div className="flex items-center gap-2">
        <span
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]"
          data-testid={`${role}-preview`}
        >
          {el?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={el.src} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-muted-foreground">{icon}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} data-testid={`${role}-file`} />
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => input.current?.click()}>
              <ImagePlus className="size-3.5" /> {el?.src ? "ប្តូររូប" : "ដាក់រូប"}
            </Button>
            {el?.src && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => patch({ src: undefined }, "rm")}>
                <X className="size-3.5" /> ដកចេញ
              </Button>
            )}
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox checked={knock} onCheckedChange={(v) => setKnock(v === true)} /> ដកផ្ទៃពណ៌សចេញ (សម្រាប់រូបស្កេន/ថត)
      </label>
      {el?.src && (
        <>
          <Range label="ទំហំ (ទទឹង)" value={el.w} min={4} max={40} step={0.5} suffix="%" onChange={(v) => patch({ w: v }, "w")} />
          <Range label="ភាពច្បាស់" value={el.opacity ?? 1} min={0.2} max={1} step={0.05} onChange={(v) => patch({ opacity: v }, "op")} />
        </>
      )}
      <p className="text-[11px] text-muted-foreground">អូសលើក្រដាសដើម្បីរំកិលទីតាំង។ រូបទទេនឹងមិនបង្ហាញពេលព្រីន/ទាញយកទេ។</p>
    </div>
  );
}

export function DesignPanel({
  design, setDesign, org, templates, setTemplates, isAdmin, onReset, onLoadDesign,
}: {
  design: CertDesign;
  setDesign: SetDesign;
  org: Org;
  templates: TemplateRow[];
  setTemplates: (t: TemplateRow[]) => void;
  isAdmin: boolean;
  onReset: () => void;
  onLoadDesign: (config: string) => boolean;
}) {
  const bgInput = useRef<HTMLInputElement>(null);
  const wmInput = useRef<HTMLInputElement>(null);
  const [tplName, setTplName] = useState("");
  const [busy, setBusy] = useState(false);
  const mm = pageSizeMm(design);
  const cfg = DOC_TYPES[design.doc ?? "certificate"];

  async function pickBg(file: File | undefined) {
    if (!file) return;
    try {
      const { src } = await fileToDataUrl(file, { max: 2200, quality: 0.86, forceJpeg: true });
      setDesign((d) => ({ ...d, bgImage: src }));
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  async function pickWatermark(file: File | undefined) {
    if (!file) return;
    try {
      const { src } = await fileToDataUrl(file, { max: 900 });
      setDesign((d) => ({ ...d, watermark: { ...d.watermark, enabled: true, type: "image", image: src } }));
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  function setPaper(paper: PaperKey) {
    setDesign((d) => {
      const before = pageSizeMm(d).w;
      const next = { ...d, paper };
      const after = pageSizeMm(next).w;
      return { ...next, elements: scaleFonts(d.elements, after / before) };
    });
  }

  function setCustom(dim: "customW" | "customH", v: number) {
    const value = Math.max(50, Math.min(1000, v || 0));
    setDesign((d) => ({ ...d, [dim]: value }), `custom-${dim}`);
  }

  async function save(asNew: boolean, existingId?: string) {
    const name = tplName.trim() || templates.find((t) => t.id === existingId)?.name || "";
    if (!name) {
      toast.error("សូមបញ្ចូលឈ្មោះគំរូ");
      return;
    }
    setBusy(true);
    const r = await saveTemplate(asNew ? null : existingId ?? null, design.doc ?? "certificate", name, JSON.stringify(design));
    setBusy(false);
    if (!r.success || !r.template) {
      toast.error(r.message || "មានបញ្ហាកើតឡើង");
      return;
    }
    const row = r.template;
    setTemplates([row, ...templates.filter((t) => t.id !== row.id)]);
    setTplName("");
    toast.success("បានរក្សាទុកគំរូ");
  }

  async function open(id: string) {
    setBusy(true);
    const r = await loadTemplate(id);
    setBusy(false);
    if (!r.success || !r.config) {
      toast.error(r.message || "មានបញ្ហាកើតឡើង");
      return;
    }
    if (!onLoadDesign(r.config)) toast.error("ទម្រង់គំរូមិនត្រឹមត្រូវ");
    else toast.success("បានបើកគំរូ");
  }

  async function share(t: TemplateRow) {
    const r = await setTemplateShared(t.id, !t.shared);
    if (!r.success) toast.error(r.message || "មានបញ្ហាកើតឡើង");
    else setTemplates(templates.map((x) => (x.id === t.id ? { ...x, shared: !t.shared } : x)));
  }

  async function remove(id: string) {
    if (!window.confirm("លុបគំរូនេះ?")) return;
    const r = await deleteTemplate(id);
    if (!r.success) toast.error(r.message || "មានបញ្ហាកើតឡើង");
    else setTemplates(templates.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-4">
      <Section title={`ភាសា និងទម្រង់${cfg.label}`}>
        <div className="grid grid-cols-3 gap-2" data-testid="lang-modes">
          {([["km", "ខ្មែរសុទ្ធ"], ["en", "អង់គ្លេសសុទ្ធ"], ["mix", "ខ្មែរ + អង់គ្លេស"]] as [LangMode, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              data-testid={`lang-${k}`}
              onClick={() => setDesign((d) => (d.langMode === k ? d : rebuildLayout(d, { lang: k }, org)))}
              className={cn("rounded-md border px-2 py-2 text-xs", design.langMode === k ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}
            >
              {label}
            </button>
          ))}
        </div>
        {cfg.layouts.length > 1 && (
          <div className={cn("grid gap-2", cfg.layouts.length === 2 ? "grid-cols-2" : "grid-cols-1")} data-testid="layout-kinds">
            {cfg.layouts.map(({ key: k, label, hint }) => (
              <button
                key={k}
                type="button"
                data-testid={`layout-${k}`}
                onClick={() =>
                  setDesign((d) => {
                    if (d.layout === k) return d;
                    const next = rebuildLayout(d, { layout: k }, org);
                    return k === "ministry" ? { ...(d.themeId !== "ministry-blue" ? applyTheme(next, "ministry-blue") : next), dateStyle: "khNum" } : next;
                  })
                }
                className={cn("rounded-md border px-2 py-2 text-left text-xs", design.layout === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
              >
                <span className="block font-medium">{label}</span>
                <span className="block text-[11px] text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          ប្តូរភាសា/ទម្រង់នឹងរៀបធាតុឡើងវិញ — អត្ថបទដែលអ្នកបានកែ និងរូបដែលបានដាក់ (Logo, ត្រា, ហត្ថលេខា) នៅរក្សា។ ក្នុងអត្ថបទ អាចប្រើ <code>{"[[ពាក្យ]]"}</code> ដើម្បីធ្វើអក្សរដិត/ពណ៌សង្កត់។
        </p>
      </Section>

      <Section title="ម៉ូតសំខាន់ៗ (Themes)">
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`theme-${t.id}`}
              onClick={() => setDesign((d) => applyTheme(d, t.id))}
              className={cn("overflow-hidden rounded-md border text-left text-xs transition hover:shadow", design.themeId === t.id && "ring-2 ring-primary")}
            >
              <div className="relative h-14" style={{ background: t.bgGradient ?? t.bgColor }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${t.primary} 0 18%, transparent 18% 82%, ${t.accent} 82% 100%)`, opacity: t.decor === "none" ? 0.15 : 0.85 }} />
                <div className="absolute inset-2 rounded-sm" style={{ border: t.border.style === "none" ? "none" : `1.5px solid ${t.border.color}` }} />
              </div>
              <div className="px-2 py-1 font-medium">{t.label}</div>
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between text-sm">
          <span>បង្ហាញតុបតែងតាមធីម</span>
          <Switch checked={design.showDecor} onCheckedChange={(v) => setDesign((d) => ({ ...d, showDecor: v }))} />
        </label>
      </Section>

      <Section title="ក្រដាស">
        {cfg.orientations.length > 1 ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="orient-landscape"
              onClick={() => setDesign((d) => (d.orientation === "landscape" ? d : relayout(d, "landscape", org)))}
              className={cn("flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm", design.orientation === "landscape" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
            >
              <RectangleHorizontal className="size-4" /> ផ្ដេក
            </button>
            <button
              type="button"
              data-testid="orient-portrait"
              onClick={() => setDesign((d) => (d.orientation === "portrait" ? d : relayout(d, "portrait", org)))}
              className={cn("flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm", design.orientation === "portrait" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
            >
              <RectangleVertical className="size-4" /> បញ្ឈរ
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><RectangleVertical className="size-4" /> បញ្ឈរ (ទម្រង់លិខិត)</p>
        )}
        <p className="text-xs text-muted-foreground">ប្តូរទិសនឹងរៀបទីតាំងធាតុឡើងវិញ (អត្ថបទ និងពណ៌ដែលបានកែ នៅរក្សា)។</p>
        <Select value={design.paper} onValueChange={(v) => setPaper(v as PaperKey)}>
          <SelectTrigger className="w-full" data-testid="paper-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PAPERS) as PaperKey[]).map((k) => (
              <SelectItem key={k} value={k}>{PAPERS[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {design.paper === "CUSTOM" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">ទទឹង (mm)</Label>
              <Input type="number" value={design.customW} onChange={(e) => setCustom("customW", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">កម្ពស់ (mm)</Label>
              <Input type="number" value={design.customH} onChange={(e) => setCustom("customH", Number(e.target.value))} />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">ទំហំបច្ចុប្បន្ន៖ {Math.round(mm.w)} × {Math.round(mm.h)} mm</p>
      </Section>

      <Section title="ផ្ទៃខាងក្រោយ">
        <div className="flex flex-wrap items-center gap-3">
          <ColorField label="ពណ៌ផ្ទៃ" value={design.bgColor} onChange={(v) => setDesign((d) => ({ ...d, bgColor: v }), "bgColor")} />
        </div>
        <input ref={bgInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickBg(e.target.files?.[0]); e.target.value = ""; }} data-testid="bg-file" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => bgInput.current?.click()}>
            <ImagePlus className="size-4" /> {design.bgImage ? "ប្តូររូបផ្ទៃ" : "ដាក់រូបផ្ទៃពីក្រៅ"}
          </Button>
          {design.bgImage && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDesign((d) => ({ ...d, bgImage: undefined }))}>
              <X className="size-4" /> ដកចេញ
            </Button>
          )}
        </div>
        {design.bgImage && (
          <>
            <Select value={design.bgFit} onValueChange={(v) => setDesign((d) => ({ ...d, bgFit: v as CertDesign["bgFit"] }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">ពេញក្រដាស (កាត់គែម)</SelectItem>
                <SelectItem value="stretch">ទាញឲ្យត្រូវក្រដាស</SelectItem>
                <SelectItem value="contain">ទាំងមូល (មិនកាត់)</SelectItem>
              </SelectContent>
            </Select>
            <Range label="ភាពច្បាស់នៃរូបផ្ទៃ" value={design.bgImageOpacity} min={0.05} max={1} step={0.05} onChange={(v) => setDesign((d) => ({ ...d, bgImageOpacity: v }), "bgop")} />
          </>
        )}
      </Section>

      <Section title="ស៊ុម (Border)">
        <Select value={design.border.style} onValueChange={(v) => setDesign((d) => ({ ...d, border: { ...d.border, style: v as BorderStyle } }))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">គ្មានស៊ុម</SelectItem>
            <SelectItem value="single">ស៊ុមតែមួយ</SelectItem>
            <SelectItem value="double">ស៊ុមពីរជាន់</SelectItem>
            <SelectItem value="thick-thin">ក្រាស់ + ស្តើង</SelectItem>
            <SelectItem value="ornate">ស៊ុមលម្អ (ដូចសញ្ញាបត្រ)</SelectItem>
          </SelectContent>
        </Select>
        {design.border.style !== "none" && (
          <>
            <div className="flex flex-wrap gap-3">
              <ColorField label="ពណ៌ស៊ុម" value={design.border.color} onChange={(v) => setDesign((d) => ({ ...d, border: { ...d.border, color: v } }), "bc1")} />
              <ColorField label="ពណ៌ទី២" value={design.border.color2} onChange={(v) => setDesign((d) => ({ ...d, border: { ...d.border, color2: v } }), "bc2")} />
            </div>
            <Range label="កម្រាស់" value={design.border.widthMm} min={0.3} max={4} step={0.1} suffix=" mm" onChange={(v) => setDesign((d) => ({ ...d, border: { ...d.border, widthMm: v } }), "bw")} />
            <Range label="គម្លាតពីគែម" value={design.border.insetMm} min={0} max={30} step={0.5} suffix=" mm" onChange={(v) => setDesign((d) => ({ ...d, border: { ...d.border, insetMm: v } }), "bi")} />
          </>
        )}
      </Section>

      <Section title="Watermark">
        <label className="flex items-center justify-between text-sm">
          <span>បើក watermark</span>
          <Switch checked={design.watermark.enabled} onCheckedChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, enabled: v } }))} data-testid="wm-switch" />
        </label>
        {design.watermark.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["text", "image"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setDesign((d) => ({ ...d, watermark: { ...d.watermark, type: t } }))}
                  className={cn("rounded-md border px-3 py-1.5 text-sm", design.watermark.type === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                  {t === "text" ? "អក្សរ" : "រូបភាព / Logo"}
                </button>
              ))}
            </div>
            {design.watermark.type === "text" ? (
              <>
                <Input value={design.watermark.text} onChange={(e) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, text: e.target.value } }), "wmtext")} placeholder="អត្ថបទ watermark" data-testid="wm-text" />
                <Select value={design.watermark.fontFamily} onValueChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, fontFamily: v as CertDesign["watermark"]["fontFamily"] } }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
                <ColorField label="ពណ៌" value={design.watermark.color} onChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, color: v } }), "wmcolor")} />
              </>
            ) : (
              <>
                <input ref={wmInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickWatermark(e.target.files?.[0]); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" onClick={() => wmInput.current?.click()}>
                  <Upload className="size-4" /> {design.watermark.image ? "ប្តូររូប watermark" : "ជ្រើសរូប watermark"}
                </Button>
              </>
            )}
            <Range label="ទំហំ" value={design.watermark.sizePct} min={design.watermark.type === "text" ? 2 : 10} max={design.watermark.type === "text" ? 20 : 100} onChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, sizePct: v } }), "wmsize")} suffix="%" />
            <Range label="ភាពច្បាស់" value={design.watermark.opacity} min={0.02} max={0.5} step={0.01} onChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, opacity: v } }), "wmop")} />
            <Range label="ទិសរង្វិល" value={design.watermark.rotate} min={-90} max={90} onChange={(v) => setDesign((d) => ({ ...d, watermark: { ...d.watermark, rotate: v } }), "wmrot")} suffix="°" />
          </>
        )}
      </Section>

      <Section title="ត្រា និងហត្ថលេខា">
        <ImageSlot role="stamp" label="ត្រា (Stamp)" icon={<Stamp className="size-6" />} design={design} setDesign={setDesign} />
        <ImageSlot role="signature" label="ហត្ថលេខា / ស៊ីញ៉េ (Signature)" icon={<PenLine className="size-6" />} design={design} setDesign={setDesign} />
      </Section>

      <Section title="ទម្រង់កាលបរិច្ឆេទ">
        <Select value={design.dateStyle} onValueChange={(v) => setDesign((d) => ({ ...d, dateStyle: v as CertDesign["dateStyle"] }))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kh">ថ្ងៃទី 08 ខែ កញ្ញា ឆ្នាំ 2026</SelectItem>
            <SelectItem value="khNum">ថ្ងៃទី ០៨ ខែ កញ្ញា ឆ្នាំ ២០២៦ (លេខខ្មែរ)</SelectItem>
            <SelectItem value="en">September 8, 2026</SelectItem>
            <SelectItem value="iso">08/09/2026</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="គំរូដែលបានរក្សាទុក">
        <div className="flex gap-2">
          <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="ឈ្មោះគំរូថ្មី" data-testid="tpl-name" />
          <Button type="button" size="sm" onClick={() => save(true)} disabled={busy} data-testid="tpl-save">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} រក្សា
          </Button>
        </div>
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">មិនទាន់មានគំរូទេ</p>
        ) : (
          <ul className="space-y-1.5">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm">
                <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => open(t.id)} data-testid={`tpl-${t.name}`}>
                  {t.name}
                  {t.shared && <span className="ml-1.5 rounded bg-primary/10 px-1 text-[10px] text-primary">ចែករំលែក</span>}
                </button>
                {isAdmin && (
                  <Button type="button" size="icon" variant="ghost" className={cn("size-7", t.shared && "text-primary")} title={t.shared ? "ឈប់ចែករំលែកជាមួយអ្នកផ្សេង" : "ចែករំលែកជាមួយអ្នកប្រើប្រាស់ទាំងអស់"} onClick={() => share(t)}>
                    <Share2 className="size-3.5" />
                  </Button>
                )}
                {(t.own || isAdmin) && (
                  <Button type="button" size="icon" variant="ghost" className="size-7" title="ជំនួសគំរូនេះដោយការរចនាបច្ចុប្បន្ន" onClick={() => save(false, t.id)} disabled={busy}>
                    <Save className="size-3.5" />
                  </Button>
                )}
                {(t.own || isAdmin) && (
                  <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => { if (window.confirm("ចាប់ផ្តើមការរចនាថ្មីពីដើម?")) onReset(); }}>
          <RotateCcw className="size-4" /> ចាប់ផ្តើមឡើងវិញ
        </Button>
      </Section>
    </div>
  );
}
