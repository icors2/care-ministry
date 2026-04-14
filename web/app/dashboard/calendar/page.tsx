import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { embedOne } from "@/lib/unwrap-embed";
import { VisitCalendar, type VisitCalendarItem } from "@/components/visit-calendar";
import {
  visitRequestCalendarDayKeys,
  type VisitRequestCalendarInput,
} from "@/lib/preferred-times-calendar";
import { visitRequestExcludedFromCalendar } from "@/lib/visit-request-visibility";
import { offerVolunteerForVisit, withdrawVolunteerForVisit } from "../actions";

export const metadata = { title: "Calendar | Care Ministry" };

export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; volunteer?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = DateTime.now().setZone(CHURCH_TIMEZONE);
  const year = parseInt(sp.y ?? String(now.year), 10) || now.year;
  const month = parseInt(sp.m ?? String(now.month), 10) || now.month;
  const monthDt = DateTime.fromObject({ year, month, day: 1 }, { zone: CHURCH_TIMEZONE });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canSeeOpenAndVolunteer = profile?.role === "member" || profile?.role === "admin";

  const { data: assignments } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      status,
      visit_requests (
        id,
        congregant_name,
        status,
        created_at,
        preferred_times_text,
        visit_window_start,
        visit_window_end,
        intake_timing_mode,
        intake_visit_windows,
        deleted_at,
        visit_timing_recurring
      )
    `,
    )
    .eq("assignee_id", user.id)
    .in("status", ["pending", "accepted"]);

  const items: VisitCalendarItem[] = [];
  for (const a of assignments ?? []) {
    const vr = embedOne(a.visit_requests as object) as VisitRequestCalendarInput | null;
    if (!vr || visitRequestExcludedFromCalendar(vr)) continue;
    const keys = visitRequestCalendarDayKeys(vr, monthDt);
    const statusTone = a.status === "accepted" ? ("active" as const) : ("pending" as const);
    const labelSuffix = a.status === "pending" ? "respond" : "accepted";
    for (const dateKey of keys) {
      items.push({
        dateKey,
        id: `${a.id}-${dateKey}`,
        label: `You: ${vr?.congregant_name ?? "Visit"} (${labelSuffix})`,
        href: "/dashboard/visits",
        statusTone,
      });
    }
  }

  let list: Array<VisitRequestCalendarInput & { congregant_name: string }> = [];
  let offered = new Set<string>();

  if (canSeeOpenAndVolunteer) {
    const { data: openReqs } = await supabase
      .from("visit_requests")
      .select("*")
      .eq("status", "new");

    const { data: myOffers } = await supabase
      .from("visit_offers")
      .select("visit_request_id")
      .eq("member_id", user.id);

    offered = new Set((myOffers ?? []).map((o) => o.visit_request_id));

    list = (openReqs?.filter((r) => {
      const archived = Boolean((r as { deleted_at?: string | null }).deleted_at);
      return !archived;
    }) ?? []) as Array<VisitRequestCalendarInput & { congregant_name: string }>;

    for (const r of list) {
      const keys = visitRequestCalendarDayKeys(r as VisitRequestCalendarInput, monthDt);
      for (const dateKey of keys) {
        items.push({
          dateKey,
          id: `open-${r.id}-${dateKey}`,
          label: `Open: ${r.congregant_name}`,
          href: "/dashboard/calendar#open-visits",
          statusTone: "open",
        });
      }
    }
  }

  const volunteerMsg =
    sp.volunteer === "ok"
      ? "Thanks — we recorded your offer to help. A coordinator will still assign and notify the care team."
      : sp.volunteer === "withdrawn"
        ? "Your volunteer offer was withdrawn."
        : sp.volunteer === "duplicate"
          ? "You already offered to help on that visit."
          : sp.volunteer === "closed"
            ? "That visit is no longer open for offers."
            : sp.volunteer === "forbidden"
              ? "Your account cannot record volunteer offers."
              : sp.volunteer === "error"
                ? "Something went wrong. Please try again."
                : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cal-ink">Calendar</h1>
          <p className="mt-1 text-sm text-cal-ink-muted">
            {canSeeOpenAndVolunteer
              ? "Your assignments and open visits that need a care team member."
              : "Your visit assignments."}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            className="btn-secondary px-3 py-2"
            href={`/dashboard/calendar?y=${monthDt.minus({ months: 1 }).year}&m=${monthDt.minus({ months: 1 }).month}`}
          >
            Previous
          </Link>
          <Link
            className="btn-secondary px-3 py-2"
            href={`/dashboard/calendar?y=${monthDt.plus({ months: 1 }).year}&m=${monthDt.plus({ months: 1 }).month}`}
          >
            Next
          </Link>
        </div>
      </div>

      {volunteerMsg ? (
        <p
          className={`max-w-2xl rounded-lg border px-4 py-3 text-sm ${
            sp.volunteer === "ok" || sp.volunteer === "withdrawn"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          {volunteerMsg}
        </p>
      ) : null}

      <VisitCalendar year={year} month={month} items={items} />

      {canSeeOpenAndVolunteer ? (
        <section id="open-visits" className="card-surface scroll-mt-24 p-4">
          <h2 className="text-lg font-semibold text-cal-ink">Open visits — volunteer</h2>
          <p className="mt-1 text-sm text-cal-ink-muted">
            These requests still need a care team assignment. Offering records your interest; a coordinator assigns
            and sends notifications.
          </p>
          <ul className="mt-4 space-y-3">
            {list.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-cal-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-cal-ink">{r.congregant_name}</p>
                  <p className="text-xs text-cal-ink-muted">
                    {r.preferred_times_text
                      ? String(r.preferred_times_text).split("\n")[0]?.slice(0, 120)
                      : "Preferred times on file"}
                  </p>
                </div>
                {offered.has(r.id) ? (
                  <form action={withdrawVolunteerForVisit}>
                    <input type="hidden" name="visit_request_id" value={r.id} />
                    <button type="submit" className="btn-secondary px-3 py-2 text-xs">
                      Withdraw offer
                    </button>
                  </form>
                ) : (
                  <form action={offerVolunteerForVisit}>
                    <input type="hidden" name="visit_request_id" value={r.id} />
                    <button type="submit" className="btn-primary px-3 py-2 text-xs">
                      I can help — volunteer
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {!list.length ? <p className="mt-2 text-sm text-cal-ink-muted">No open requests right now.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
