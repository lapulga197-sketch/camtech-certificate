"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft, ChevronRight, Download, FileImage, FileText, FolderArchive, Loader2, Minus, Plus, Printer, Redo2, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CertificateCanvas } from "@/components/certificates/certificate-canvas";
import {
  pageSizeMm, pageSizePx, parseDesign, type CertDesign, type DesignElement, type DocType, type Org, type PhotoCrop, type Recipient,
} from "@/lib/certificate-design";
import { resolveCrop } from "@/lib/photo-frames";
import { DOC_TYPES } from "@/lib/doc-types";
import { newDesignFor } from "@/lib/new-design";
import { todayInPhnomPenh } from "@/lib/timezone";
import { trackUse, type TemplateRow } from "./actions";
import { DesignPanel } from "./design-panel";
import { ElementPanel } from "./element-panel";
import { RecipientsPanel } from "./recipients-panel";
import { exportCardSheetPdf, exportPdf, exportPng, exportZip, sheetGrid } from "./export-utils";

type SetDesign = (next: CertDesign | ((d: CertDesign) => CertDesign), key?: string) => void;

export function DocStudio({
  doc, org, templates: initialTemplates, isAdmin,
}: {
  doc: DocType;
  org: Org;
  templates: TemplateRow[];
  isAdmin: boolean;
}) {
  const cfg = DOC_TYPES[doc];
  const SAMPLE = useMemo<Recipient>(
    () => ({ course: "", grade: "", ...cfg.defaults, ...cfg.sample, id: "sample", name: cfg.sample.name ?? "ឈ្មោះអ្នកទទួល", date: todayInPhnomPenh() }),
    [cfg]
  );
  const [design, setDesignState] = useState<CertDesign>(() => newDesignFor(doc, org));
  const designRef = useRef(design);
  const undoStack = useRef<CertDesign[]>([]);
  const redoStack = useRef<CertDesign[]>([]);
  const lastKey = useRef<{ key: string; t: number } | null>(null);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const syncHist = useCallback(() => setHist({ u: undoStack.current.length, r: redoStack.current.length }), []);

  const [recipients, setRecipientsState] = useState<Recipient[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [cropAll, setCropAll] = useState(false);
  const [tab, setTab] = useState("recipients");
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(0.6);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [ratio, setRatio] = useState("2");
  const [busy, setBusy] = useState<string | null>(null);
  const [printing, setPrinting] = useState<false | "page" | "sheet">(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const { w: pw, h: ph } = pageSizePx(design);
  const scale = fit * zoom;

  // ---------- design state with undo / redo ----------

  const replaceDesign = useCallback((value: CertDesign) => {
    designRef.current = value;
    setDesignState(value);
  }, []);

  const setDesign: SetDesign = useCallback((next, key) => {
    const cur = designRef.current;
    const value = typeof next === "function" ? next(cur) : next;
    if (value === cur) return;
    const now = Date.now();
    const coalesce = key && lastKey.current && lastKey.current.key === key && now - lastKey.current.t < 1000;
    if (!coalesce) {
      undoStack.current.push(cur);
      if (undoStack.current.length > 60) undoStack.current.shift();
    }
    lastKey.current = key ? { key, t: now } : null;
    redoStack.current = [];
    replaceDesign(value);
    syncHist();
  }, [replaceDesign, syncHist]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(designRef.current);
    lastKey.current = null;
    replaceDesign(prev);
    syncHist();
  }, [replaceDesign, syncHist]);

  const redo = useCallback(() => {
    const nxt = redoStack.current.pop();
    if (!nxt) return;
    undoStack.current.push(designRef.current);
    lastKey.current = null;
    replaceDesign(nxt);
    syncHist();
  }, [replaceDesign, syncHist]);

  function pushUndoOnce() {
    undoStack.current.push(designRef.current);
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    lastKey.current = null;
    syncHist();
  }

  function patchSilently(id: string, patch: Partial<DesignElement>) {
    const cur = designRef.current;
    replaceDesign({ ...cur, elements: cur.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  // ---------- recipients ----------

  const setRecipients = useCallback((updater: (prev: Recipient[]) => Recipient[]) => setRecipientsState(updater), []);
  const current = recipients.find((r) => r.id === currentId) ?? recipients[0] ?? null;
  const currentIndex = current ? recipients.findIndex((r) => r.id === current.id) : -1;
  const hasPhotoElement = design.elements.some((e) => e.type === "photo");

  function go(delta: number) {
    if (recipients.length === 0) return;
    const i = (Math.max(0, currentIndex) + delta + recipients.length) % recipients.length;
    setCurrentId(recipients[i].id);
  }

  // ---------- fit-to-width ----------

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setFit(Math.max(0.2, Math.min(1.6, (el.clientWidth - 32) / pw)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pw]);

  // ---------- keyboard ----------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (!selectedId) return;
      const el = designRef.current.elements.find((x) => x.id === selectedId);
      if (!el) return;
      const step = e.shiftKey ? 1 : 0.2;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDesign((d) => ({ ...d, elements: d.elements.filter((x) => x.id !== selectedId) }));
        setSelectedId(null);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setDesign((d) => ({ ...d, elements: d.elements.map((x) => (x.id === selectedId ? { ...x, x: Math.round((x.x + dx) * 10) / 10, y: Math.round((x.y + dy) * 10) / 10 } : x)) }), `nudge-${selectedId}`);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const copy = { ...el, id: `${el.id}c${Date.now().toString(36)}`, role: undefined, x: Math.min(95, el.x + 2), y: Math.min(95, el.y + 2) };
        setDesign((d) => ({ ...d, elements: [...d.elements, copy] }));
        setSelectedId(copy.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, undo, redo, setDesign]);

  // ---------- canvas drag / resize ----------

  function onElementPointerDown(e: React.PointerEvent<HTMLDivElement>, el: DesignElement) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-resize]")) return;
    e.stopPropagation();
    setSelectedId(el.id);
    setTab("elements");
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = el.x;
    const oy = el.y;
    const rect = e.currentTarget.getBoundingClientRect();
    const wPct = el.w;
    const hPct = (rect.height / scale / ph) * 100;
    let moved = false;

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / scale / pw) * 100;
      const dy = ((ev.clientY - startY) / scale / ph) * 100;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 0.15) return;
      if (!moved) {
        moved = true;
        pushUndoOnce();
      }
      let nx = ox + dx;
      let ny = oy + dy;
      let gx: number | null = null;
      let gy: number | null = null;
      if (Math.abs(nx + wPct / 2 - 50) < 0.8) { nx = 50 - wPct / 2; gx = 50; }
      if (Math.abs(ny + hPct / 2 - 50) < 0.8) { ny = 50 - hPct / 2; gy = 50; }
      setGuides({ x: gx, y: gy });
      patchSilently(el.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>, el: DesignElement) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const ow = el.w;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dw = ((ev.clientX - startX) / scale / pw) * 100;
      if (!moved) {
        moved = true;
        pushUndoOnce();
      }
      patchSilently(el.id, { w: Math.max(2, Math.min(100, Math.round((ow + dw) * 10) / 10)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---------- photo crop (Fill / Fit, zoom, drag to reposition) ----------

  const perPerson = recipients.length > 1 && !cropAll;

  function applyCrop(elId: string, patch: Partial<PhotoCrop>, silent = false) {
    if (perPerson && current) {
      setRecipients((prev) => prev.map((r) => (r.id === current.id ? { ...r, photoCrop: { ...r.photoCrop, ...patch } } : r)));
      return;
    }
    if (silent) patchSilently(elId, patch);
    else setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) }), `crop-${elId}`);
    if (recipients.some((r) => r.photoCrop)) setRecipients((prev) => prev.map((r) => (r.photoCrop ? { ...r, photoCrop: undefined } : r)));
  }

  function resetCrop(elId: string) {
    if (perPerson && current) {
      setRecipients((prev) => prev.map((r) => (r.id === current.id ? { ...r, photoCrop: undefined } : r)));
      return;
    }
    setDesign((d) => ({ ...d, elements: d.elements.map((e) => (e.id === elId ? { ...e, zoom: 1, px: 50, py: 0 } : e)) }));
  }

  function onCropPointerDown(e: React.PointerEvent<HTMLDivElement>, el: DesignElement) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(el.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const start = resolveCrop(el, current);
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / Math.max(20, rect.width)) * 100;
      const dy = ((ev.clientY - sy) / Math.max(20, rect.height)) * 100;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 0.5) return;
      if (!moved) {
        moved = true;
        if (!(perPerson && current)) pushUndoOnce();
      }
      const k = 1.6 / start.zoom;
      const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
      applyCrop(el.id, { px: clamp(start.px - dx * k), py: clamp(start.py - dy * k) }, true);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---------- exports ----------

  const exportList: (Recipient | null)[] = recipients.length > 0 ? recipients : [null];
  const baseName = cfg.fileBase;

  async function run(kind: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
      const many = kind === "zip" || kind === "pdfAll" || kind === "pdfSheet";
      const action = kind === "png" ? "export_png" : kind === "zip" ? "export_zip" : kind === "pdfSheet" ? "export_sheet" : "export_pdf";
      void trackUse(action, cfg.key, many ? Math.max(1, recipients.length) : 1).catch(() => undefined);
    } catch (err) {
      console.error(err);
      toast.error("មិនអាចទាញយកបានទេ — សូមព្យាយាមម្តងទៀត");
    } finally {
      setBusy(null);
      toast.dismiss("export");
    }
  }

  const progress = (done: number, total: number) => toast.loading(`កំពុងបង្កើត ${Math.min(done + 1, total)}/${total}...`, { id: "export" });
  const r = Number(ratio);

  function doPrint(mode: "page" | "sheet" = "page") {
    if (printing) return;
    void trackUse("print", cfg.key, Math.max(1, recipients.length)).catch(() => undefined);
    setPrinting(mode);
  }

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    (async () => {
      try {
        await document.fonts.ready;
        await new Promise((res) => setTimeout(res, 400));
        if (!cancelled) window.print();
      } catch {
        done();
      }
    })();
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  const mm = pageSizeMm(design);
  const grid = sheetGrid(mm);
  const cardScale = (mm.w / 25.4 * 96) / pw;
  const printPortal =
    printing && typeof document !== "undefined"
      ? createPortal(
          <div id="cert-print-root">
            <style>{`
              @page { size: ${printing === "sheet" ? "210mm 297mm" : `${mm.w}mm ${mm.h}mm`}; margin: 0; }
              #cert-print-root { display: none; }
              @media print {
                html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
                body > *:not(#cert-print-root) { display: none !important; }
                #cert-print-root { display: block !important; }
                .cert-print-page { width: ${printing === "sheet" ? 210 : mm.w}mm; height: ${printing === "sheet" ? 297 : mm.h}mm; overflow: hidden; break-after: page; page-break-after: always; position: relative; }
                .cert-print-page:last-child { break-after: auto; page-break-after: auto; }
                .cert-print-page > div { transform-origin: top left; transform: scale(${cardScale}); }
                .cert-print-page > .cert-cell { position: absolute; width: ${mm.w}mm; height: ${mm.h}mm; overflow: hidden; outline: 0.1mm solid #aaa; transform: none; }
                .cert-print-page > .cert-cell > div { transform-origin: top left; transform: scale(${cardScale}); }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            `}</style>
            {printing === "sheet"
              ? Array.from({ length: Math.ceil(exportList.length / grid.perPage) }, (_, p) => (
                  <div key={p} className="cert-print-page">
                    {exportList.slice(p * grid.perPage, (p + 1) * grid.perPage).map((rec, i) => {
                      const c = grid.cell(i);
                      return (
                        <div key={rec?.id ?? i} className="cert-cell" style={{ left: `${c.x}mm`, top: `${c.y}mm` }}>
                          <CertificateCanvas design={design} recipient={rec} org={org} />
                        </div>
                      );
                    })}
                  </div>
                ))
              : exportList.map((rec, i) => (
                  <div key={rec?.id ?? i} className="cert-print-page">
                    <CertificateCanvas design={design} recipient={rec} org={org} />
                  </div>
                ))}
          </div>,
          document.body
        )
      : null;

  function loadDesign(config: string): boolean {
    const d = parseDesign(config, org);
    if (!d) return false;
    pushUndoOnce();
    replaceDesign(d);
    setSelectedId(null);
    return true;
  }

  const editorHooks = useMemo(
    () => ({ selectedId, guides, cropId: cropId === selectedId ? cropId : null, onCropPointerDown, onElementPointerDown, onResizePointerDown }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, guides, scale, pw, ph, cropId, perPerson, current]
  );

  const previewRecipient = current ?? SAMPLE;

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      <Card className="xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto">
        <CardContent className="pt-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recipients" data-testid="tab-recipients">អ្នកទទួល</TabsTrigger>
              <TabsTrigger value="design" data-testid="tab-design">ទំព័រ & ផ្ទៃ</TabsTrigger>
              <TabsTrigger value="elements" data-testid="tab-elements">ធាតុ</TabsTrigger>
            </TabsList>
            <TabsContent value="recipients" className="mt-4">
              <RecipientsPanel
                doc={doc}
                recipients={recipients}
                setRecipients={setRecipients}
                currentId={current?.id ?? null}
                onSelect={setCurrentId}
                hasPhotoElement={hasPhotoElement}
              />
            </TabsContent>
            <TabsContent value="design" className="mt-4">
              <DesignPanel
                design={design}
                setDesign={setDesign}
                org={org}
                templates={templates}
                setTemplates={setTemplates}
                isAdmin={isAdmin}
                onReset={() => { pushUndoOnce(); replaceDesign(newDesignFor(doc, org)); setSelectedId(null); }}
                onLoadDesign={loadDesign}
              />
            </TabsContent>
            <TabsContent value="elements" className="mt-4">
              <ElementPanel
                design={design} setDesign={setDesign} selectedId={selectedId} onSelect={setSelectedId}
                photo={{
                  hasPhoto: !!current?.photo,
                  cropping: cropId !== null && cropId === selectedId,
                  toggleCrop: (id) => setCropId((c) => (c === id ? null : id)),
                  value: (el) => resolveCrop(el, current),
                  apply: applyCrop,
                  reset: resetCrop,
                  perPerson, canScope: recipients.length > 1, cropAll, setCropAll,
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={undo} disabled={hist.u === 0} title="Undo (Ctrl+Z)" data-testid="undo"><Undo2 className="size-4" /></Button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={redo} disabled={hist.r === 0} title="Redo (Ctrl+Y)" data-testid="redo"><Redo2 className="size-4" /></Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}><Minus className="size-4" /></Button>
          <button type="button" className="w-14 text-center text-xs tabular-nums hover:underline" onClick={() => setZoom(1)} title="កំណត់ឡើងវិញ" data-testid="zoom">{Math.round(scale * 100)}%</button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))}><Plus className="size-4" /></Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => go(-1)} disabled={recipients.length < 2} data-testid="prev"><ChevronLeft className="size-4" /></Button>
          <span className="min-w-16 text-center text-sm tabular-nums" data-testid="pager">{recipients.length === 0 ? "ឧទាហរណ៍" : `${currentIndex + 1} / ${recipients.length}`}</span>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => go(1)} disabled={recipients.length < 2} data-testid="next"><ChevronRight className="size-4" /></Button>

          <div className="ml-auto flex items-center gap-2">
            <Select value={ratio} onValueChange={setRatio}>
              <SelectTrigger className="h-8 w-36 text-xs" data-testid="ratio"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.5">គុណភាពធម្មតា</SelectItem>
                <SelectItem value="2">គុណភាពខ្ពស់</SelectItem>
                <SelectItem value="3">គុណភាពខ្ពស់ណាស់</SelectItem>
              </SelectContent>
            </Select>
            {cfg.sheet ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={!!printing} data-testid="print">
                    <Printer className="size-4" /> ព្រីន
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem data-testid="print-sheet" onSelect={() => doPrint("sheet")}>ព្រីនលើសន្លឹក A4 ({grid.perPage} កាត/សន្លឹក)</DropdownMenuItem>
                  <DropdownMenuItem data-testid="print-page" onSelect={() => doPrint("page")}>ព្រីនម្នាក់មួយសន្លឹក (ទំហំកាត)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => doPrint("page")} disabled={!!printing} data-testid="print">
                <Printer className="size-4" /> ព្រីន
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" disabled={busy !== null} data-testid="export-menu">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} ទាញយក
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>រូបភាព (PNG)</DropdownMenuLabel>
                <DropdownMenuItem data-testid="dl-png" onSelect={() => run("png", () => exportPng(design, current, org, r, Math.max(0, currentIndex)))}>
                  <FileImage className="size-4" /> សន្លឹកនេះ (PNG)
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="dl-zip" disabled={recipients.length < 2} onSelect={() => run("zip", () => exportZip(design, recipients, org, r, progress, baseName))}>
                  <FolderArchive className="size-4" /> ទាំងអស់ ({recipients.length}) — ZIP នៃ PNG
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>PDF</DropdownMenuLabel>
                <DropdownMenuItem data-testid="dl-pdf-one" onSelect={() => run("pdf1", () => exportPdf(design, [current], org, r, current?.name || cfg.slug, progress))}>
                  <FileText className="size-4" /> សន្លឹកនេះ (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="dl-pdf-all" disabled={recipients.length < 2} onSelect={() => run("pdfAll", () => exportPdf(design, recipients, org, r, baseName, progress))}>
                  <FileText className="size-4" /> ទាំងអស់ ({recipients.length}) — PDF មួយឯកសារ
                </DropdownMenuItem>
                {cfg.sheet && (
                  <DropdownMenuItem data-testid="dl-pdf-sheet" onSelect={() => run("pdfSheet", () => exportCardSheetPdf(design, exportList.map((x) => x ?? SAMPLE), org, r, `${baseName}-A4`, progress))}>
                    <FileText className="size-4" /> PDF សន្លឹក A4 ({grid.perPage} កាត/សន្លឹក)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {recipients.length === 0 && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            មិនទាន់មានអ្នកទទួល — កំពុងបង្ហាញឧទាហរណ៍។ ការទាញយក/ព្រីននឹងចេញជាសន្លឹកទទេ (សម្រាប់សរសេរដៃ)។
          </p>
        )}

        <div
          ref={viewportRef}
          data-testid="viewport"
          className="overflow-auto rounded-lg border bg-muted/50 p-4"
          style={{ maxHeight: "calc(100vh - 230px)" }}
          onPointerDown={() => setSelectedId(null)}
        >
          <div style={{ width: pw * scale, height: ph * scale, margin: "0 auto", boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
            <div style={{ width: pw, height: ph, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <CertificateCanvas design={design} recipient={previewRecipient} org={org} editor={editorHooks} />
            </div>
          </div>
        </div>
      </div>
      {printPortal}
    </div>
  );
}
