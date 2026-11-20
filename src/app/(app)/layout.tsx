import Link from "next/link";
import { BadgeCheck, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { isAdmin, ROLE_LABEL } from "@/lib/users";
import { queryOne } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  let pending = 0;
  if (admin) {
    const r = await queryOne<{ n: string }>("SELECT count(*)::text AS n FROM app_user WHERE status = 'PENDING'");
    pending = Number(r?.n ?? 0);
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-4 py-2">
          <Link href="/studio" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BadgeCheck className="size-4" />
            </span>
            <span className="hidden sm:inline">ស្ទូឌីយោឯកសារ</span>
          </Link>
          <nav className="ml-4 flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm"><Link href="/studio">ស្ទូឌីយោ</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/account"><UserCog className="size-4" /> គណនី</Link></Button>
            {admin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/users">
                  <ShieldCheck className="size-4" /> អ្នកប្រើប្រាស់
                  {pending > 0 && (
                    <span className="ml-1 rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground" data-testid="pending-count">{pending}</span>
                  )}
                </Link>
              </Button>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-medium">{user.name}</span>
              <span className="text-muted-foreground">{ROLE_LABEL[user.role]}</span>
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <Button type="submit" variant="outline" size="sm"><LogOut className="size-4" /> ចាកចេញ</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1700px] p-4 sm:p-6">{children}</main>
    </div>
  );
}
