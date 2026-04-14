import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Volunteer offers | Care Ministry" };

export default async function AdminVolunteerOffersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("visit_offers")
    .select("id, visit_request_id, member_id, created_at")
    .order("created_at", { ascending: false });

  const rows = offers ?? [];
  const requestIds = [...new Set(rows.map((o) => o.visit_request_id))];
  const memberIds = [...new Set(rows.map((o) => o.member_id))];

  const { data: requests } = requestIds.length
    ? await supabase
        .from("visit_requests")
        .select("id, congregant_name, status, deleted_at")
        .in("id", requestIds)
    : { data: [] as { id: string; congregant_name: string; status: string; deleted_at: string | null }[] };

  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const reqMap = new Map((requests ?? []).map((r) => [r.id, r]));
  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cal-ink">Volunteer offers</h1>
        <p className="mt-1 max-w-2xl text-sm text-cal-ink-muted">
          Care team members who tapped &quot;I can help&quot; on open visits. Assign and notify from each request
          detail page; offers clear when someone is assigned for that request.
        </p>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-cal-border text-xs uppercase text-cal-ink-muted">
            <tr>
              <th className="px-4 py-3">Offered</th>
              <th className="px-4 py-3">Volunteer</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3">Request status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const vr = reqMap.get(o.visit_request_id);
              const pr = profMap.get(o.member_id);
              const open =
                vr && vr.status === "new" && !vr.deleted_at;
              return (
                <tr key={o.id} className="border-b border-cal-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-cal-ink-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-cal-ink">
                    {pr?.display_name ?? o.member_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium text-cal-ink">
                    {vr?.congregant_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {vr ? (
                      <span
                        className={
                          open
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-950"
                            : "rounded-full bg-cal-page px-2 py-0.5 text-xs text-cal-ink-muted"
                        }
                      >
                        {vr.status}
                        {vr.deleted_at ? " · archived" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {vr ? (
                      <Link
                        href={`/admin/requests/${vr.id}`}
                        className="text-cal-primary underline"
                      >
                        Open request
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-sm text-cal-ink-muted">No volunteer offers yet.</p>
        ) : null}
      </div>
    </div>
  );
}
