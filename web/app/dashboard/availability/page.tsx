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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Weekly availability
      </h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Check days and time ranges when you are generally free for visits. Coordinators use this
        with the visit window to suggest names.
      </p>

      <form action={addAvailabilityBlock} className="mt-8 max-w-xl space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add a window</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Day
            <select
              name="day_of_week"
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Timezone
            <input
              name="timezone"
              defaultValue="America/New_York"
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
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
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add
        </button>
      </form>

      <ul className="mt-8 max-w-xl space-y-2">
        {blocks?.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span>
              {DAYS[b.day_of_week]} {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)} (
              {b.timezone})
            </span>
            <form action={deleteAvailabilityBlock.bind(null, b.id)}>
              <button
                type="submit"
                className="text-red-600 underline dark:text-red-400"
              >
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
