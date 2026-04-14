import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { addAvailabilityBlock, deleteAvailabilityBlock } from "../actions";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const metadata = { title: "Availability | Care Ministry" };

export default async function AvailabilityPage() {
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
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Weekly availability
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Add time windows for each day you are generally free for visits. Coordinators match this
        with visit requests. All times are <strong>US Central (Chicago)</strong>.
      </p>

      <div className="mt-8 space-y-6">
        {DAYS.map((dayLabel, dayIndex) => (
          <section
            key={dayLabel}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {dayLabel}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Central time</p>

            <ul className="mt-3 space-y-2">
              {byDay[dayIndex].length === 0 ? (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">No windows yet</li>
              ) : (
                byDay[dayIndex].map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                    </span>
                    <form action={deleteAvailabilityBlock.bind(null, b.id)}>
                      <button
                        type="submit"
                        className="text-sm text-red-600 underline dark:text-red-400"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>

            <form
              action={addAvailabilityBlock}
              className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <input type="hidden" name="day_of_week" value={dayIndex} />
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                From
                <input
                  type="time"
                  name="start_time"
                  defaultValue="09:00"
                  className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                To
                <input
                  type="time"
                  name="end_time"
                  defaultValue="12:00"
                  className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add window
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
