import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { ACTION_LABEL, RUN_ACTIONS } from "@/lib/activity";
import { DOC_ORDER, DOC_TYPES } from "@/lib/doc-types";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "ស្ថិតិ" };

const TZ = "Asia/Phnom_Penh";
const N = (v: unknown) => Number(v ?? 0);
const fmtN = (n: number) => n.toLocaleString("en-US");
const docLabel = (k: string | null) => (k && DOC_ORDER.includes(k as never) ? DOC_TYPES[k as keyof typeof DOC_TYPES].label : k ? k : "—");
const DEVICE: Record<string, string> = { mobile: "ទូរស័ព្ទ", desktop: "កុំព្យូទ័រ", tablet: "តាប្លែត", unknown: "មិនស្គាល់" };

function Kpi({ label, value, sub, testId }: { label: string; value: string | number; sub?: string; testId?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{typeof value === "number" ? fmtN(value) : value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bars({ rows, testId }: { rows: { label: string; value: number }[]; testId?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">មិនទាន់មានទិន្នន័យ</p>;
  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="tabular-nums text-muted-foreground">{fmtN(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.d)) ? Number(sp.d) : 30;
  const RUNS = RUN_ACTIONS;
  const today = `(now() AT TIME ZONE '${TZ}')::date`;
  const day = `(created_at AT TIME ZONE '${TZ}')::date`;
  const range = `created_at >= now() - make_interval(days => $1)`;

  const [users, active, runs, series, byDoc, byAction, devices, os, browsers, geo, ips, recent, top] = await Promise.all([
    query<{ total: string; approved: string; pending: string; today: string; month: string }>(
      `SELECT count(*) AS total, count(*) FILTER (WHERE status='APPROVED') AS approved, count(*) FILTER (WHERE status='PENDING') AS pending,
              count(*) FILTER (WHERE (created_at AT TIME ZONE '${TZ}')::date = ${today}) AS today,
              count(*) FILTER (WHERE date_trunc('month', created_at AT TIME ZONE '${TZ}') = date_trunc('month', now() AT TIME ZONE '${TZ}')) AS month
       FROM app_user`
    ),
    query<{ today: string; week: string; month: string }>(
      `SELECT count(DISTINCT user_id) FILTER (WHERE ${day} = ${today}) AS today,
              count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS week,
              count(DISTINCT user_id) FILTER (WHERE date_trunc('month', created_at AT TIME ZONE '${TZ}') = date_trunc('month', now() AT TIME ZONE '${TZ}')) AS month
       FROM activity_log WHERE user_id IS NOT NULL AND created_at >= now() - interval '40 days'`
    ),
    query<{ today: string; month: string; range: string }>(
      `SELECT COALESCE(sum(amount) FILTER (WHERE ${day} = ${today}),0) AS today,
              COALESCE(sum(amount) FILTER (WHERE date_trunc('month', created_at AT TIME ZONE '${TZ}') = date_trunc('month', now() AT TIME ZONE '${TZ}')),0) AS month,
              COALESCE(sum(amount) FILTER (WHERE ${range}),0) AS range
       FROM activity_log WHERE action = ANY($2) AND created_at >= now() - interval '70 days'`,
      [days, RUNS]
    ),
    query<{ d: string; runs: string; users: string }>(
      `SELECT to_char(g.d, 'MM-DD') d, COALESCE(a.runs,0) AS runs, COALESCE(a.users,0) AS users
       FROM generate_series(${today} - ($1::int - 1), ${today}, interval '1 day') AS g(d)
       LEFT JOIN (SELECT ${day} AS dd, sum(amount) FILTER (WHERE action = ANY($2)) AS runs, count(DISTINCT user_id) AS users
                  FROM activity_log WHERE ${range} GROUP BY 1) a ON a.dd = g.d::date
       ORDER BY g.d`,
      [days, RUNS]
    ),
    query<{ doc_type: string | null; runs: string; opens: string }>(
      `SELECT doc_type, COALESCE(sum(amount) FILTER (WHERE action = ANY($2)),0) AS runs, count(*) FILTER (WHERE action = 'open') AS opens
       FROM activity_log WHERE ${range} AND doc_type IS NOT NULL GROUP BY doc_type ORDER BY 2 DESC, 3 DESC`,
      [days, RUNS]
    ),
    query<{ action: string; n: string; amount: string }>(
      `SELECT action, count(*) AS n, sum(amount) AS amount FROM activity_log WHERE ${range} GROUP BY action ORDER BY n DESC`, [days]
    ),
    query<{ k: string; n: string }>(`SELECT COALESCE(device,'unknown') AS k, count(*) n FROM activity_log WHERE ${range} AND action IN ('login','open') GROUP BY 1 ORDER BY 2 DESC`, [days]),
    query<{ k: string; n: string }>(`SELECT COALESCE(os,'Other') AS k, count(*) n FROM activity_log WHERE ${range} AND action IN ('login','open') GROUP BY 1 ORDER BY 2 DESC`, [days]),
    query<{ k: string; n: string }>(`SELECT COALESCE(browser,'Other') AS k, count(*) n FROM activity_log WHERE ${range} AND action IN ('login','open') GROUP BY 1 ORDER BY 2 DESC`, [days]),
    query<{ country: string | null; city: string | null; n: string; users: string }>(
      `SELECT country, city, count(*) AS n, count(DISTINCT user_id) AS users FROM activity_log WHERE ${range} AND (country IS NOT NULL OR city IS NOT NULL)
       GROUP BY country, city ORDER BY n DESC LIMIT 15`, [days]
    ),
    query<{ ip: string; n: string; users: string; last: Date }>(
      `SELECT ip, count(*) AS n, count(DISTINCT user_id) AS users, max(created_at) AS last FROM activity_log WHERE ${range} AND ip IS NOT NULL
       GROUP BY ip ORDER BY n DESC LIMIT 12`, [days]
    ),
    query<{ created_at: Date; email: string | null; action: string; doc_type: string | null; amount: number; ip: string | null; country: string | null; city: string | null; device: string | null; os: string | null; browser: string | null }>(
      `SELECT created_at, email, action, doc_type, amount, ip, country, city, device, os, browser FROM activity_log ORDER BY id DESC LIMIT 60`
    ),
    query<{ name: string; email: string; runs: string; events: string; last: Date; ip: string | null; city: string | null; country: string | null }>(
      `SELECT u.name, u.email, COALESCE(sum(l.amount) FILTER (WHERE l.action = ANY($2)),0) AS runs, count(*) AS events, max(l.created_at) AS last,
              (array_agg(l.ip ORDER BY l.id DESC))[1] ip, (array_agg(l.city ORDER BY l.id DESC))[1] city, (array_agg(l.country ORDER BY l.id DESC))[1] country
       FROM activity_log l JOIN app_user u ON u.id = l.user_id WHERE l.${range.replace("created_at", "created_at")}
       GROUP BY u.id ORDER BY runs DESC, events DESC LIMIT 15`,
      [days, RUNS]
    ),
  ]);

  const u = users[0], a = active[0], r = runs[0];
  const fmt = (d: Date) => new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: TZ });
  const maxRuns = Math.max(1, ...series.map((s) => N(s.runs)));
  const place = (c: string | null, ci: string | null) => [ci, c].filter(Boolean).join(", ") || "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="ស្ថិតិប្រើប្រាស់"
        description="ម៉ោងតាមប្រទេសកម្ពុជា — ទីតាំងជាការប៉ាន់ស្មានពី IP (ទិន្នន័យ Vercel) មិនមែនទីតាំងពិតប្រាកដទេ"
        action={
          <div className="flex gap-1" data-testid="stats-range">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/admin/stats?d=${d}`} className={cn("rounded-full border px-3 py-1 text-sm", days === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{d} ថ្ងៃ</Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpis">
        <Kpi testId="kpi-users" label="អ្នកប្រើសរុប" value={N(u.total)} sub={`អនុម័ត ${fmtN(N(u.approved))} · រង់ចាំ ${fmtN(N(u.pending))}`} />
        <Kpi testId="kpi-new" label="ចុះឈ្មោះថ្មី ថ្ងៃនេះ / ខែនេះ" value={`${fmtN(N(u.today))} / ${fmtN(N(u.month))}`} />
        <Kpi testId="kpi-active" label="អ្នកប្រើសកម្ម ថ្ងៃនេះ / ៧ថ្ងៃ / ខែនេះ" value={`${fmtN(N(a.today))} / ${fmtN(N(a.week))} / ${fmtN(N(a.month))}`} />
        <Kpi testId="kpi-runs" label="ការ run មុខងារ (ឯកសារ) ថ្ងៃនេះ / ខែនេះ" value={`${fmtN(N(r.today))} / ${fmtN(N(r.month))}`} sub={`${days} ថ្ងៃចុងក្រោយ៖ ${fmtN(N(r.range))}`} />
      </div>

      <Panel title={`ការ run រាល់ថ្ងៃ (${days} ថ្ងៃ)`}>
        <div className="flex h-36 items-end gap-[2px]" data-testid="daily-chart" role="img" aria-label="ការ run រាល់ថ្ងៃ">
          {series.map((s) => (
            <div key={s.d} className="group relative flex h-full flex-1 items-end" title={`${s.d}: run ${N(s.runs)} · អ្នកប្រើ ${N(s.users)}`}>
              <div className="w-full rounded-t bg-primary/80 transition group-hover:bg-primary" style={{ height: `${Math.max(2, (N(s.runs) / maxRuns) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{series[0]?.d}</span><span>{series[series.length - 1]?.d}</span></div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ការប្រើតាមមុខងារ (ប្រភេទឯកសារ)">
          <Bars testId="by-doc" rows={byDoc.map((x) => ({ label: `${docLabel(x.doc_type)} · បើក ${fmtN(N(x.opens))}`, value: N(x.runs) }))} />
          <p className="mt-2 text-xs text-muted-foreground">រង្វាស់ = ចំនួនឯកសារដែលបាន export / បោះពុម្ព / ចុះបញ្ជី</p>
        </Panel>
        <Panel title="សកម្មភាពតាមប្រភេទ">
          <Bars testId="by-action" rows={byAction.map((x) => ({ label: ACTION_LABEL[x.action] ?? x.action, value: N(x.n) }))} />
        </Panel>
        <Panel title="ឧបករណ៍ (Device)">
          <Bars testId="by-device" rows={devices.map((x) => ({ label: DEVICE[x.k] ?? x.k, value: N(x.n) }))} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">ប្រព័ន្ធប្រតិបត្តិការ</p><Bars rows={os.map((x) => ({ label: x.k, value: N(x.n) }))} /></div>
            <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Browser</p><Bars rows={browsers.map((x) => ({ label: x.k, value: N(x.n) }))} /></div>
          </div>
        </Panel>
        <Panel title="ទីតាំង (ប្រទេស / ក្រុង)">
          <Bars testId="by-geo" rows={geo.map((x) => ({ label: place(x.country, x.city), value: N(x.n) }))} />
          <p className="mt-2 text-xs text-muted-foreground">ទីតាំងបង្ហាញតែនៅពេលដាក់ពង្រាយលើ Vercel (មាន geo header)។</p>
        </Panel>
      </div>

      <Panel title="IP ដែលសកម្មបំផុត">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="ip-table">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3">IP</th><th className="pr-3">សកម្មភាព</th><th className="pr-3">អ្នកប្រើ</th><th>ចុងក្រោយ</th></tr></thead>
            <tbody>{ips.map((x) => <tr key={x.ip} className="border-t"><td className="py-1 pr-3 font-mono text-xs">{x.ip}</td><td className="pr-3 tabular-nums">{fmtN(N(x.n))}</td><td className="pr-3 tabular-nums">{N(x.users)}</td><td>{fmt(x.last)}</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`អ្នកប្រើសកម្មបំផុត (${days} ថ្ងៃ)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="top-users">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3">អ្នកប្រើ</th><th className="pr-3">run</th><th className="pr-3">សកម្មភាព</th><th className="pr-3">IP ចុងក្រោយ</th><th className="pr-3">ទីតាំង</th><th>ចុងក្រោយ</th></tr></thead>
            <tbody>{top.map((x) => (
              <tr key={x.email} className="border-t"><td className="py-1 pr-3">{x.name}<span className="block text-xs text-muted-foreground">{x.email}</span></td><td className="pr-3 tabular-nums">{fmtN(N(x.runs))}</td><td className="pr-3 tabular-nums">{fmtN(N(x.events))}</td><td className="pr-3 font-mono text-xs">{x.ip ?? "—"}</td><td className="pr-3">{place(x.country, x.city)}</td><td>{fmt(x.last)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="សកម្មភាពថ្មីៗ (៦០)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="recent-table">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3">ពេល</th><th className="pr-3">អ្នកប្រើ</th><th className="pr-3">សកម្មភាព</th><th className="pr-3">មុខងារ</th><th className="pr-3">IP</th><th className="pr-3">ទីតាំង</th><th>ឧបករណ៍</th></tr></thead>
            <tbody>{recent.map((x, i) => (
              <tr key={i} className="border-t">
                <td className="whitespace-nowrap py-1 pr-3">{fmt(x.created_at)}</td><td className="pr-3">{x.email ?? "—"}</td>
                <td className="pr-3">{ACTION_LABEL[x.action] ?? x.action}{x.amount > 1 ? ` ×${x.amount}` : ""}</td><td className="pr-3">{docLabel(x.doc_type)}</td>
                <td className="pr-3 font-mono text-xs">{x.ip ?? "—"}</td><td className="pr-3">{place(x.country, x.city)}</td><td className="whitespace-nowrap">{DEVICE[x.device ?? ""] ?? "—"} · {x.os ?? ""} · {x.browser ?? ""}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
