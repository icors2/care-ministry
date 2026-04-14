import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-cal-ink">Admin</h1>
        <nav className="flex flex-wrap gap-2 rounded-full border border-cal-border bg-cal-card px-2 py-2 text-sm font-medium text-cal-ink-muted shadow-sm">
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin">
            Visit requests
          </Link>
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin/calendar">
            Calendar
          </Link>
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin/members">
            Team accounts
          </Link>
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin/analytics">
            Analytics
          </Link>
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin/visitor-log">
            Visitor log
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
