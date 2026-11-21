import "server-only";
import { cache } from "react";
import { query } from "@/lib/db";
import { DEFAULTS, SETTING_KEYS, type SettingKey, type SiteSettings } from "@/lib/settings-types";

/** All settings, merged over the defaults (one query per request). */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const out: SiteSettings = structuredClone(DEFAULTS);
  try {
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM app_setting WHERE key = ANY($1)", [SETTING_KEYS]);
    for (const r of rows) {
      try {
        const v = JSON.parse(r.value);
        if (v && typeof v === "object") (out as Record<string, unknown>)[r.key] = { ...(DEFAULTS[r.key as SettingKey] as object), ...v };
      } catch {
        /* ignore a corrupt row */
      }
    }
  } catch {
    /* database not reachable — render with defaults */
  }
  return out;
});

export async function saveSetting<K extends SettingKey>(key: K, value: SiteSettings[K]): Promise<void> {
  await query(
    "INSERT INTO app_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
    [key, JSON.stringify(value)]
  );
}
