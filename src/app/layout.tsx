import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/settings";
import { assetUrl } from "@/lib/settings-types";
import { themeInitScript } from "@/lib/theme";
import "@fontsource/kantumruy-pro/400.css";
import "@fontsource/kantumruy-pro/500.css";
import "@fontsource/kantumruy-pro/600.css";
import "@fontsource/kantumruy-pro/700.css";
import "./globals.css";

// Brand name, favicon and default theme come from the database, so this layout is rendered per request.
export const dynamic = "force-dynamic";

const DEFAULT_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#171717"/><path d="M32 12l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6v-8h8z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M24 33l6 6 11-12" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getSettings();
  const fav = assetUrl(brand.faviconId);
  const icon = assetUrl(brand.iconId);
  return {
    title: { default: brand.appName, template: `%s · ${brand.appName}` },
    description: brand.tagline || brand.appName,
    applicationName: brand.appName,
    icons: {
      icon: [{ url: fav ?? icon ?? DEFAULT_FAVICON }],
      shortcut: [{ url: fav ?? icon ?? DEFAULT_FAVICON }],
      apple: icon ? [{ url: icon }] : fav ? [{ url: fav }] : undefined,
    },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getSettings();
  return (
    <html lang="km" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(theme) }} />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
