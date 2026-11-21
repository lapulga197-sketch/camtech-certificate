/** Shared (client + server) shape of the admin-editable site settings. */

export type Brand = {
  appName: string;
  tagline: string;
  faviconId: string | null;
  iconId: string | null;
  logoId: string | null;
  footer: string;
};

export type WelcomeImage = { assetId: string; caption: string };
export type Welcome = {
  enabled: boolean;
  title: string;
  body: string;
  images: WelcomeImage[];
};

export type LinkItem = { label: string; value: string; href: string };
export type About = { title: string; body: string; imageId: string | null; links: LinkItem[] };
export type Contact = { title: string; intro: string; items: LinkItem[] };

export type ThemeDefaults = {
  mode: "light" | "dark" | "system";
  accent: string;
  primary: string; // custom button colour (#rrggbb) or ""
  bg: string; // custom background colour or ""
};

export type SiteSettings = { brand: Brand; welcome: Welcome; about: About; contact: Contact; theme: ThemeDefaults };

export const DEFAULTS: SiteSettings = {
  brand: { appName: "ស្ទូឌីយោឯកសារ", tagline: "សញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិត កាតសិស្ស", faviconId: null, iconId: null, logoId: null, footer: "" },
  welcome: {
    enabled: true,
    title: "សូមស្វាគមន៍មកកាន់ស្ទូឌីយោឯកសារ",
    body: "រចនា និងបោះពុម្ពសញ្ញាបត្រ ប័ណ្ណសរសើរ លិខិតសរសើរ លិខិតជូនពរ និងកាតសិស្ស បានយ៉ាងងាយស្រួល។",
    images: [],
  },
  about: { title: "អំពីយើង", body: "", imageId: null, links: [] },
  contact: { title: "ទំនាក់ទំនង", intro: "សូមទាក់ទងមកយើងតាមរយៈ៖", items: [] },
  theme: { mode: "system", accent: "default", primary: "", bg: "" },
};

export type SettingKey = keyof SiteSettings;
export const SETTING_KEYS: SettingKey[] = ["brand", "welcome", "about", "contact", "theme"];

export const ACCENT_COLORS = [
  { id: "default", label: "លំនាំដើម (ខ្មៅ)", swatch: "oklch(0.205 0 0)" },
  { id: "blue", label: "ខៀវ", swatch: "oklch(0.55 0.2 255)" },
  { id: "green", label: "បៃតង", swatch: "oklch(0.55 0.16 150)" },
  { id: "purple", label: "ស្វាយ", swatch: "oklch(0.5 0.22 300)" },
  { id: "rose", label: "ក្រហម", swatch: "oklch(0.55 0.22 15)" },
  { id: "amber", label: "លឿង", swatch: "oklch(0.65 0.18 75)" },
  { id: "gradient-sunset", label: "ថ្ងៃលិច", swatch: "linear-gradient(135deg, oklch(0.65 0.22 30), oklch(0.6 0.24 350))" },
  { id: "gradient-ocean", label: "សមុទ្រ", swatch: "linear-gradient(135deg, oklch(0.6 0.2 250), oklch(0.65 0.16 195))" },
  { id: "gradient-forest", label: "ព្រៃឈើ", swatch: "linear-gradient(135deg, oklch(0.55 0.18 150), oklch(0.7 0.19 110))" },
] as const;

export function assetUrl(id: string | null | undefined): string | null {
  return id && /^[a-f0-9]{32}$/.test(id) ? `/api/asset/${id}` : null;
}
