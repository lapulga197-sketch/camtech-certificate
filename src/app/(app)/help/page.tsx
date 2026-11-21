import Link from "next/link";
import { BookOpen, Download, ExternalLink, FileText } from "lucide-react";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DOC_ORDER, DOC_TYPES } from "@/lib/doc-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "របៀបប្រើ" };

type Guide = { id: string; name: string; meta: string | null };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ doc?: string; g?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const rows = await query<Guide>("SELECT id, name, meta FROM asset WHERE kind = 'help' ORDER BY sort_order, created_at");
  const guides = rows.map((r) => {
    let m: { title?: string; doc?: string } = {};
    try { m = JSON.parse(r.meta || "{}"); } catch { /* ignore */ }
    return { id: r.id, title: m.title || r.name, doc: m.doc || "general" };
  });
  const filters = [["all", "ទាំងអស់"], ["general", "ទូទៅ"], ...DOC_ORDER.map((k) => [DOC_TYPES[k].slug, DOC_TYPES[k].label] as const)];
  const doc = filters.some(([k]) => k === sp.doc) ? sp.doc! : "all";
  const shown = guides.filter((g) => doc === "all" || g.doc === doc);
  const current = shown.find((g) => g.id === sp.g) ?? shown[0];
  const qs = (d: string, g?: string) => `/help?doc=${d}${g ? `&g=${g}` : ""}`;

  return (
    <div>
      <PageHeader title="របៀបប្រើប្រាស់" description="ឯកសារណែនាំជា PDF សម្រាប់មុខងារនីមួយៗ" />
      <div className="mb-4 flex flex-wrap gap-2" data-testid="help-filters">
        {filters.map(([k, label]) => (
          <Link key={k} href={qs(k)} className={cn("rounded-full border px-3 py-1 text-sm", doc === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{label}</Link>
        ))}
      </div>
      {guides.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground" data-testid="help-empty">
          <BookOpen className="mx-auto mb-2 size-8" />
          មិនទាន់មានឯកសារណែនាំទេ — អេដមីនអាចផ្ទុក PDF នៅ «គ្រប់គ្រង → ការកំណត់ប្រព័ន្ធ → របៀបប្រើ»
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">មិនទាន់មានឯកសារសម្រាប់មុខងារនេះទេ</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-1" data-testid="help-list">
            {shown.map((g) => (
              <li key={g.id}>
                <Link href={qs(doc, g.id)} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted", current?.id === g.id && "border-primary bg-primary/5 font-medium")}>
                  <FileText className="size-4 shrink-0 text-primary" /> <span className="line-clamp-2">{g.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          {current && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{current.title}</h2>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`/api/asset/${current.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> បើកទំព័រថ្មី</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={`/api/asset/${current.id}?download=1`}><Download className="size-4" /> ទាញយក</a></Button>
                </div>
              </div>
              <iframe key={current.id} src={`/api/asset/${current.id}#view=FitH`} title={current.title} className="h-[78vh] w-full rounded-lg border bg-white" data-testid="help-viewer" />
              <p className="text-xs text-muted-foreground">បើ PDF មិនបង្ហាញលើទូរស័ព្ទ សូមចុច «បើកទំព័រថ្មី» ឬ «ទាញយក»។</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
