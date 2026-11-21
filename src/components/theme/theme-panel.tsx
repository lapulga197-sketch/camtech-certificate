"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, RotateCcw, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ACCENT_COLORS, type ThemeDefaults } from "@/lib/settings-types";
import { applyTheme, readTheme, storeTheme, type ThemePrefs } from "@/lib/theme";
import { saveMyTheme, saveDefaultTheme } from "@/app/(app)/theme-actions";

const MODES = [
  { id: "light", label: "ស្រាល", icon: Sun },
  { id: "dark", label: "ងងឹត", icon: Moon },
  { id: "system", label: "តាមឧបករណ៍", icon: Monitor },
] as const;

const BG_PRESETS = ["#ffffff", "#f8fafc", "#fefce8", "#f0fdf4", "#fdf2f8", "#eff6ff", "#1e1e2e", "#0f172a", "#18181b"];

/** Pre-sets the old TCC system used: neutral black buttons + light/dark. */
const CLASSIC: ThemePrefs = { mode: "system", accent: "default", primary: "", bg: "" };

export function ThemeButton({ defaults, isAdmin, serverPrefs }: { defaults: ThemeDefaults; isAdmin: boolean; serverPrefs: ThemePrefs | null }) {
  const [t, setT] = useState<ThemePrefs>(defaults);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Account preference (saved on the server) wins, then this browser, then the admin default.
    const initial = serverPrefs ?? readTheme(defaults);
    if (serverPrefs) storeTheme(serverPrefs);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setT(initial);
    applyTheme(initial);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => initial.mode === "system" && applyTheme(initial);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [serverPrefs, defaults]);

  function change(next: ThemePrefs) {
    setT(next);
    applyTheme(next);
    storeTheme(next);
  }
  async function persist(next: ThemePrefs) {
    change(next);
    void saveMyTheme(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="theme-open"><Palette className="size-4" /> <span className="hidden md:inline">រូបរាង</span></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="theme-panel">
        <DialogHeader>
          <DialogTitle>រូបរាង និងពណ៌</DialogTitle>
          <DialogDescription>ជ្រើសរើសម៉ូតភ្លឺ / ងងឹត ពណ៌ប៊ូតុង និងពណ៌ផ្ទៃ — រក្សាទុកក្នុងគណនីរបស់អ្នក។</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>ម៉ូត</Label>
            <div className="flex flex-wrap gap-2">
              {MODES.map(({ id, label, icon: Icon }) => (
                <Button key={id} type="button" size="sm" variant={t.mode === id ? "default" : "outline"} onClick={() => persist({ ...t, mode: id })} data-testid={`mode-${id}`}>
                  <Icon className="size-4" /> {label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => persist(CLASSIC)} title="ដូចប្រព័ន្ធ TCC ចាស់ (ខ្មៅ/ស ស្វ័យប្រវត្តិ)" data-testid="mode-classic">
                <RotateCcw className="size-4" /> ដូចប្រព័ន្ធចាស់
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ពណ៌ប៊ូតុង</Label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((c) => (
                <button key={c.id} type="button" title={c.label} onClick={() => persist({ ...t, accent: c.id, primary: "" })} className="flex flex-col items-center gap-1" data-testid={`accent-${c.id}`}>
                  <span className={cn("flex size-8 items-center justify-center rounded-full border-2", t.accent === c.id && !t.primary ? "border-foreground" : "border-transparent")} style={{ background: c.swatch }}>
                    {t.accent === c.id && !t.primary && <Check className="size-4 text-white drop-shadow" />}
                  </span>
                </button>
              ))}
              <label className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground" title="ជ្រើសពណ៌ខ្លួនឯង">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(t.primary) ? t.primary : "#2563eb"} onChange={(e) => persist({ ...t, accent: "default", primary: e.target.value })} className="size-8 cursor-pointer rounded-full border bg-transparent p-0" data-testid="custom-primary" />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ពណ៌ផ្ទៃ (ផ្ទៃខាងក្រោយ)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {BG_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => persist({ ...t, bg: c })} className={cn("size-7 rounded-md border", t.bg === c && "ring-2 ring-primary")} style={{ background: c }} title={c} />
              ))}
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(t.bg) ? t.bg : "#ffffff"} onChange={(e) => persist({ ...t, bg: e.target.value })} className="size-7 cursor-pointer rounded-md border bg-transparent p-0" data-testid="custom-bg" />
              <Button type="button" size="sm" variant="ghost" onClick={() => persist({ ...t, bg: "" })}>លំនាំដើម</Button>
            </div>
          </div>

          {isAdmin && (
            <div className="border-t pt-3">
              <Button type="button" size="sm" variant="outline" data-testid="theme-default" onClick={async () => {
                const r = await saveDefaultTheme(t);
                if (r.success) toast.success("បានកំណត់ជារូបរាងលំនាំដើមសម្រាប់អ្នកប្រើថ្មីទាំងអស់");
                else toast.error(r.message || "មានបញ្ហា");
              }}>
                កំណត់ជាលំនាំដើមសម្រាប់អ្នកប្រើទាំងអស់
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
