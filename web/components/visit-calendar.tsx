import Link from "next/link";
import { DateTime } from "luxon";
import { CHURCH_TIMEZONE } from "@/lib/constants";

/**
 * open = needs assignment / open slot (red)
 * pending = assigned, awaiting care team response (blue)
 * active = accepted / in progress (green)
 */
export type VisitCalendarStatusTone = "open" | "pending" | "active";

export type VisitCalendarItem = {
  dateKey: string;
  id: string;
  label: string;
  href?: string;
  statusTone: VisitCalendarStatusTone;
};

function buildMonthCells(year: number, month: number): { dateKey: string; inMonth: boolean; label: string }[] {
  const start = DateTime.fromObject({ year, month, day: 1 }, { zone: CHURCH_TIMEZONE });
  const firstDow = start.weekday % 7;
  const gridStart = start.minus({ days: firstDow });
  const cells: { dateKey: string; inMonth: boolean; label: string }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = gridStart.plus({ days: i });
    cells.push({
      dateKey: d.toISODate()!,
      inMonth: d.month === month,
      label: String(d.day),
    });
  }
  return cells;
}

function toneClasses(tone: VisitCalendarStatusTone): string {
  switch (tone) {
    case "open":
      return "border border-red-200/80 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100";
    case "pending":
      return "border border-blue-200/80 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100";
    case "active":
      return "border border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100";
    default:
      return "border border-cal-border bg-cal-page text-cal-ink";
  }
}

export function VisitCalendar({
  year,
  month,
  title,
  items,
  showLegend = true,
}: {
  year: number;
  month: number;
  title?: string;
  items: VisitCalendarItem[];
  showLegend?: boolean;
}) {
  const byDay = new Map<string, VisitCalendarItem[]>();
  for (const it of items) {
    const list = byDay.get(it.dateKey) ?? [];
    list.push(it);
    byDay.set(it.dateKey, list);
  }

  const cells = buildMonthCells(year, month);
  const monthLabel = DateTime.fromObject({ year, month, day: 1 }, { zone: CHURCH_TIMEZONE }).toFormat(
    "LLLL yyyy",
  );

  return (
    <div className="card-surface space-y-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-cal-ink">{title ?? "Calendar"}</h2>
        <p className="text-sm text-cal-ink-muted">{monthLabel}</p>
      </div>

      {showLegend ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-cal-ink-muted">
          <li className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${toneClasses("open")}`}
              aria-hidden
            />
            <span>Open — needs assignment</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${toneClasses("pending")}`}
              aria-hidden
            />
            <span>Pending — awaiting care team response</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${toneClasses("active")}`}
              aria-hidden
            />
            <span>Active — accepted / in progress</span>
          </li>
        </ul>
      ) : null}

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-cal-ink-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const dayItems = byDay.get(c.dateKey) ?? [];
          return (
            <div
              key={c.dateKey}
              className={`min-h-[88px] rounded-lg border p-1 text-left ${
                c.inMonth
                  ? "border-cal-border bg-cal-card"
                  : "border-transparent bg-cal-page/40 text-cal-ink-muted"
              }`}
            >
              <div className="text-xs font-medium text-cal-ink-muted">{c.label}</div>
              <ul className="mt-1 space-y-1">
                {dayItems.map((it) => {
                  const inner = (
                    <span
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${toneClasses(it.statusTone)}`}
                    >
                      {it.label}
                    </span>
                  );
                  return (
                    <li key={it.id}>
                      {it.href ? (
                        <Link href={it.href} className="block hover:opacity-90">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
