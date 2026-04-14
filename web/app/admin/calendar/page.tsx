import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { VisitCalendar, type VisitCalendarItem } from "@/components/visit-calendar";
import {
  visitRequestCalendarDayKeys,
  type VisitRequestCalendarInput,
} from "@/lib/preferred-times-calendar";
import { visitRequestExcludedFromCalendar } from "@/lib/visit-request-visibility";

export const metadata = { title: "Admin calendar | Care Ministry" };

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const now = DateTime.now().setZone(CHURCH_TIMEZONE);
  const year = parseInt(sp.y ?? String(now.year), 10) || now.year;
  const month = parseInt(sp.m ?? String(now.month), 10) || now.month;
  const monthDt = DateTime.fromObject({ year, month, day: 1 }, { zone: CHURCH_TIMEZONE });

  const supabase = await createClient();
  const { data: reqs } = await supabase
    .from("visit_requests")
    .select("*")
    .in("status", ["new", "pending_member", "accepted"]);

  const active =
    reqs?.filter((r) => {
      const archived = Boolean((r as { deleted_at?: string | null }).deleted_at);
      if (archived) return false;
      if (visitRequestExcludedFromCalendar(r as VisitRequestCalendarInput)) return false;
      return true;
    }) ?? [];

  const items: VisitCalendarItem[] = [];
  for (const r of active) {
    const row = r as VisitRequestCalendarInput;
    const keys = visitRequestCalendarDayKeys(row, monthDt);
    for (const dateKey of keys) {
      items.push({
        dateKey,
        id: `${r.id}-${dateKey}`,
        label: `${r.congregant_name} (${r.status})`,
        href: `/admin/requests/${r.id}`,
        variant: r.status === "new" ? "muted" : "default",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cal-ink">Admin calendar</h1>
          <p className="mt-1 text-sm text-cal-ink-muted">
            Open and scheduled visits ({CHURCH_TIMEZONE}).
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            className="btn-secondary px-3 py-2"
            href={`/admin/calendar?y=${monthDt.minus({ months: 1 }).year}&m=${monthDt.minus({ months: 1 }).month}`}
          >
            Previous
          </Link>
          <Link
            className="btn-secondary px-3 py-2"
            href={`/admin/calendar?y=${monthDt.plus({ months: 1 }).year}&m=${monthDt.plus({ months: 1 }).month}`}
          >
            Next
          </Link>
        </div>
      </div>
      <VisitCalendar year={year} month={month} title="Visit activity" items={items} />
    </div>
  );
}
