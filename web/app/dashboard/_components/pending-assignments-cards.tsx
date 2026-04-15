import Link from "next/link";
import { embedOne } from "@/lib/unwrap-embed";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { respondToAssignmentFromDashboard } from "../actions";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: CHURCH_TIMEZONE,
});

export type PendingAssignmentRow = {
  id: string;
  visit_requests: unknown;
};

export type PendingAssignmentReturnTo = "home" | "inbox" | "visits";

export function PendingAssignmentsCards({
  assignments,
  returnTo,
}: {
  assignments: PendingAssignmentRow[];
  returnTo: PendingAssignmentReturnTo;
}) {
  return (
    <ul className="mt-3 space-y-4">
      {assignments.map((a) => {
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
              {vr?.phone ? <p className="mt-1 text-sm text-cal-ink-muted">Phone: {vr.phone}</p> : null}
              {vr?.visit_window_start ? (
                <p className="mt-1 text-sm text-cal-ink-muted">
                  Window (US Central): {timeFmt.format(new Date(vr.visit_window_start))}
                  {vr.visit_window_end ? ` – ${timeFmt.format(new Date(vr.visit_window_end))}` : ""}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-cal-ink-muted">
              Respond here or use the link in your text or email if you prefer.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={respondToAssignmentFromDashboard}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="assignment_id" value={a.id} />
                <input type="hidden" name="decision" value="accept" />
                <button type="submit" className="btn-primary px-4 py-2 text-sm">
                  Accept visit
                </button>
              </form>
              <form action={respondToAssignmentFromDashboard}>
                <input type="hidden" name="return_to" value={returnTo} />
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
  );
}
