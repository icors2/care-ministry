import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { embedOne } from "@/lib/unwrap-embed";
import Link from "next/link";
import { respondToAssignmentFromDashboard } from "./actions";

export const metadata = { title: "Dashboard | Care Ministry" };

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ response?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      created_at,
      visit_requests ( congregant_name, address, phone, visit_window_start, visit_window_end )
    `,
    )
    .eq("assignee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cal-ink">Welcome</h1>
      <p className="mt-2 text-sm text-cal-ink-muted">
        Set your{" "}
        <Link href="/dashboard/profile" className="text-cal-primary underline">
          carrier and phone
        </Link>{" "}
        so coordinators can reach you by text. Add{" "}
        <Link href="/dashboard/availability" className="text-cal-primary underline">
          weekly availability
        </Link>{" "}
        to help with scheduling.
      </p>

      {sp.response === "accepted" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Visit accepted. Thank you for serving. Details stay in your{" "}
          <Link href="/dashboard/visits" className="underline">
            visit log
          </Link>
          .
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

      <section className="mt-8">
        <h2 className="text-lg font-medium text-cal-ink">Pending assignments</h2>
        {!pending?.length ? (
          <p className="mt-2 text-sm text-cal-ink-muted">
            None right now. You will get a text or email when a coordinator assigns you.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {pending.map((a) => {
              const vr = embedOne(a.visit_requests as object) as {
                congregant_name: string;
                address: string;
                phone: string;
                visit_window_start: string | null;
                visit_window_end: string | null;
              } | null;
              return (
                <li key={a.id} className="card-surface space-y-3 p-4">
                  <div>
                    <p className="font-medium text-cal-ink">{vr?.congregant_name}</p>
                    <p className="mt-1 text-sm text-cal-ink-muted">{vr?.address}</p>
                    {vr?.phone ? (
                      <p className="mt-1 text-sm text-cal-ink-muted">Phone: {vr.phone}</p>
                    ) : null}
                    {vr?.visit_window_start ? (
                      <p className="mt-1 text-sm text-cal-ink-muted">
                        Window: {new Date(vr.visit_window_start).toLocaleString()}
                        {vr.visit_window_end ? ` – ${new Date(vr.visit_window_end).toLocaleString()}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-cal-ink-muted">
                    Accept or decline here, or use the link in your text or email if you prefer.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <form action={respondToAssignmentFromDashboard}>
                      <input type="hidden" name="return_to" value="home" />
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <input type="hidden" name="decision" value="accept" />
                      <button type="submit" className="btn-primary px-4 py-2 text-sm">
                        Accept visit
                      </button>
                    </form>
                    <form action={respondToAssignmentFromDashboard}>
                      <input type="hidden" name="return_to" value="home" />
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <button type="submit" className="btn-secondary px-4 py-2 text-sm">
                        Decline
                      </button>
                    </form>
                  </div>
                  <p className="text-sm">
                    <Link href="/dashboard/visits" className="text-cal-primary underline">
                      Open visit log
                    </Link>{" "}
                    for full details and post-visit notes.
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
