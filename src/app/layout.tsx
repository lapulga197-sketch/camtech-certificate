import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource/kantumruy-pro/400.css";
import "@fontsource/kantumruy-pro/500.css";
import "@fontsource/kantumruy-pro/600.css";
import "@fontsource/kantumruy-pro/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ស្ទូឌីយោឯកសារ — សញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិត កាតសិស្ស",
  description: "រចនា និងបោះពុម្ពសញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិតសរសើរ លិខិតជូនពរ និងកាតសិស្ស",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
