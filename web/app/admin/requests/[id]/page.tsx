import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { memberIdsAvailableForWindow } from "@/lib/matching";
import { assignAndNotify, updateVisitWindow } from "../../actions";
import { gatewayLabel } from "@/lib/mms-carriers";

type AvailabilityRow = Database["public"]["Tables"]["availability_blocks"]["Row"];

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("visit_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!req) {
    return <p className="text-sm text-zinc-500">Request not found.</p>;
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, phone_digits, mms_gateway_domain, contact_email, role")
    .eq("role", "member");

  const memberIds = members?.map((m) => m.id) ?? [];
  let blocks: AvailabilityRow[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("availability_blocks")
      .select("*")
      .in("user_id", memberIds);
    blocks = data ?? [];
  }

  const map = new Map<string, AvailabilityRow[]>();
  for (const b of blocks ?? []) {
    const list = map.get(b.user_id) ?? [];
    list.push(b);
    map.set(b.user_id, list);
  }

  let availableIds = new Set<string>();
  if (req.visit_window_start && req.visit_window_end) {
    const vs = new Date(req.visit_window_start);
    const ve = new Date(req.visit_window_end);
    availableIds = new Set(memberIdsAvailableForWindow(vs, ve, map));
  }

  const { data: assignments } = await supabase
    .from("visit_assignments")
    .select("id, status, assignee_id, notification_sent_at")
    .eq("visit_request_id", id);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {req.congregant_name}
        </h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{req.address}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Phone: {req.phone}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Status: <span className="font-medium">{req.status}</span>
        </p>
        {req.preferred_times_text ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Preferred: {req.preferred_times_text}
          </p>
        ) : null}
        {req.prayer_requests ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Prayer: {req.prayer_requests}
          </p>
        ) : null}
        {req.special_instructions ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Instructions: {req.special_instructions}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Visit window</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Set a structured start/end so availability matching works. Times use your browser
          local zone; store as ISO in the database.
        </p>
        <form action={updateVisitWindow} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="visit_request_id" value={req.id} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start
            <input
              type="datetime-local"
              name="visit_window_start"
              defaultValue={toLocalInput(req.visit_window_start)}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            End
            <input
              type="datetime-local"
              name="visit_window_end"
              defaultValue={toLocalInput(req.visit_window_end)}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save window
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Care team</h3>
        {!req.visit_window_start || !req.visit_window_end ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Set a visit window above to highlight who is typically available.
          </p>
        ) : null}
        <ul className="mt-4 space-y-3">
          {members?.map((m) => {
            const match = availableIds.has(m.id);
            return (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {m.display_name ?? m.id.slice(0, 8)}
                  </span>
                  {req.visit_window_start && req.visit_window_end ? (
                    <span
                      className={
                        match
                          ? " ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                          : " ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }
                    >
                      {match ? "Overlaps availability" : "No overlap"}
                    </span>
                  ) : null}
                  <div className="mt-1 text-xs text-zinc-500">
                    Phone: {m.phone_digits ?? "—"} · {gatewayLabel(m.mms_gateway_domain)}
                    {m.contact_email ? ` · ${m.contact_email}` : ""}
                  </div>
                </div>
                <form action={assignAndNotify} className="flex flex-col gap-1">
                  <input type="hidden" name="visit_request_id" value={req.id} />
                  <input type="hidden" name="assignee_id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Assign and notify
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Assignments</h3>
        <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {assignments?.map((a) => {
            const member = members?.find((x) => x.id === a.assignee_id);
            return (
              <li key={a.id}>
                {member?.display_name ?? a.assignee_id.slice(0, 8)} — {a.status}
                {a.notification_sent_at
                  ? ` · notified ${new Date(a.notification_sent_at).toLocaleString()}`
                  : ""}
              </li>
            );
          })}
        </ul>
        {!assignments?.length ? <p className="text-sm text-zinc-500">None yet.</p> : null}
      </section>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
