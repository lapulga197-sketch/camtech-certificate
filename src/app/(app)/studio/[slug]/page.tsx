import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { requireUser } from "@/lib/session";
import { docBySlug } from "@/lib/doc-types";
import { listTemplates } from "@/studio/actions";
import { logActivity } from "@/lib/activity";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DocStudio } from "@/studio/studio";

export const dynamic = "force-dynamic";

export default async function DocStudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = docBySlug(slug);
  if (!cfg) notFound();
  const user = await requireUser();
  const [templates] = await Promise.all([
    listTemplates(user.id, cfg.key).catch(() => []),
    logActivity("open", { userId: user.id, email: user.email, doc: cfg.key }),
  ]);

  return (
    <div>
      <PageHeader
        title={cfg.label}
        description={cfg.desc}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/help?doc=${cfg.slug}`} data-testid="doc-help"><BookOpen className="size-4" /> របៀបប្រើ</Link></Button>
            <Button asChild variant="outline">
              <Link href="/studio"><ArrowLeft className="size-4" /> ប្រភេទឯកសារ</Link>
            </Button>
          </div>
        }
      />
      <DocStudio
        key={cfg.key}
        doc={cfg.key}
        org={{
          name: user.org_name || "ឈ្មោះមជ្ឈមណ្ឌល",
          nameEn: user.org_name_en || "",
          logo: user.org_logo,
          address: user.org_address || "",
          phone: user.org_phone || "",
        }}
        templates={templates}
        isAdmin={user.role === "SUPER_ADMIN" || user.role === "ADMIN"}
      />
    </div>
  );
}
