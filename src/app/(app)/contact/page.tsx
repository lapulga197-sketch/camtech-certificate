import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "ទំនាក់ទំនង" };

export default async function ContactPage() {
  const [{ contact }, me] = await Promise.all([getSettings(), currentUser()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={contact.title} description={contact.intro} />
      {contact.items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">មិនទាន់មានព័ត៌មានទំនាក់ទំនងទេ។</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="contact-list">
          {contact.items.map((c, i) => (
            <li key={i} className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              {c.href ? (
                <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-base font-medium text-primary underline">
                  {c.value || c.href} <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                <p className="mt-1 break-all text-base font-medium">{c.value}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {me && isAdmin(me.role) && (
        <Link href="/admin/settings" className="mt-4 inline-flex items-center gap-1 text-xs text-primary underline"><Pencil className="size-3" /> កែទំព័រនេះ</Link>
      )}
    </div>
  );
}
