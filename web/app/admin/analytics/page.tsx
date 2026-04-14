import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Analytics | Care Ministry" };

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-cal-ink-muted">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-cal-page">
        <div className="h-2 rounded-full bg-cal-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reqs } = await supabase.from("visit_requests").select("status, created_at, deleted_at");
  const { data: assigns } = await supabase.from("visit_assignments").select("status, created_at");

  const activeReqs = (reqs ?? []).filter((r) => !(r as { deleted_at?: string | null }).deleted_at);
  const reqByStatus = new Map<string, number>();
  for (const r of activeReqs) {
    const s = String((r as { status?: string }).status ?? "unknown");
    reqByStatus.set(s, (reqByStatus.get(s) ?? 0) + 1);
  }
  const assignByStatus = new Map<string, number>();
  for (const a of assigns ?? []) {
    const s = String((a as { status?: string }).status ?? "unknown");
    assignByStatus.set(s, (assignByStatus.get(s) ?? 0) + 1);
  }

  const maxReq = Math.max(1, ...[...reqByStatus.values()]);
  const maxAssign = Math.max(1, ...[...assignByStatus.values()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cal-ink">Analytics</h1>
        <p className="mt-1 text-sm text-cal-ink-muted">High-level counts for coordination and reporting.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-cal-ink-muted">Visit requests (all time)</p>
          <p className="mt-2 text-3xl font-semibold text-cal-ink">{reqs?.length ?? 0}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-cal-ink-muted">Active requests (not archived)</p>
          <p className="mt-2 text-3xl font-semibold text-cal-ink">{activeReqs.length}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-medium text-cal-ink-muted">Assignments (all time)</p>
          <p className="mt-2 text-3xl font-semibold text-cal-ink">{assigns?.length ?? 0}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface space-y-4 p-4">
          <h2 className="text-lg font-semibold text-cal-ink">Request status</h2>
          <div className="space-y-3">
            {[...reqByStatus.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxReq} />
              ))}
          </div>
        </div>
        <div className="card-surface space-y-4 p-4">
          <h2 className="text-lg font-semibold text-cal-ink">Assignment outcomes</h2>
          <div className="space-y-3">
            {[...assignByStatus.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxAssign} />
              ))}
          </div>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-lg font-semibold text-cal-ink">Exports</h2>
        <p className="text-sm text-cal-ink-muted">
          Download CSV summaries for spreadsheets, or a PDF snapshot of the visitor log.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-cal-primary">
          <li>
            <a className="underline" href="/api/admin/export-analytics-summary-csv">
              Analytics summary (CSV)
            </a>
          </li>
          <li>
            <a className="underline" href="/api/admin/export-requests-csv">
              Visit requests (CSV)
            </a>
          </li>
          <li>
            <a className="underline" href="/api/admin/export-assignments-csv">
              Assignments (CSV)
            </a>
          </li>
          <li>
            <a className="underline" href="/api/admin/visitor-log-pdf">
              Visitor log (PDF)
            </a>
          </li>
        </ul>
        <p className="text-sm text-cal-ink-muted">
          Tip: open the visitor log page for a tabular view with the same downloads at the bottom.
        </p>
        <Link href="/admin/visitor-log" className="text-sm text-cal-primary underline">
          Open visitor log
        </Link>
      </section>
    </div>
  );
}
