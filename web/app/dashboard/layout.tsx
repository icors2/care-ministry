import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <nav className="flex flex-wrap gap-2 rounded-full border border-cal-border bg-cal-card px-2 py-2 text-sm font-medium text-cal-ink-muted shadow-sm">
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard">
          Overview
        </Link>
        <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/dashboard/profile">
          Profile and MMS
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
