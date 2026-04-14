import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: openReqs } = await supabase
    .from("visit_requests")
    .select("id, deleted_at")
    .eq("status", "new");

  const openIds = new Set(
    (openReqs ?? []).filter((r) => !(r as { deleted_at?: string | null }).deleted_at).map((r) => r.id),
  );

  const { data: offerRows } = await supabase.from("visit_offers").select("visit_request_id");
  const volunteerOfferCount = (offerRows ?? []).filter((o) => openIds.has(o.visit_request_id)).length;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-cal-ink">Admin</h1>
        <nav className="flex flex-wrap gap-2 rounded-full border border-cal-border bg-cal-card px-2 py-2 text-sm font-medium text-cal-ink-muted shadow-sm">
          <Link className="rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink" href="/admin">
            Visit requests
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-cal-page hover:text-cal-ink"
            href="/admin/volunteer-offers"
          >
            Volunteer offers
            {volunteerOfferCount > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                {volunteerOfferCount}
              </span>
            ) : null}
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
