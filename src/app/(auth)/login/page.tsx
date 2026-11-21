import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string; reset?: string }> }) {
  const sp = await searchParams;
  let user = null;
  try {
    user = await currentUser();
  } catch {
    /* database not reachable yet — still show the form (it reports the problem on submit) */
  }
  if (user) redirect("/studio");
  const { brand } = await getSettings();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense>
        <LoginForm registered={sp.registered === "1"} reset={sp.reset === "1"} brand={{ appName: brand.appName, logoUrl: assetUrl(brand.logoId) }} />
      </Suspense>
    </div>
  );
}
