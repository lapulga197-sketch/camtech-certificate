"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, ImagePlus, Loader2, QrCode, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { computeDuration, formatShortKh, newId, type DocType, type Recipient } from "@/lib/certificate-design";
import { DOC_TYPES, FIELDS, fieldLabel, type FieldKey } from "@/lib/doc-types";
import { todayInPhnomPenh } from "@/lib/timezone";
import { parseRecipientSheet, registerDocuments } from "./actions";
import { fileToDataUrl } from "./image-utils";

function norm(s: string) {
  return s.toLowerCase().replace(/[\s_\-.]+/g, "");
}

function FieldInput({
  doc, k, value, onChange, testId, listId,
}: {
  doc: DocType; k: FieldKey; value: string; onChange: (v: string) => void; testId?: string; listId?: string;
}) {
  const def = FIELDS[k];
  if (def.kind === "area") {
    return <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} className="text-sm" placeholder={def.placeholder} />;
  }
  if (def.kind === "date") {
    return <Input type="date" className="h-8" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
  }
  if (def.kind === "gender") {
    return (
      <select
        className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
        value={/^(m|male|ប្រុស)$/i.test(value) ? "M" : /^(f|female|ស្រី)$/i.test(value) ? "F" : ""}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        <option value="">—</option>
        <option value="M">ប្រុស / Male</option>
        <option value="F">ស្រី / Female</option>
      </select>
    );
  }
  void doc;
  return <Input className="h-8" list={listId} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} placeholder={def.placeholder} />;
}

export function RecipientsPanel({
  doc, recipients, setRecipients, currentId, onSelect, hasPhotoElement,
}: {
  doc: DocType;
  recipients: Recipient[];
  setRecipients: (updater: (prev: Recipient[]) => Recipient[]) => void;
  currentId: string | null;
  onSelect: (id: string) => void;
  hasPhotoElement: boolean;
}) {
  const cfg = DOC_TYPES[doc];
  const [defaults, setDefaults] = useState<Partial<Recipient>>(() => ({ ...cfg.defaults, date: todayInPhnomPenh() }));
  const [mode, setMode] = useState<"paste" | "excel">("paste");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const excelInput = useRef<HTMLInputElement>(null);
  const bulkPhotos = useRef<HTMLInputElement>(null);
  const rowPhoto = useRef<HTMLInputElement>(null);
  const rowPhotoTarget = useRef<string | null>(null);
  const listId = `dl-${doc}`;

  const setDef = (k: FieldKey, v: string) => setDefaults((d) => ({ ...d, [k]: v }));

  function withDefaults(r: Omit<Recipient, "id">): Recipient {
    const out: Record<string, unknown> = { ...r, id: newId("r") };
    for (const k of cfg.defaultFields) {
      const cur = out[k];
      const def = (defaults as Record<string, string | undefined>)[k];
      if ((cur === undefined || cur === "") && def) out[k] = def;
    }
    // Nationality etc. come from the defaults even when not shown in the box.
    for (const k of ["nationality", "nationalityEn", "positionEn", "occasionEn"] as const) {
      const def = (defaults as Record<string, string | undefined>)[k];
      if (!out[k] && def) out[k] = def;
    }
    out.course = (out.course as string) ?? "";
    out.grade = (out.grade as string) ?? "";
    out.date = (out.date as string) || defaults.date || todayInPhnomPenh();
    return out as unknown as Recipient;
  }

  function addMany(list: Omit<Recipient, "id">[]) {
    const fresh = list.map(withDefaults);
    if (fresh.length === 0) return;
    setRecipients((prev) => [...prev, ...fresh]);
    onSelect(fresh[0].id);
    toast.success(`បានបន្ថែម ${fresh.length} នាក់`);
  }

  function addPasted() {
    const lines = paste.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("សូមវាយឈ្មោះយ៉ាងហោចណាស់មួយ");
      return;
    }
    const list = lines.slice(0, 500).map((l) => {
      const parts = l.split(/\||\t/).map((p) => p.trim());
      const rec: Record<string, string> = { name: parts[0], course: "", grade: "", date: "" };
      cfg.pasteCols.forEach((k, i) => {
        if (parts[i + 1]) rec[k] = parts[i + 1];
      });
      return rec as unknown as Omit<Recipient, "id">;
    });
    addMany(list);
    setPaste("");
  }

  async function onExcel(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc", doc);
    const r = await parseRecipientSheet(fd);
    setBusy(false);
    if (!r.success || !r.rows) {
      toast.error(r.message || "មានបញ្ហាកើតឡើង");
      return;
    }
    addMany(r.rows);
  }

  function patch(id: string, p: Partial<Recipient>) {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function applyDefaultsToAll() {
    setRecipients((prev) =>
      prev.map((r) => {
        const next: Record<string, unknown> = { ...r };
        for (const k of cfg.defaultFields) {
          const v = (defaults as Record<string, string | undefined>)[k];
          if (v) next[k] = v;
        }
        return next as unknown as Recipient;
      })
    );
    toast.success("បានដាក់ចំពោះអ្នកទទួលទាំងអស់");
  }

  async function onRowPhoto(file: File | undefined) {
    const id = rowPhotoTarget.current;
    if (!file || !id) return;
    try {
      const { src } = await fileToDataUrl(file, { max: 700, forceJpeg: true });
      patch(id, { photo: src });
    } catch {
      toast.error("មិនអាចអានរូបភាពបានទេ");
    }
  }

  async function onBulkPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    let matched = 0;
    const updates = new Map<string, string>();
    for (const f of Array.from(files)) {
      const base = norm(f.name.replace(/\.[^.]+$/, ""));
      const target = recipients.find((r) => (r.code && norm(r.code) === base) || (norm(r.name) && (base.includes(norm(r.name)) || norm(r.name).includes(base))));
      if (!target || updates.has(target.id)) continue;
      try {
        const { src } = await fileToDataUrl(f, { max: 700, forceJpeg: true });
        updates.set(target.id, src);
        matched++;
      } catch {
        /* skip unreadable file */
      }
    }
    if (matched > 0) setRecipients((prev) => prev.map((r) => (updates.has(r.id) ? { ...r, photo: updates.get(r.id) } : r)));
    toast[matched === files.length ? "success" : "info"](`ផ្គូផ្គងរូបថតបាន ${matched}/${files.length} (ដាក់ឈ្មោះឯកសារតាមកូដ ឬឈ្មោះ)`);
  }

  const registrable = cfg.register ? recipients.filter((r) => !r.qr) : [];

  async function register() {
    if (registrable.length === 0) return;
    setBusy(true);
    const r = await registerDocuments(
      doc,
      registrable.map((x) => ({ key: x.id, name: x.name, detail: x.course || x.reason || x.subject || x.position || "", date: x.date })),
      window.location.origin
    );
    if (!r.success || !r.results) {
      setBusy(false);
      toast.error(r.message || "មានបញ្ហាកើតឡើង");
      return;
    }
    // draw the QR codes here (in chunks, so the page stays responsive)
    const QR = (await import("qrcode")).default;
    const base = (r.verifyBase || window.location.origin).replace(/\/$/, "");
    const map = new Map<string, { certNo: string; qr: string }>();
    for (let i = 0; i < r.results.length; i++) {
      const x = r.results[i];
      map.set(x.key, { certNo: x.certNo, qr: await QR.toDataURL(`${base}/verify/${x.certNo}`, { width: 300, margin: 1 }) });
      if (i % 10 === 9) await new Promise((res) => setTimeout(res, 0));
    }
    setRecipients((prev) => prev.map((x) => (map.has(x.id) ? { ...x, certNo: map.get(x.id)!.certNo, qr: map.get(x.id)!.qr } : x)));
    setBusy(false);
    toast.success(`បានចុះបញ្ជី ${r.results.length} ឯកសារ`);
  }

  const pasteHint = ["ឈ្មោះ", ...cfg.pasteCols.map((k) => fieldLabel(doc, k))].join(" | ");
  const pastePlaceholder = `មួយបន្ទាត់ម្នាក់\nឧ. ជា សុវណ្ណ\n${["សុខ ចាន់ណា", ...cfg.pasteCols.map((k) => FIELDS[k].label)].join(" | ")}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <h4 className="text-sm font-semibold">តម្លៃលំនាំដើម (សម្រាប់អ្នកទទួលថ្មី)</h4>
        <div className="grid grid-cols-2 gap-2">
          {cfg.defaultFields.map((k) => (
            <div key={k} className={cn("space-y-1", FIELDS[k].wide || FIELDS[k].kind === "area" ? "col-span-2" : "")}>
              <Label className="text-xs">{fieldLabel(doc, k)}</Label>
              <FieldInput doc={doc} k={k} value={(defaults as Record<string, string | undefined>)[k] ?? ""} onChange={(v) => setDef(k, v)} testId={`def-${k}`} listId={cfg.datalist?.field === k ? listId : undefined} />
            </div>
          ))}
        </div>
        {cfg.datalist && <datalist id={listId}>{cfg.datalist.options.map((o) => <option key={o} value={o} />)}</datalist>}
        {doc !== "certificate" && (
          <p className="text-[11px] text-muted-foreground">ក្នុងអត្ថបទអាចប្រើ <code>{"{name}"}</code> <code>{"{org}"}</code> ជាដើម — ត្រូវជំនួសដោយស្វ័យប្រវត្តិ។</p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={applyDefaultsToAll} disabled={recipients.length === 0} data-testid="apply-defaults">
          ដាក់ចំពោះអ្នកទទួលទាំងអស់
        </Button>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <h4 className="text-sm font-semibold">បន្ថែមអ្នកទទួល</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {([["paste", "វាយឈ្មោះ"], ["excel", "Excel"]] as const).map(([k, label]) => (
            <button key={k} type="button" data-testid={`mode-${k}`} onClick={() => setMode(k)}
              className={cn("rounded-md border px-2 py-1.5", mode === k ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>

        {mode === "paste" && (
          <div className="space-y-2">
            <Textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={pastePlaceholder} data-testid="paste-box" />
            <p className="text-xs text-muted-foreground">អាចបំបែកជួរដោយ <code>|</code> ឬ Tab៖ {pasteHint}</p>
            <Button type="button" size="sm" className="w-full" onClick={addPasted} data-testid="add-paste"><UserPlus className="size-4" /> បន្ថែម</Button>
          </div>
        )}

        {mode === "excel" && (
          <div className="space-y-2">
            <input ref={excelInput} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { void onExcel(e.target.files?.[0]); e.target.value = ""; }} data-testid="excel-file" />
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => excelInput.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} ជ្រើសឯកសារ Excel / CSV
            </Button>
            <p className="text-xs text-muted-foreground">
              ជួរដំបូងជាក្បាលតារាង (ឈ្មោះ និងជួរផ្សេងៗ)។ <a className="text-primary underline" href={`/api/template?type=${cfg.slug}`}>ទាញយកគំរូ Excel</a>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">បញ្ជីអ្នកទទួល ({recipients.length})</h4>
          {recipients.length > 0 && (
            <button type="button" className="flex items-center gap-1 text-xs text-destructive hover:underline" onClick={() => { if (window.confirm("លុបអ្នកទទួលទាំងអស់?")) setRecipients(() => []); }}>
              <Trash2 className="size-3.5" /> លុបទាំងអស់
            </button>
          )}
        </div>
        {recipients.length > 0 && (cfg.photo || cfg.register) && (
          <div className="flex flex-wrap gap-2">
            {cfg.photo && (
              <>
                <input ref={bulkPhotos} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void onBulkPhotos(e.target.files); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" onClick={() => bulkPhotos.current?.click()} data-testid="bulk-photos">
                  <ImagePlus className="size-4" /> ដាក់រូបថតច្រើន
                </Button>
              </>
            )}
            {cfg.register && (
              <Button type="button" variant="outline" size="sm" onClick={register} disabled={busy || registrable.length === 0} data-testid="register" title="បង្កើតលេខឯកសារ និង QR ផ្ទៀងផ្ទាត់ ហើយចុះបញ្ជី">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />} ចុះបញ្ជី + QR ({registrable.length})
              </Button>
            )}
          </div>
        )}
        {cfg.photo && !hasPhotoElement && recipients.length > 0 && (
          <p className="rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">ការរចនានេះមិនទាន់មានធាតុ «រូបថត» ទេ — បន្ថែមក្នុងផ្ទាំង «ធាតុ» ដើម្បីបង្ហាញរូបថត។</p>
        )}
        <input ref={rowPhoto} type="file" accept="image/*" className="hidden" onChange={(e) => { void onRowPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        {recipients.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">មិនទាន់មានអ្នកទទួលទេ — បន្ថែមខាងលើ</p>
        ) : (
          <ul className="space-y-1.5" data-testid="recipient-list">
            {recipients.map((r, i) => {
              const open = expanded === r.id;
              const rec = r as unknown as Record<string, string | undefined>;
              return (
                <li key={r.id} className={cn("rounded-md border", r.id === currentId && "border-primary bg-primary/5")}>
                  <div className="flex items-center gap-1 p-1.5">
                    <button type="button" className="w-6 shrink-0 text-center text-xs text-muted-foreground" onClick={() => setExpanded(open ? null : r.id)} aria-label="ព័ត៌មានបន្ថែម" data-testid={`rexpand-${i}`}>
                      {open ? <ChevronDown className="mx-auto size-4" /> : <ChevronRight className="mx-auto size-4" />}
                    </button>
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <Input className="h-8 min-w-0 flex-1" value={r.name} onFocus={() => onSelect(r.id)} onChange={(e) => patch(r.id, { name: e.target.value })} data-testid={`rname-${i}`} />
                    {r.certNo && r.qr && <QrCode className="size-3.5 shrink-0 text-success" aria-label={r.certNo} />}
                    {r.photo && <span className="size-6 shrink-0 rounded bg-cover bg-center" style={{ backgroundImage: `url(${r.photo})` }} />}
                    <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0 text-destructive" onClick={() => setRecipients((prev) => prev.filter((x) => x.id !== r.id))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  {open && (
                    <div className="grid grid-cols-2 gap-2 border-t p-2">
                      {cfg.rowFields.map((k) => (
                        <div key={k} className={cn("space-y-1", FIELDS[k].wide || FIELDS[k].kind === "area" ? "col-span-2" : "")}>
                          <Label className="text-xs">{fieldLabel(doc, k)}</Label>
                          <FieldInput
                            doc={doc} k={k} value={rec[k] ?? ""} testId={`r${k}-${i}`}
                            listId={cfg.datalist?.field === k ? listId : undefined}
                            onChange={(v) => patch(r.id, { [k]: v || (FIELDS[k].kind === "text" || FIELDS[k].kind === "area" ? "" : undefined) } as Partial<Recipient>)}
                          />
                        </div>
                      ))}
                      {r.startDate && r.endDate && (
                        <p className="col-span-2 text-[11px] text-muted-foreground">
                          រយៈពេល៖ {computeDuration(r.startDate, r.endDate, "kh").km} ({formatShortKh(r.startDate, "kh")} → {formatShortKh(r.endDate, "kh")})
                        </p>
                      )}
                      {cfg.photo && (
                        <div className="col-span-2 flex items-center gap-1">
                          <Button type="button" variant="outline" size="sm" className="h-8 flex-1" onClick={() => { rowPhotoTarget.current = r.id; rowPhoto.current?.click(); }}>
                            <ImagePlus className="size-4" /> {r.photo ? "ប្តូររូបថត" : "រូបថត"}
                          </Button>
                          {r.photo && <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => patch(r.id, { photo: undefined })}><X className="size-4" /></Button>}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
