import { BadgeCheck, CheckCircle2, XCircle } from "lucide-react";
import { queryOne } from "@/lib/db";
import { allow } from "@/lib/security";
import { clientInfo } from "@/lib/request-info";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateKh } from "@/lib/utils";
import { DOC_TYPES } from "@/lib/doc-types";
import type { DocType } from "@/lib/certificate-design";

export const dynamic = "force-dynamic";

type Row = { doc_no: string; doc_type: DocType; recipient_name: string; detail: string | null; org_name: string | null; issued_date: string; revoked: boolean };

export default async function VerifyPage({ params }: { params: Promise<{ docNo: string }> }) {
  const { docNo } = await params;
  let row: Row | null = null;
  let limited = false;
  try {
    // stops scripts from walking through document numbers
    limited = !(await allow(`vf:${(await clientInfo()).ip}`, 60, 600));
    if (!limited) row = await queryOne<Row>("SELECT doc_no, doc_type, recipient_name, detail, org_name, issued_date, revoked FROM issued_doc WHERE doc_no = $1", [decodeURIComponent(docNo)]);
  } catch {
    row = null;
  }
  if (limited) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-center text-muted-foreground">ស្នើច្រើនដងពេក — សូមរង់ចាំបន្តិច ហើយសាកម្តងទៀត។</p>
      </div>
    );
  }
  const label = row ? DOC_TYPES[row.doc_type]?.label ?? "ឯកសារ" : "ឯកសារ";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 pt-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BadgeCheck className="size-6" /></div>
          <h1 className="text-lg font-semibold">ការផ្ទៀងផ្ទាត់ឯកសារ</h1>
          {!row ? (
            <>
              <XCircle className="size-12 text-destructive" />
              <p className="font-medium text-destructive">រកមិនឃើញឯកសារនេះទេ</p>
              <p className="text-sm text-muted-foreground">លេខ៖ {docNo}</p>
            </>
          ) : !row.revoked ? (
            <>
              <CheckCircle2 className="size-12 text-success" />
              <p className="font-medium text-success">{label}នេះមានសុពលភាព</p>
              <div className="mt-2 w-full space-y-1 rounded-lg border bg-muted/30 p-4 text-left text-sm">
                <p><span className="text-muted-foreground">ឈ្មោះ៖</span> {row.recipient_name}</p>
                {row.detail && <p><span className="text-muted-foreground">ព័ត៌មាន៖</span> {row.detail}</p>}
                {row.org_name && <p><span className="text-muted-foreground">ចេញដោយ៖</span> {row.org_name}</p>}
                <p><span className="text-muted-foreground">ថ្ងៃចេញ៖</span> {formatDateKh(row.issued_date + "T00:00:00+07:00")}</p>
                <p><span className="text-muted-foreground">លេខ៖</span> <span className="font-mono">{row.doc_no}</span></p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="size-12 text-destructive" />
              <p className="font-medium text-destructive">{label}នេះត្រូវបានដកហូត</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
