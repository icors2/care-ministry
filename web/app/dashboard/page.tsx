import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { embedOne } from "@/lib/unwrap-embed";
import Link from "next/link";

export const metadata = { title: "Dashboard | Care Ministry" };

export default async function DashboardHomePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      created_at,
      visit_requests ( congregant_name, address, visit_window_start )
    `,
    )
    .eq("assignee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Welcome
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Set your{" "}
        <Link href="/dashboard/profile" className="underline">
          carrier and phone
        </Link>{" "}
        so coordinators can reach you by text. Add{" "}
        <Link href="/dashboard/availability" className="underline">
          weekly availability
        </Link>{" "}
        to help with scheduling.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Pending assignments
        </h2>
        {!pending?.length ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            None right now. You will get a text or email when a coordinator assigns you.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((a) => {
              const vr = embedOne(a.visit_requests as object) as {
                congregant_name: string;
                address: string;
                visit_window_start: string | null;
              } | null;
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  {vr?.congregant_name} — {vr?.address}
                  {vr?.visit_window_start ? (
                    <span className="block text-zinc-500">
                      Window: {new Date(vr.visit_window_start).toLocaleString()}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-amber-800 dark:text-amber-200">
                    Respond using the link in your message, or ask the coordinator to resend.
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
