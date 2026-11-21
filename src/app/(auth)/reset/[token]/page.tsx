import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { resetTokenValid } from "@/lib/users";
import { AuthFrame } from "@/components/shared/auth-frame";
import { CardContent } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { brand } = await getSettings();
  const b = { appName: brand.appName, logoUrl: assetUrl(brand.logoId) };
  let valid = false;
  try {
    valid = await resetTokenValid(token);
  } catch {
    valid = false;
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      {valid ? (
        <ResetForm token={token} brand={b} />
      ) : (
        <AuthFrame brand={b} title="តំណផុតកំណត់" description="តំណនេះមិនត្រឹមត្រូវ ឬបានប្រើរួចហើយ ឬផុតកំណត់ (១ ម៉ោង)">
          <CardContent>
            <p className="text-center text-sm"><Link href="/forgot" className="font-medium text-primary underline">ស្នើតំណថ្មី</Link></p>
          </CardContent>
        </AuthFrame>
      )}
    </div>
  );
}
