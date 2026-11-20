import Link from "next/link";
import { Award, CreditCard, FileHeart, FileText, Mail } from "lucide-react";
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

export default function StudioHome() {
  return (
    <div>
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
