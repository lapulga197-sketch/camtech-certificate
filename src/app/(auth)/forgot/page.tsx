import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { mailConfigured } from "@/lib/mail";
import { ForgotForm } from "./forgot-form";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  const { brand } = await getSettings();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <ForgotForm mail={mailConfigured()} brand={{ appName: brand.appName, logoUrl: assetUrl(brand.logoId) }} />
    </div>
  );
}
