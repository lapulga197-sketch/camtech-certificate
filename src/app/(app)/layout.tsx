import Link from "next/link";
import { BadgeCheck, BarChart3, BookOpen, ChevronDown, Contact, Frame, Info, LogOut, Settings, ShieldCheck, UserCog } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { isAdmin, ROLE_LABEL } from "@/lib/users";
import { queryOne } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeButton } from "@/components/theme/theme-panel";
import type { ThemePrefs } from "@/lib/theme";

export const dynamic = "force-dynamic";

function parseTheme(raw: string | null): ThemePrefs | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw)?.theme;
    return t && typeof t.mode === "string" ? { mode: t.mode, accent: t.accent ?? "default", primary: t.primary ?? "", bg: t.bg ?? "" } : null;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const { brand, theme, contact } = await getSettings();
  const logo = assetUrl(brand.logoId);
  let pending = 0;
  if (admin) {
    const r = await queryOne<{ n: string }>("SELECT count(*)::text AS n FROM app_user WHERE status = 'PENDING' OR reset_requested_at IS NOT NULL");
    pending = Number(r?.n ?? 0);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="no-print sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
          <Link href="/studio" className="flex items-center gap-2 font-semibold" data-testid="brand-link">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-8 rounded-lg object-contain" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BadgeCheck className="size-4" />
              </span>
            )}
            <span className="hidden max-w-[16rem] truncate sm:inline" data-testid="brand-name">{brand.appName}</span>
          </Link>
          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto text-sm md:order-none md:ml-4 md:w-auto" data-testid="main-nav">
            <Button asChild variant="ghost" size="sm"><Link href="/studio">ស្ទូឌីយោ</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/help" data-testid="nav-help"><BookOpen className="size-4" /> របៀបប្រើ</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/about" data-testid="nav-about"><Info className="size-4" /> អំពីយើង</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/contact" data-testid="nav-contact"><Contact className="size-4" /> ទំនាក់ទំនង</Link></Button>
            {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="nav-admin">
                    <ShieldCheck className="size-4" /> គ្រប់គ្រង <ChevronDown className="size-3" />
                    {pending > 0 && (
                      <span className="ml-1 rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground" data-testid="pending-count">{pending}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild><Link href="/admin/users"><UserCog className="size-4" /> អ្នកប្រើប្រាស់{pending > 0 ? ` (${pending})` : ""}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/admin/stats" data-testid="nav-stats"><BarChart3 className="size-4" /> ស្ថិតិ</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/admin/frames" data-testid="nav-frames"><Frame className="size-4" /> ស៊ុម / ម៉ូតឯកសារ</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/admin/settings" data-testid="nav-settings"><Settings className="size-4" /> ការកំណត់ប្រព័ន្ធ</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeButton defaults={theme} isAdmin={admin} serverPrefs={parseTheme(user.prefs)} />
            <Button asChild variant="ghost" size="sm"><Link href="/account" data-testid="nav-account"><UserCog className="size-4" /> <span className="hidden md:inline">គណនី</span></Link></Button>
            <span className="hidden text-right text-xs leading-tight lg:block">
              <span className="block font-medium">{user.name}</span>
              <span className="text-muted-foreground">{ROLE_LABEL[user.role]}</span>
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <Button type="submit" variant="outline" size="sm"><LogOut className="size-4" /> <span className="hidden sm:inline">ចាកចេញ</span></Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1700px] flex-1 p-4 sm:p-6">{children}</main>
      <footer className="no-print border-t bg-background/60 px-4 py-3 text-center text-xs text-muted-foreground" data-testid="footer">
        {brand.footer || `© ${new Date().getFullYear()} ${brand.appName}`}
        {contact.items.length > 0 && (
          <span className="ml-2">
            {contact.items.slice(0, 4).map((c, i) => (
              <span key={i}>{i > 0 && " · "}{c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" className="underline">{c.label}</a> : c.label}</span>
            ))}
          </span>
        )}
      </footer>
    </div>
  );
}
