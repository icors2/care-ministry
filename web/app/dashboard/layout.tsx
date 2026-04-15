import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { count: inboxPending } = await supabase
    .from("visit_assignments")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", user.id)
    .eq("status", "pending");

  const inboxCount = inboxPending ?? 0;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <nav className="flex flex-wrap gap-2 rounded-full border border-cal-border bg-cal-card px-2 py-2 text-sm font-medium text-cal-ink-muted shadow-sm">
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard">
          Overview
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink"
          href="/dashboard/inbox"
        >
          Inbox
          {inboxCount > 0 ? (
            <span className="min-w-[1.25rem] rounded-full bg-cal-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          ) : null}
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/profile">
          Profile and MMS
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/team-board">
          Team board
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/availability">
          Availability
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/calendar">
          Calendar
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/visits">
          Visit log
        </Link>
      </nav>
      {children}
    </div>
  );
}
