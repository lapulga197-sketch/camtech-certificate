"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, Pause, Play, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/shared/password-field";
import { deleteUser, resetUserPassword, setUserRole, setUserStatus } from "./actions";

export type UserItem = {
  id: string; name: string; email: string; phone: string | null; role: "SUPER_ADMIN" | "ADMIN" | "USER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"; note: string | null; orgName: string | null;
  createdAt: string; lastLoginAt: string | null; resetRequestedAt: string | null;
};

const STATUS_LABEL = { PENDING: "រង់ចាំអនុម័ត", APPROVED: "បានអនុម័ត", REJECTED: "បានបដិសេធ", SUSPENDED: "ផ្អាក" } as const;
const ROLE_LABEL = { SUPER_ADMIN: "អេដមីនធំ", ADMIN: "អេដមីន", USER: "អ្នកប្រើប្រាស់" } as const;
const TABS = [
  ["PENDING", "រង់ចាំអនុម័ត"], ["APPROVED", "បានអនុម័ត"], ["OTHER", "បដិសេធ / ផ្អាក"], ["ALL", "ទាំងអស់"],
] as const;

export function UsersTable({ users, meId, meRole }: { users: UserItem[]; meId: string; meRole: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(users.some((u) => u.status === "PENDING") ? "PENDING" : "APPROVED");
  const [busy, setBusy] = useState<string | null>(null);
  const [pw, setPw] = useState<{ id: string; value: string } | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => ({
    PENDING: users.filter((u) => u.status === "PENDING").length,
    APPROVED: users.filter((u) => u.status === "APPROVED").length,
    OTHER: users.filter((u) => u.status === "REJECTED" || u.status === "SUSPENDED").length,
    ALL: users.length,
  }), [users]);
  const shown = users.filter((u) => tab === "ALL" || (tab === "OTHER" ? u.status === "REJECTED" || u.status === "SUSPENDED" : u.status === tab));

  async function run(id: string, fn: () => Promise<{ success: boolean; message?: string }>, ok?: string) {
    setBusy(id);
    const r = await fn();
    setBusy(null);
    if (!r.success) toast.error(r.message || "មានបញ្ហាកើតឡើង");
    else {
      if (ok) toast.success(ok);
      startTransition(() => router.refresh());
    }
  }

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }) : "—");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="user-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} data-testid={`utab-${k}`}
            className={cn("rounded-full border px-3 py-1 text-sm", tab === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {label} <span className="opacity-70">({counts[k]})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">គ្មានអ្នកប្រើប្រាស់ក្នុងបញ្ជីនេះទេ</p>
      ) : (
        <ul className="space-y-3" data-testid="user-list">
          {shown.map((u) => {
            const isMe = u.id === meId;
            const locked = isMe || (meRole !== "SUPER_ADMIN" && u.role !== "USER");
            const loading = busy === u.id;
            return (
              <li key={u.id} className="rounded-lg border bg-card p-4" data-testid={`user-${u.email}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {u.name}
                      <Badge variant={u.status === "APPROVED" ? "default" : "secondary"}>{STATUS_LABEL[u.status]}</Badge>
                      {u.role !== "USER" && <Badge variant="outline"><ShieldCheck className="size-3" /> {ROLE_LABEL[u.role]}</Badge>}
                      {u.resetRequestedAt && <Badge variant="outline" className="border-destructive text-destructive" data-testid="reset-flag"><KeyRound className="size-3" /> ស្នើប្តូរលេខសម្ងាត់</Badge>}
                      {isMe && <span className="text-xs text-muted-foreground">(អ្នក)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}{u.orgName ? ` · ${u.orgName}` : ""}</p>
                    {u.note && <p className="mt-1 text-sm">“{u.note}”</p>}
                    <p className="mt-1 text-xs text-muted-foreground">ចុះឈ្មោះ៖ {fmt(u.createdAt)} · ចូលចុងក្រោយ៖ {fmt(u.lastLoginAt)}</p>
                  </div>
                  {!locked && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      {(u.status === "PENDING" || u.status === "REJECTED" || u.status === "SUSPENDED") && (
                        <Button size="sm" disabled={loading} onClick={() => run(u.id, () => setUserStatus(u.id, "APPROVED"), "បានអនុម័ត")} data-testid="approve">
                          {u.status === "SUSPENDED" ? <Play className="size-4" /> : <Check className="size-4" />} {u.status === "SUSPENDED" ? "បើកវិញ" : "អនុម័ត"}
                        </Button>
                      )}
                      {u.status === "PENDING" && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => run(u.id, () => setUserStatus(u.id, "REJECTED"), "បានបដិសេធ")} data-testid="reject">
                          <X className="size-4" /> បដិសេធ
                        </Button>
                      )}
                      {u.status === "APPROVED" && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => run(u.id, () => setUserStatus(u.id, "SUSPENDED"), "បានផ្អាកគណនី")}>
                          <Pause className="size-4" /> ផ្អាក
                        </Button>
                      )}
                      {u.status === "REJECTED" && (
                        <Button size="sm" variant="ghost" disabled={loading} onClick={() => run(u.id, () => setUserStatus(u.id, "PENDING"))}>
                          <Undo2 className="size-4" /> ត្រឡប់ទៅរង់ចាំ
                        </Button>
                      )}
                      {meRole === "SUPER_ADMIN" && u.status === "APPROVED" && (
                        <Button size="sm" variant="ghost" disabled={loading} onClick={() => run(u.id, () => setUserRole(u.id, u.role === "ADMIN" ? "USER" : "ADMIN"), "បានប្តូរតួនាទី")}>
                          <ShieldCheck className="size-4" /> {u.role === "ADMIN" ? "ដកពីអេដមីន" : "តាំងជាអេដមីន"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={loading} onClick={() => setPw(pw?.id === u.id ? null : { id: u.id, value: "" })}>
                        <KeyRound className="size-4" /> លេខសម្ងាត់
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" disabled={loading}
                        onClick={() => { if (window.confirm(`លុបគណនី ${u.name} ព្រមទាំងគំរូរបស់គាត់?`)) void run(u.id, () => deleteUser(u.id), "បានលុប"); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {pw?.id === u.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <div className="min-w-64 flex-1"><PasswordField value={pw.value} onValueChange={(v) => setPw({ id: u.id, value: v })} placeholder="លេខសម្ងាត់ថ្មី" /></div>
                    <Button size="sm" disabled={pw.value.length < 6 || loading} onClick={() => run(u.id, () => resetUserPassword(u.id, pw.value), "បានប្តូរលេខសម្ងាត់ — ប្រាប់ម្ចាស់គណនី").then(() => setPw(null))}>រក្សាទុក</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
