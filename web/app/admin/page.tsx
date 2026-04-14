import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Admin | Care Ministry" };

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const archivedOnly = sp.archived === "1";

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("visit_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const filtered =
    requests?.filter((r) => {
      const archived = Boolean((r as { deleted_at?: string | null }).deleted_at);
      return archivedOnly ? archived : !archived;
    }) ?? [];

  return (
    <div>
      <p className="text-sm text-cal-ink-muted">
        Open a request to set the visit window, see who matches availability, assign someone, and send the MMS/email
        notification.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {!archivedOnly ? (
          <Link className="text-cal-primary underline" href="/admin?archived=1">
            Archived requests
          </Link>
        ) : (
          <Link className="text-cal-primary underline" href="/admin">
            Active requests
          </Link>
        )}
        <Link className="text-cal-primary underline" href="/admin/members">
          Team accounts
        </Link>
      </div>
      <ul className="mt-6 space-y-2">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/requests/${r.id}`}
              className="card-surface flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm hover:opacity-95"
            >
              <span className="font-medium text-cal-ink">{r.congregant_name}</span>
              <span className="text-cal-ink-muted">
                {r.status}
                {r.visit_window_start ? ` · ${new Date(r.visit_window_start).toLocaleString()}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!filtered.length ? (
        <p className="mt-4 text-sm text-cal-ink-muted">{archivedOnly ? "No archived requests." : "No requests yet."}</p>
      ) : null}
    </div>
  );
}
