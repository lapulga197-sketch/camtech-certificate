import { BadgeCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type BrandLite = { appName: string; logoUrl: string | null };

/** Card with the animated running-colour border used by every sign-in page. */
export function AuthFrame({ brand, title, description, children, icon, maxW = "max-w-sm" }: {
  brand: BrandLite; title: string; description?: React.ReactNode; children: React.ReactNode; icon?: React.ReactNode; maxW?: string;
}) {
  return (
    <div className={`gradient-border-wrap w-full shadow-xl ${maxW}`} data-testid="auth-frame">
      <div className="gradient-border-inner">
        <Card className="w-full border-0 shadow-none">
          <CardHeader className="flex flex-col items-center text-center">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="mb-2 size-14 rounded-xl object-contain" />
            ) : (
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {icon ?? <BadgeCheck className="size-6" />}
              </div>
            )}
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{brand.appName}</p>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          {children}
        </Card>
      </div>
    </div>
  );
}
