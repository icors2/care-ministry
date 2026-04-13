import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { embedOne } from "@/lib/unwrap-embed";
import { savePostVisitNotes } from "../actions";

export const metadata = { title: "Visit log | Care Ministry" };

export default async function VisitsPage() {
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
  const other = rows?.filter((r) => r.status !== "accepted") ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Visit log
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Accepted visits: add post-visit notes after you go.
      </p>

      <section className="mt-8 space-y-6">
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
          return (
            <article
              key={a.id}
              className="max-w-2xl space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {vr?.congregant_name}
              </h2>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{vr?.address}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Phone: {vr?.phone}</p>
              {vr?.visit_window_start ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Window: {new Date(vr.visit_window_start).toLocaleString()}
                  {vr.visit_window_end
                    ? ` – ${new Date(vr.visit_window_end).toLocaleString()}`
                    : ""}
                </p>
              ) : null}
              {vr?.prayer_requests ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Prayer: {vr.prayer_requests}
                </p>
              ) : null}
              {vr?.special_instructions ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Notes: {vr.special_instructions}
                </p>
              ) : null}
              <form action={savePostVisitNotes} className="space-y-2">
                <input type="hidden" name="assignment_id" value={a.id} />
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Post-visit notes
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={a.post_visit_notes ?? ""}
                    className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Save notes
                </button>
              </form>
            </article>
          );
        })}
      </section>

      {other.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Other assignments
          </h2>
          <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            {other.map((a) => {
              const vr = embedOne(a.visit_requests as object) as {
                congregant_name: string;
              } | null;
              return (
                <li key={a.id}>
                  {vr?.congregant_name} — {a.status}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
