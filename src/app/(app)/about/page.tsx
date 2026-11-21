import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "អំពីយើង" };

export default async function AboutPage() {
  const [{ about, brand }, me] = await Promise.all([getSettings(), currentUser()]);
  const img = assetUrl(about.imageId);
  const empty = !about.body && !img && about.links.length === 0;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={about.title} description={brand.tagline} />
      <div className="space-y-5 rounded-lg border bg-card p-5 sm:p-7" data-testid="about-card">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="mx-auto max-h-80 rounded-lg object-contain" data-testid="about-image" />
        )}
        {about.body && <div className="space-y-3 whitespace-pre-line text-base leading-relaxed" data-testid="about-text">{about.body}</div>}
        {about.links.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="about-links">
            {about.links.map((l, i) => l.href ? (
              <Button key={i} asChild variant="outline" size="sm"><a href={l.href} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> {l.label}{l.value ? ` — ${l.value}` : ""}</a></Button>
            ) : (
              <span key={i} className="rounded-md border px-3 py-1 text-sm">{l.label}{l.value ? ` — ${l.value}` : ""}</span>
            ))}
          </div>
        )}
        {empty && <p className="text-center text-muted-foreground">មិនទាន់មានខ្លឹមសារទេ។</p>}
        {me && isAdmin(me.role) && (
          <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs text-primary underline"><Pencil className="size-3" /> កែទំព័រនេះ</Link>
        )}
      </div>
    </div>
  );
}
