import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import {
  memberIdsAvailableForWindow,
  memberIdsMatchingIntakeWindows,
  memberIdsMatchingPreferredSchedule,
} from "@/lib/matching";
import {
  assignAndNotify,
  archiveVisitRequest,
  restoreVisitRequest,
  setVisitRequestLifecycle,
  updateVisitWindow,
} from "../../actions";
import { gatewayLabel } from "@/lib/mms-carriers";
import { intakeWindowsFromRow } from "@/lib/intake-visit-windows";

type AvailabilityRow = Database["public"]["Tables"]["availability_blocks"]["Row"];

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notify?: string; msg?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: req } = await supabase.from("visit_requests").select("*").eq("id", id).single();

  if (!req) {
    return <p className="text-sm text-cal-ink-muted">Request not found.</p>;
  }

  const archived = Boolean((req as { deleted_at?: string | null }).deleted_at);

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

  let availableFromWindow = new Set<string>();
  if (req.visit_window_start && req.visit_window_end) {
    const vs = new Date(req.visit_window_start);
    const ve = new Date(req.visit_window_end);
    availableFromWindow = new Set(memberIdsAvailableForWindow(vs, ve, map));
  }

  const availableFromIntakeWindows = new Set(memberIdsMatchingIntakeWindows(req, map));
  const availableFromPreferred = new Set(
    memberIdsMatchingPreferredSchedule(
      {
        preferred_times_text: req.preferred_times_text,
        created_at: req.created_at,
        visit_timing_recurring: (req as { visit_timing_recurring?: boolean }).visit_timing_recurring,
        intake_timing_mode: (req as { intake_timing_mode?: string | null }).intake_timing_mode,
      },
      map,
    ),
  );

  const availableIds = new Set<string>();
  for (const idm of availableFromWindow) availableIds.add(idm);
  for (const idm of availableFromIntakeWindows) availableIds.add(idm);
  for (const idm of availableFromPreferred) availableIds.add(idm);

  const showPreferredMatch =
    (req as { intake_timing_mode?: string | null }).intake_timing_mode !== "specific_windows";

  const { data: assignments } = await supabase
    .from("visit_assignments")
    .select("id, status, assignee_id, notification_sent_at")
    .eq("visit_request_id", id);

  const { data: offers } = await supabase
    .from("visit_offers")
    .select("member_id, created_at")
    .eq("visit_request_id", id);

  const offerMemberIds = [...new Set((offers ?? []).map((o) => o.member_id))];
  const offerProfiles =
    offerMemberIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", offerMemberIds)
      : { data: [] as Database["public"]["Tables"]["profiles"]["Row"][] };

  const offerMap = new Map((offerProfiles.data ?? []).map((p) => [p.id, p]));

  const windows = intakeWindowsFromRow(req);

  return (
    <div className="space-y-8">
      {sp.notify === "sent" ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Notification sent (SMTP accepted at least one recipient).
        </p>
      ) : null}
      {sp.notify === "partial" ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Partial send: {sp.msg ?? "One or more channels failed."}
        </p>
      ) : null}
      {sp.notify === "error" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Could not send notification: {sp.msg ?? "Check SMTP and assignee contact info."}
        </p>
      ) : null}
      {sp.notify === "assign_failed" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Assignment could not be created.
        </p>
      ) : null}
      {sp.notify === "blocked" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          This request is archived or closed for new assignments.
        </p>
      ) : null}

      <section className="card-surface p-4">
        <h2 className="text-lg font-semibold text-cal-ink">{req.congregant_name}</h2>
        <p className="mt-2 text-sm text-cal-ink-muted">{req.address}</p>
        <p className="text-sm text-cal-ink-muted">Phone: {req.phone}</p>
        <p className="mt-2 text-sm text-cal-ink-muted">
          Status: <span className="font-medium text-cal-ink">{req.status}</span>
          {archived ? <span className="ml-2 text-red-700">Archived</span> : null}
        </p>
        {(req as { intake_timing_mode?: string | null }).intake_timing_mode ? (
          <p className="mt-2 text-sm text-cal-ink-muted">
            Intake timing mode:{" "}
            <span className="font-medium">{(req as { intake_timing_mode?: string }).intake_timing_mode}</span>
            {" · "}
            {(req as { visit_timing_recurring?: boolean }).visit_timing_recurring === false
              ? "One-time (week of request)"
              : "Ongoing / recurring"}
          </p>
        ) : null}
        {req.preferred_times_text ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-cal-ink-muted">
            Preferred: {req.preferred_times_text}
          </p>
        ) : null}
        {windows.length > 0 ? (
          <div className="mt-2 text-sm text-cal-ink-muted">
            <p className="font-medium text-cal-ink">Visit window(s)</p>
            <ul className="mt-1 list-disc pl-5">
              {windows.map((w, i) => (
                <li key={`${w.start}-${w.end}-${i}`}>
                  {new Date(w.start).toLocaleString()} – {new Date(w.end).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {req.prayer_requests ? (
          <p className="mt-2 text-sm text-cal-ink-muted">Prayer: {req.prayer_requests}</p>
        ) : null}
        {req.special_instructions ? (
          <p className="mt-2 text-sm text-cal-ink-muted">Instructions: {req.special_instructions}</p>
        ) : null}
      </section>

      <section className="card-surface p-4">
        <h3 className="font-semibold text-cal-ink">Lifecycle & archive</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {!archived && req.status !== "completed" && req.status !== "cancelled" ? (
            <form action={setVisitRequestLifecycle}>
              <input type="hidden" name="visit_request_id" value={req.id} />
              <input type="hidden" name="next_status" value="completed" />
              <button type="submit" className="btn-secondary px-3 py-2 text-xs">
                Mark completed
              </button>
            </form>
          ) : null}
          {!archived && req.status !== "completed" && req.status !== "cancelled" ? (
            <form action={setVisitRequestLifecycle}>
              <input type="hidden" name="visit_request_id" value={req.id} />
              <input type="hidden" name="next_status" value="cancelled" />
              <button type="submit" className="btn-secondary px-3 py-2 text-xs">
                Mark cancelled
              </button>
            </form>
          ) : null}
          {req.status === "completed" || req.status === "cancelled" || req.status === "declined" ? (
            <form action={setVisitRequestLifecycle}>
              <input type="hidden" name="visit_request_id" value={req.id} />
              <input type="hidden" name="next_status" value="new" />
              <button type="submit" className="btn-secondary px-3 py-2 text-xs">
                Reopen as new
              </button>
            </form>
          ) : null}
          {!archived ? (
            <form action={archiveVisitRequest}>
              <input type="hidden" name="visit_request_id" value={req.id} />
              <button type="submit" className="btn-secondary px-3 py-2 text-xs">
                Archive request
              </button>
            </form>
          ) : (
            <form action={restoreVisitRequest}>
              <input type="hidden" name="visit_request_id" value={req.id} />
              <button type="submit" className="btn-primary px-3 py-2 text-xs">
                Restore request
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="card-surface p-4">
        <h3 className="font-semibold text-cal-ink">Visit window (admin)</h3>
        <p className="mt-1 text-sm text-cal-ink-muted">
          Saving here sets the structured window used for reminders. Preferred times from intake still drive
          availability suggestions unless the intake used specific windows only.
        </p>
        <form action={updateVisitWindow} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="visit_request_id" value={req.id} />
          <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
            Start
            <input
              type="datetime-local"
              name="visit_window_start"
              defaultValue={toLocalInput(req.visit_window_start)}
              className="field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
            End
            <input
              type="datetime-local"
              name="visit_window_end"
              defaultValue={toLocalInput(req.visit_window_end)}
              className="field"
            />
          </label>
          <button type="submit" className="btn-primary sm:col-span-2">
            Save window
          </button>
        </form>
      </section>

      <section className="card-surface p-4">
        <h3 className="font-semibold text-cal-ink">Care team</h3>
        {!showPreferredMatch && !req.visit_window_start ? (
          <p className="mt-2 text-sm text-amber-900">
            Intake used specific windows only — set a visit window above to refine availability overlap.
          </p>
        ) : null}
        {showPreferredMatch && !availableIds.size && !req.visit_window_start ? (
          <p className="mt-2 text-sm text-amber-900">
            No availability overlap yet from preferred times; add a visit window or ask members to update
            availability.
          </p>
        ) : null}
        <ul className="mt-4 space-y-3">
          {members?.map((m) => {
            const match = availableIds.has(m.id);
            return (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-lg border border-cal-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <span className="font-medium text-cal-ink">{m.display_name ?? m.id.slice(0, 8)}</span>
                  <span
                    className={
                      match
                        ? " ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900"
                        : " ml-2 rounded bg-cal-page px-2 py-0.5 text-xs text-cal-ink-muted"
                    }
                  >
                    {match ? "Likely available" : "No overlap"}
                  </span>
                  <div className="mt-1 text-xs text-cal-ink-muted">
                    Phone: {m.phone_digits ?? "—"} · {gatewayLabel(m.mms_gateway_domain)}
                    {m.contact_email ? ` · ${m.contact_email}` : ""}
                  </div>
                </div>
                <form action={assignAndNotify} className="flex flex-col gap-1">
                  <input type="hidden" name="visit_request_id" value={req.id} />
                  <input type="hidden" name="assignee_id" value={m.id} />
                  <button type="submit" className="btn-primary px-3 py-2 text-xs">
                    Assign and notify
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-surface p-4">
        <h3 className="font-semibold text-cal-ink">Volunteered to help</h3>
        {!offers?.length ? <p className="mt-2 text-sm text-cal-ink-muted">None yet.</p> : null}
        <ul className="mt-2 space-y-3">
          {(offers ?? []).map((o) => {
            const prof = offerMap.get(o.member_id);
            return (
              <li
                key={`${o.member_id}-${o.created_at}`}
                className="flex flex-col gap-2 rounded-lg border border-cal-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm text-cal-ink">
                  <span className="font-medium">{prof?.display_name ?? o.member_id.slice(0, 8)}</span>
                  <span className="ml-2 text-xs text-cal-ink-muted">
                    offered {new Date(o.created_at).toLocaleString()}
                  </span>
                </div>
                <form action={assignAndNotify} className="flex flex-col gap-1">
                  <input type="hidden" name="visit_request_id" value={req.id} />
                  <input type="hidden" name="assignee_id" value={o.member_id} />
                  <button type="submit" className="btn-primary px-3 py-2 text-xs">
                    Assign and notify
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-surface p-4">
        <h3 className="font-semibold text-cal-ink">Assignments</h3>
        <ul className="mt-2 space-y-2 text-sm text-cal-ink-muted">
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
        {!assignments?.length ? <p className="text-sm text-cal-ink-muted">None yet.</p> : null}
        <p className="mt-4 text-sm">
          <Link href="/admin/calendar" className="text-cal-primary underline">
            View on calendar
          </Link>
        </p>
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
