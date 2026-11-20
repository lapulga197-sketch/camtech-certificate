import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const sp = await searchParams;
  let user = null;
  try {
    user = await currentUser();
  } catch {
    /* database not reachable yet — still show the form (it reports the problem on submit) */
  }
  if (user) redirect("/studio");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense>
        <LoginForm registered={sp.registered === "1"} />
      </Suspense>
    </div>
  );
}
