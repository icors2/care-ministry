import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Visitor log | Care Ministry" };

export default async function AdminVisitorLogPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      status,
      created_at,
      accepted_at,
      post_visit_notes,
      visit_requests ( congregant_name, address, phone ),
      profiles ( display_name )
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cal-ink">Visitor log</h1>
        <p className="mt-1 text-sm text-cal-ink-muted">Accepted and historical assignments with notes.</p>
      </div>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-lg font-semibold text-cal-ink">Exports</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="btn-secondary px-3 py-2" href="/api/admin/visitor-log-pdf">
            Download PDF
          </a>
          <a className="btn-secondary px-3 py-2" href="/api/admin/export-assignments-csv">
            Download CSV
          </a>
        </div>
      </section>

      <div className="card-surface overflow-x-auto p-2">
        <table className="min-w-full text-left text-sm text-cal-ink-muted">
          <thead className="text-xs uppercase text-cal-ink">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Congregant</th>
              <th className="px-3 py-2">Assignee</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => {
              const r = row as Record<string, unknown> & {
                visit_requests?: { congregant_name?: string; address?: string; phone?: string } | null;
                profiles?: { display_name?: string | null } | null;
              };
              const vr = Array.isArray(r.visit_requests) ? r.visit_requests[0] : r.visit_requests;
              const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
              return (
                <tr key={String(r.id)} className="border-t border-cal-border">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(String(r.created_at)).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-cal-ink">{vr?.congregant_name}</div>
                    <div className="text-xs">{vr?.address}</div>
                    <div className="text-xs">Phone: {vr?.phone}</div>
                  </td>
                  <td className="px-3 py-2">{prof?.display_name ?? "—"}</td>
                  <td className="px-3 py-2">{String(r.status)}</td>
                  <td className="px-3 py-2 max-w-md whitespace-pre-wrap">{String(r.post_visit_notes ?? "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data?.length ? <p className="p-4 text-sm text-cal-ink-muted">No assignments yet.</p> : null}
      </div>
    </div>
  );
}
