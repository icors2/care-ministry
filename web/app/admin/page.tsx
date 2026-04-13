import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Admin | Care Ministry" };

export default async function AdminHomePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("visit_requests")
    .select("id, congregant_name, status, visit_window_start, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Open a request to set the visit window, see who matches availability, assign someone,
        and send the MMS/email notification.
      </p>
      <ul className="mt-6 space-y-2">
        {requests?.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/requests/${r.id}`}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {r.congregant_name}
              </span>
              <span className="text-zinc-500">
                {r.status}
                {r.visit_window_start
                  ? ` · ${new Date(r.visit_window_start).toLocaleString()}`
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!requests?.length ? (
        <p className="mt-4 text-sm text-zinc-500">No requests yet.</p>
      ) : null}
    </div>
  );
}
