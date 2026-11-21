"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageSlot, uploadAsset } from "@/components/admin/upload";
import { DOC_ORDER, DOC_TYPES } from "@/lib/doc-types";
import type { About, Brand, Contact, LinkItem, SiteSettings, Welcome } from "@/lib/settings-types";
import { deleteAsset, saveSite, updateGuide } from "./actions";

export type GuideItem = { id: string; name: string; size: number; title: string; doc: string };

function SaveBar({ busy, onSave, testId }: { busy: boolean; onSave: () => void; testId: string }) {
  return (
    <Button type="button" onClick={onSave} disabled={busy} data-testid={testId}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} រក្សាទុក
    </Button>
  );
}

function useSaver(key: "brand" | "welcome" | "about" | "contact") {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function save(value: unknown) {
    setBusy(true);
    const r = await saveSite(key, value);
    setBusy(false);
    if (r.success) {
      toast.success("បានរក្សាទុក");
      router.refresh();
    } else toast.error(r.message || "មានបញ្ហា");
  }
  return { busy, save };
}

function LinkEditor({ items, onChange, labelHint }: { items: LinkItem[]; onChange: (v: LinkItem[]) => void; labelHint: string }) {
  const set = (i: number, patch: Partial<LinkItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
          <Input placeholder={labelHint} value={it.label} maxLength={80} onChange={(e) => set(i, { label: e.target.value })} data-testid={`link-label-${i}`} />
          <Input placeholder="អក្សរបង្ហាញ ឧ. @camtech / 012 345 678" value={it.value} maxLength={200} onChange={(e) => set(i, { value: e.target.value })} data-testid={`link-value-${i}`} />
          <Input placeholder="តំណ https://… / tel:… / mailto:…" value={it.href} maxLength={500} onChange={(e) => set(i, { href: e.target.value })} data-testid={`link-href-${i}`} />
          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      {items.length < 12 && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { label: "", value: "", href: "" }])} data-testid="link-add"><Plus className="size-4" /> បន្ថែម</Button>
      )}
    </div>
  );
}

function BrandTab({ initial }: { initial: Brand }) {
  const [v, setV] = useState(initial);
  const { busy, save } = useSaver("brand");
  return (
    <Card>
      <CardHeader><CardTitle>ឈ្មោះ និងរូបតំណាង app</CardTitle><CardDescription>ឈ្មោះបង្ហាញលើ tab browser, ក្បាលទំព័រ និងទំព័រចូល</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>ឈ្មោះ app</Label><Input value={v.appName} maxLength={80} onChange={(e) => setV({ ...v, appName: e.target.value })} data-testid="brand-appname" /></div>
        <div className="space-y-1.5"><Label>ពាក្យពណ៌នាខ្លី</Label><Input value={v.tagline} maxLength={160} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageSlot label="Favicon (tab browser)" hint="PNG / ICO / SVG ការ៉េ ≥ 64px" kind="favicon" square value={v.faviconId} onChange={(id) => setV({ ...v, faviconId: id })} maxDim={256} testId="up-favicon" />
          <ImageSlot label="Icon (app / ទូរស័ព្ទ)" hint="PNG ការ៉េ 180–512px" kind="icon" square value={v.iconId} onChange={(id) => setV({ ...v, iconId: id })} maxDim={512} testId="up-icon" />
          <ImageSlot label="Logo (ក្បាលទំព័រ + ទំព័រចូល)" kind="logo" value={v.logoId} onChange={(id) => setV({ ...v, logoId: id })} maxDim={600} testId="up-logo" />
        </div>
        <div className="space-y-1.5"><Label>អក្សរបាតទំព័រ (ទទេ = © ឆ្នាំ + ឈ្មោះ)</Label><Input value={v.footer} maxLength={200} onChange={(e) => setV({ ...v, footer: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">ពណ៌ / ម៉ូតភ្លឺ-ងងឹត៖ ចុចប៊ូតុង «រូបរាង» នៅក្បាលទំព័រ រួចចុច «កំណត់ជាលំនាំដើមសម្រាប់អ្នកប្រើទាំងអស់»។</p>
        <SaveBar busy={busy} onSave={() => save(v)} testId="save-brand" />
      </CardContent>
    </Card>
  );
}

function WelcomeTab({ initial }: { initial: Welcome }) {
  const [v, setV] = useState(initial);
  const { busy, save } = useSaver("welcome");
  const input = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState(false);
  async function add(file: File | undefined) {
    if (!file) return;
    setUp(true);
    try {
      const u = await uploadAsset(file, "welcome", {}, 1400);
      setV((x) => ({ ...x, images: [...x.images, { assetId: u.id, caption: "" }].slice(0, 3) }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUp(false);
    }
  }
  return (
    <Card>
      <CardHeader><CardTitle>ផ្ទាំងស្វាគមន៍</CardTitle><CardDescription>បង្ហាញនៅទំព័រដើមរបស់អ្នកប្រើ — ដាក់អក្សរ និងរូប (ឧ. QR ជូនកាហ្វេ, QR ទំនាក់ទំនង) រហូតដល់ ៣ រូប</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2"><Switch checked={v.enabled} onCheckedChange={(c) => setV({ ...v, enabled: c })} data-testid="welcome-enabled" /><Label>បង្ហាញផ្ទាំងស្វាគមន៍</Label></div>
        <div className="space-y-1.5"><Label>ចំណងជើង</Label><Input value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} data-testid="welcome-title" /></div>
        <div className="space-y-1.5"><Label>អត្ថបទ</Label><Textarea rows={5} value={v.body} maxLength={2000} onChange={(e) => setV({ ...v, body: e.target.value })} data-testid="welcome-body" /></div>
        <div className="space-y-2">
          <Label>រូបភាព (រហូតដល់ ៣)</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {v.images.map((im, i) => (
              <div key={im.assetId} className="space-y-2 rounded-md border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/asset/${im.assetId}`} alt="" className="mx-auto h-32 object-contain" />
                <Input placeholder="ចំណងជើងរូប ឧ. ជូនកាហ្វេអ្នកអភិវឌ្ឍ" value={im.caption} maxLength={120} onChange={(e) => setV({ ...v, images: v.images.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setV({ ...v, images: v.images.filter((_, j) => j !== i) })}><Trash2 className="size-4" /> លុប</Button>
              </div>
            ))}
          </div>
          {v.images.length < 3 && (
            <Button type="button" variant="outline" size="sm" disabled={up} onClick={() => input.current?.click()} data-testid="welcome-add-image">
              {up ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} បន្ថែមរូប
            </Button>
          )}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" data-testid="welcome-image-file" onChange={(e) => { void add(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <SaveBar busy={busy} onSave={() => save(v)} testId="save-welcome" />
      </CardContent>
    </Card>
  );
}

function AboutTab({ initial }: { initial: About }) {
  const [v, setV] = useState(initial);
  const { busy, save } = useSaver("about");
  return (
    <Card>
      <CardHeader><CardTitle>អំពីយើង</CardTitle><CardDescription>អត្ថបទ រូប និងតំណផ្សេងៗ (Facebook, Telegram, គេហទំព័រ…)</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>ចំណងជើង</Label><Input value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} data-testid="about-title" /></div>
        <div className="space-y-1.5"><Label>អត្ថបទ (ចុះបន្ទាត់ថ្មីបាន)</Label><Textarea rows={8} value={v.body} maxLength={6000} onChange={(e) => setV({ ...v, body: e.target.value })} data-testid="about-body" /></div>
        <ImageSlot label="រូបភាព (ជម្រើស)" kind="about" value={v.imageId} onChange={(id) => setV({ ...v, imageId: id })} maxDim={1400} testId="up-about" />
        <div className="space-y-1.5"><Label>តំណ</Label><LinkEditor items={v.links} onChange={(links) => setV({ ...v, links })} labelHint="ឈ្មោះ ឧ. Facebook" /></div>
        <SaveBar busy={busy} onSave={() => save(v)} testId="save-about" />
      </CardContent>
    </Card>
  );
}

function ContactTab({ initial }: { initial: Contact }) {
  const [v, setV] = useState(initial);
  const { busy, save } = useSaver("contact");
  return (
    <Card>
      <CardHeader><CardTitle>ទំនាក់ទំនង</CardTitle><CardDescription>លេខទូរស័ព្ទ អ៊ីមែល Telegram Facebook អាសយដ្ឋាន… (បង្ហាញក្នុងទំព័រ «ទំនាក់ទំនង» និងបាតទំព័រ)</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label>ចំណងជើង</Label><Input value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>សេចក្តីណែនាំ</Label><Textarea rows={3} value={v.intro} maxLength={1000} onChange={(e) => setV({ ...v, intro: e.target.value })} /></div>
        <LinkEditor items={v.items} onChange={(items) => setV({ ...v, items })} labelHint="ប្រភេទ ឧ. Telegram" />
        <SaveBar busy={busy} onSave={() => save(v)} testId="save-contact" />
      </CardContent>
    </Card>
  );
}

function GuidesTab({ initial }: { initial: GuideItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [doc, setDoc] = useState("general");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const docs = [["general", "ទូទៅ (ទាំងអស់)"], ...DOC_ORDER.map((k) => [DOC_TYPES[k].slug, DOC_TYPES[k].label] as const)];

  async function add(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const u = await uploadAsset(file, "help", { doc, title: title.trim() });
      setList((l) => [...l, { id: u.id, name: file.name, size: file.size, title: String(u.meta.title ?? file.name), doc: String(u.meta.doc ?? doc) }]);
      setTitle("");
      toast.success("បានផ្ទុកឡើង");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function rename(g: GuideItem, patch: Partial<GuideItem>) {
    const n = { ...g, ...patch };
    setList((l) => l.map((x) => (x.id === g.id ? n : x)));
    const r = await updateGuide(g.id, n.title, n.doc);
    if (!r.success) toast.error("រក្សាទុកមិនបាន");
  }
  return (
    <Card>
      <CardHeader><CardTitle>ឯកសារណែនាំ (PDF)</CardTitle><CardDescription>អ្នកប្រើមើលបានក្នុងមីនុយ «របៀបប្រើ» — ជ្រើសមុខងារដែលឯកសារនេះពាក់ព័ន្ធ (PDF ≤ 4MB)</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5"><Label>ឈ្មោះឯកសារ</Label><Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="ឧ. របៀបធ្វើកាតសិស្ស" data-testid="guide-title" /></div>
          <div className="space-y-1.5"><Label>សម្រាប់មុខងារ</Label>
            <Select value={doc} onValueChange={setDoc}>
              <SelectTrigger className="w-full" data-testid="guide-doc"><SelectValue /></SelectTrigger>
              <SelectContent>{docs.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={busy} onClick={() => input.current?.click()} data-testid="guide-upload">{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} ផ្ទុក PDF</Button>
          <input ref={input} type="file" accept="application/pdf" className="hidden" data-testid="guide-file" onChange={(e) => { void add(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">មិនទាន់មានឯកសារទេ</p> : (
          <ul className="space-y-2" data-testid="guide-list">
            {list.map((g) => (
              <li key={g.id} className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[auto_1fr_220px_auto]">
                <FileText className="size-5 text-primary" />
                <Input value={g.title} maxLength={120} onChange={(e) => setList((l) => l.map((x) => (x.id === g.id ? { ...x, title: e.target.value } : x)))} onBlur={() => void rename(g, {})} />
                <Select value={g.doc} onValueChange={(d) => void rename(g, { doc: d })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{docs.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                  if (!window.confirm("លុបឯកសារនេះ?")) return;
                  const r = await deleteAsset(g.id, "help");
                  if (r.success) { setList((l) => l.filter((x) => x.id !== g.id)); router.refresh(); } else toast.error("លុបមិនបាន");
                }}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsForm({ initial, guides, mail }: { initial: SiteSettings; guides: GuideItem[]; mail: boolean }) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="brand">
        <TabsList className="flex h-auto flex-wrap" data-testid="settings-tabs">
          <TabsTrigger value="brand" data-testid="tab-brand">ទូទៅ / Logo</TabsTrigger>
          <TabsTrigger value="welcome" data-testid="tab-welcome">ស្វាគមន៍</TabsTrigger>
          <TabsTrigger value="about" data-testid="tab-about">អំពីយើង</TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">ទំនាក់ទំនង</TabsTrigger>
          <TabsTrigger value="guides" data-testid="tab-guides">របៀបប្រើ (PDF)</TabsTrigger>
        </TabsList>
        <TabsContent value="brand"><BrandTab initial={initial.brand} /></TabsContent>
        <TabsContent value="welcome"><WelcomeTab initial={initial.welcome} /></TabsContent>
        <TabsContent value="about"><AboutTab initial={initial.about} /></TabsContent>
        <TabsContent value="contact"><ContactTab initial={initial.contact} /></TabsContent>
        <TabsContent value="guides"><GuidesTab initial={guides} /></TabsContent>
      </Tabs>
      <p className="rounded-md border p-3 text-xs text-muted-foreground" data-testid="mail-status">
        ការស្រោចស្រង់លេខសម្ងាត់តាមអ៊ីមែល៖ {mail ? "បានកំណត់ហើយ ✓ (អ្នកប្រើទទួលតំណតាមអ៊ីមែល)" : "មិនទាន់កំណត់ — ពេលអ្នកប្រើភ្លេចលេខសម្ងាត់ ប្រព័ន្ធនឹងជូនដំណឹងដល់អេដមីនឲ្យកំណត់ជូន។ ដើម្បីបើកការផ្ញើអ៊ីមែល សូមដាក់ MAIL_FROM និង RESEND_API_KEY (ឬ BREVO_API_KEY) ក្នុង Vercel។"}
      </p>
    </div>
  );
}
