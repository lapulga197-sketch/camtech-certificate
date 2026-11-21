import Link from "next/link";
import { Award, CreditCard, FileHeart, FileText, Mail, Pencil } from "lucide-react";
import { currentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { isAdmin } from "@/lib/users";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DOC_ORDER, DOC_TYPES } from "@/lib/doc-types";
import type { DocType } from "@/lib/certificate-design";

const ICONS: Record<DocType, React.ReactNode> = {
  certificate: <FileText className="size-6" />,
  award: <Award className="size-6" />,
  appreciation_letter: <Mail className="size-6" />,
  greeting: <FileHeart className="size-6" />,
  student_card: <CreditCard className="size-6" />,
};

export default async function StudioHome() {
  const [{ welcome }, me] = await Promise.all([getSettings(), currentUser()]);
  const showWelcome = welcome.enabled && (welcome.title || welcome.body || welcome.images.length > 0);
  return (
    <div>
      {showWelcome && (
        <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="welcome-card">
          <CardContent className="flex flex-col gap-5 pt-2 md:flex-row md:items-center">
            <div className="min-w-0 flex-1 space-y-2">
              {welcome.title && <h2 className="text-xl font-semibold sm:text-2xl" data-testid="welcome-heading">{welcome.title}</h2>}
              {welcome.body && <p className="whitespace-pre-line text-base text-muted-foreground" data-testid="welcome-text">{welcome.body}</p>}
              {me && isAdmin(me.role) && (
                <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs text-primary underline"><Pencil className="size-3" /> កែផ្ទាំងស្វាគមន៍</Link>
              )}
            </div>
            {welcome.images.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-4" data-testid="welcome-images">
                {welcome.images.map((im) => (
                  <figure key={im.assetId} className="w-36 text-center sm:w-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={assetUrl(im.assetId) ?? ""} alt={im.caption} className="mx-auto aspect-square w-full rounded-lg border bg-white object-contain p-1" />
                    {im.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{im.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <PageHeader title="ស្ទូឌីយោឯកសារ" description="ជ្រើសរើសប្រភេទឯកសារដែលចង់រចនា — អូសរៀបធាតុ, ជ្រើសម៉ូត, ដាក់រូបផ្ទៃ, watermark, រូបថត រួចទាញយកជារូប ឬ PDF" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DOC_ORDER.map((k) => {
          const d = DOC_TYPES[k];
          return (
            <Link key={k} href={`/studio/${d.slug}`} data-testid={`doc-${d.slug}`} className="group">
              <Card className="h-full transition group-hover:border-primary group-hover:shadow-md">
                <CardContent className="flex gap-4 pt-2">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{ICONS[k]}</span>
                  <span>
                    <span className="block text-lg font-semibold">{d.label}</span>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">{d.labelEn}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{d.desc}</span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
