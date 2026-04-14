import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { addAvailabilityBlock, deleteAvailabilityBlock } from "../actions";
import type { AvailabilityRecurrence } from "@/lib/database.types";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function recurrenceLabel(dayLabel: string, r: AvailabilityRecurrence | string | undefined): string {
  switch (r ?? "weekly") {
    case "weekly":
      return "Every week";
    case "biweekly":
      return "Every other week (from when you added this)";
    case "monthly":
      return `Monthly — first ${dayLabel} of each month`;
    default:
      return "Every week";
  }
}

export const metadata = { title: "Availability | Care Ministry" };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("availability_blocks")
    .select("*")
    .eq("user_id", user.id)
    .order("day_of_week")
    .order("start_time");

  const rows = blocks ?? [];
  type BlockRow = (typeof rows)[number];
  const byDay: BlockRow[][] = Array.from({ length: 7 }, () => []);
  for (const b of rows) {
    if (b.day_of_week >= 0 && b.day_of_week <= 6) {
      byDay[b.day_of_week].push(b);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cal-ink">Availability</h1>
      <p className="mt-2 max-w-2xl text-sm text-cal-ink-muted">
        Add time windows for days you are generally free for visits. Coordinators use this to suggest matches.
        All times are <strong>US Central (Chicago)</strong>.
      </p>

      <aside
        className="card-surface mt-6 max-w-2xl border-l-4 border-l-cal-accent p-4 text-sm leading-relaxed text-cal-ink-muted"
        aria-label="Care team reminder"
      >
        <p className="font-semibold text-cal-ink">Thank you for serving on the Care Ministry team.</p>
        <p className="mt-2">
          Please remember that the times you have signed up for are not guaranteed visitation times. The Care
          Ministry lead will assign you according to needs and may schedule you on one of the days and times you
          have made available.
        </p>
      </aside>

      {sp.updated === "1" ? (
        <p
          className="mt-4 max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Your availability was updated. Thank you for keeping it current.
        </p>
      ) : null}
      {sp.error === "1" ? (
        <p className="mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          We couldn&apos;t save that window. If you recently updated the database, run the latest migration that adds
          availability recurrence, then try again.
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        {DAYS.map((dayLabel, dayIndex) => (
          <section key={dayLabel} className="card-surface p-4">
            <h2 className="text-base font-semibold text-cal-ink">{dayLabel}</h2>
            <p className="mt-0.5 text-xs text-cal-ink-muted">Central time</p>

            <ul className="mt-3 space-y-2">
              {byDay[dayIndex].length === 0 ? (
                <li className="text-sm text-cal-ink-muted">No windows yet</li>
              ) : (
                byDay[dayIndex].map((b) => {
                  const rec = (b as { recurrence?: AvailabilityRecurrence }).recurrence ?? "weekly";
                  return (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cal-border bg-cal-page px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-cal-ink">
                          {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                        </span>
                        <span className="mt-0.5 block text-xs text-cal-ink-muted">
                          {recurrenceLabel(dayLabel, rec)}
                        </span>
                      </div>
                      <form action={deleteAvailabilityBlock.bind(null, b.id)}>
                        <button type="submit" className="text-sm text-red-600 underline dark:text-red-400">
                          Remove
                        </button>
                      </form>
                    </li>
                  );
                })
              )}
            </ul>

            <form
              action={addAvailabilityBlock}
              className="mt-4 flex flex-col gap-3 border-t border-cal-border pt-4 dark:border-cal-border sm:flex-row sm:flex-wrap sm:items-end"
            >
              <input type="hidden" name="day_of_week" value={dayIndex} />
              <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                From
                <input
                  type="time"
                  name="start_time"
                  defaultValue="09:00"
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                To
                <input
                  type="time"
                  name="end_time"
                  defaultValue="12:00"
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                How often
                <select name="recurrence" className="field min-w-[12rem]" defaultValue="weekly">
                  <option value="weekly">Every week</option>
                  <option value="biweekly">Every other week</option>
                  <option value="monthly">Monthly (first {dayLabel} of each month)</option>
                </select>
              </label>
              <button type="submit" className="btn-primary px-4 py-2 text-sm">
                Add window
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
