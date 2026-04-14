import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { embedOne } from "@/lib/unwrap-embed";
import { respondToAssignmentFromDashboard, savePostVisitNotes } from "../actions";

export const metadata = { title: "Visit log | Care Ministry" };

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{
    response?: string;
    notesSaved?: string;
    notesError?: string;
    editNotes?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      status,
      post_visit_notes,
      accepted_at,
      visit_requests (
        congregant_name,
        address,
        phone,
        visit_window_start,
        visit_window_end,
        prayer_requests,
        special_instructions
      )
    `,
    )
    .eq("assignee_id", user.id)
    .in("status", ["accepted", "pending", "declined"])
    .order("created_at", { ascending: false });

  const accepted = rows?.filter((r) => r.status === "accepted") ?? [];
  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  const declined = rows?.filter((r) => r.status === "declined") ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cal-ink">Visit log</h1>
      <p className="mt-2 text-sm text-cal-ink-muted">
        Accept or decline pending visits, then add post-visit notes after you go.
      </p>

      {sp.response === "accepted" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Visit accepted. Thank you for serving.
        </p>
      ) : null}
      {sp.response === "declined" ? (
        <p className="mt-4 rounded-lg border border-cal-border bg-cal-card px-4 py-3 text-sm text-cal-ink-muted" role="status">
          You declined this visit.
        </p>
      ) : null}
      {sp.response === "already_answered" ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          You already responded to this visit.
        </p>
      ) : null}
      {sp.response === "forbidden" || sp.response === "error" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          We couldn&apos;t update that assignment.
        </p>
      ) : null}

      {sp.notesSaved === "1" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Notes saved to the visitor log.
        </p>
      ) : null}
      {sp.notesError === "1" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Notes could not be saved. Please try again.
        </p>
      ) : null}

      <section className="mt-8 space-y-6">
        {pending.map((a) => {
          const vr = embedOne(a.visit_requests as object) as {
            congregant_name: string;
            address: string;
            phone: string;
            visit_window_start: string | null;
            visit_window_end: string | null;
            prayer_requests: string | null;
            special_instructions: string | null;
          } | null;
          return (
            <article key={a.id} className="card-surface max-w-2xl space-y-3 p-4">
              <h2 className="font-semibold text-cal-ink">{vr?.congregant_name}</h2>
              <p className="text-sm text-cal-ink-muted">{vr?.address}</p>
              <p className="text-sm text-cal-ink-muted">Phone: {vr?.phone}</p>
              {vr?.visit_window_start ? (
                <p className="text-sm text-cal-ink-muted">
                  Window: {new Date(vr.visit_window_start).toLocaleString()}
                  {vr.visit_window_end ? ` – ${new Date(vr.visit_window_end).toLocaleString()}` : ""}
                </p>
              ) : null}
              {vr?.prayer_requests ? (
                <p className="text-sm text-cal-ink-muted">Prayer: {vr.prayer_requests}</p>
              ) : null}
              {vr?.special_instructions ? (
                <p className="text-sm text-cal-ink-muted">Notes: {vr.special_instructions}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <form action={respondToAssignmentFromDashboard}>
                  <input type="hidden" name="return_to" value="visits" />
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <input type="hidden" name="decision" value="accept" />
                  <button type="submit" className="btn-primary px-4 py-2 text-sm">
                    Accept visit
                  </button>
                </form>
                <form action={respondToAssignmentFromDashboard}>
                  <input type="hidden" name="return_to" value="visits" />
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <input type="hidden" name="decision" value="decline" />
                  <button type="submit" className="btn-secondary px-4 py-2 text-sm">
                    Decline
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-lg font-medium text-cal-ink">Accepted visits</h2>
        {accepted.map((a) => {
          const vr = embedOne(a.visit_requests as object) as {
            congregant_name: string;
            address: string;
            phone: string;
            visit_window_start: string | null;
            visit_window_end: string | null;
            prayer_requests: string | null;
            special_instructions: string | null;
          } | null;
          const hasNotes = Boolean((a.post_visit_notes ?? "").trim());
          const editing = sp.editNotes === a.id;
          const showEditor = !hasNotes || editing;
          return (
            <article key={a.id} className="card-surface max-w-2xl space-y-3 p-4">
              <h2 className="font-semibold text-cal-ink">{vr?.congregant_name}</h2>
              <p className="text-sm text-cal-ink-muted">{vr?.address}</p>
              <p className="text-sm text-cal-ink-muted">Phone: {vr?.phone}</p>
              {vr?.visit_window_start ? (
                <p className="text-sm text-cal-ink-muted">
                  Window: {new Date(vr.visit_window_start).toLocaleString()}
                  {vr.visit_window_end ? ` – ${new Date(vr.visit_window_end).toLocaleString()}` : ""}
                </p>
              ) : null}
              {vr?.prayer_requests ? (
                <p className="text-sm text-cal-ink-muted">Prayer: {vr.prayer_requests}</p>
              ) : null}
              {vr?.special_instructions ? (
                <p className="text-sm text-cal-ink-muted">Notes: {vr.special_instructions}</p>
              ) : null}

              {hasNotes && !editing ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-cal-ink">Visitor log</p>
                  <p className="whitespace-pre-wrap rounded-lg border border-cal-border bg-cal-page p-3 text-sm text-cal-ink-muted">
                    {a.post_visit_notes}
                  </p>
                  <Link href={`/dashboard/visits?editNotes=${encodeURIComponent(a.id)}`} className="text-sm text-cal-primary underline">
                    Edit notes
                  </Link>
                </div>
              ) : null}

              {showEditor ? (
                <form action={savePostVisitNotes} className="space-y-2">
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                    Post-visit notes
                    <textarea
                      name="notes"
                      rows={4}
                      defaultValue={a.post_visit_notes ?? ""}
                      className="field text-base"
                    />
                  </label>
                  <button type="submit" className="btn-primary">
                    {hasNotes ? "Save changes" : "Save notes to log"}
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </section>

      {declined.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-cal-ink">Declined</h2>
          <ul className="mt-2 space-y-2 text-sm text-cal-ink-muted">
            {declined.map((a) => {
              const vr = embedOne(a.visit_requests as object) as { congregant_name: string } | null;
              return (
                <li key={a.id}>
                  {vr?.congregant_name} — declined
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
