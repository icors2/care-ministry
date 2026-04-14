import { DateTime } from "luxon";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { dateKeyInChurchFromIso } from "@/lib/calendar-date";
import { intakeWindowsFromRow } from "@/lib/intake-visit-windows";
import { visitRequestExcludedFromCalendar } from "@/lib/visit-request-visibility";
import type { Json, VisitRequestStatus } from "@/lib/database.types";

const DAY_LINE =
  /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*:\s*(.+)$/i;

/** Luxon weekday: Monday=1 … Sunday=7 */
const NAME_TO_LUXON_WEEKDAY: Record<string, number> = {
  sunday: 7,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type TimeOfDaySlot = "morning" | "afternoon" | "evening" | "flexible";

export type ParsedPreferredDay = {
  luxonWeekday: number;
  slots: TimeOfDaySlot[];
};

export function parsePreferredScheduleLines(text: string | null | undefined): ParsedPreferredDay[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedPreferredDay[] = [];
  for (const line of lines) {
    if (/^preferred days/i.test(line)) continue;
    const m = line.match(DAY_LINE);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const luxonWeekday = NAME_TO_LUXON_WEEKDAY[key];
    if (!luxonWeekday) continue;
    const rest = m[2].toLowerCase();
    const slots: TimeOfDaySlot[] = [];
    if (rest.includes("flexible") || rest.includes("any time")) {
      slots.push("flexible");
    } else {
      if (rest.includes("morning")) slots.push("morning");
      if (rest.includes("afternoon")) slots.push("afternoon");
      if (rest.includes("evening")) slots.push("evening");
    }
    if (slots.length === 0) {
      slots.push("flexible");
    }
    out.push({ luxonWeekday, slots });
  }
  return out;
}

export function slotLocalRangeOnDay(day: DateTime, slot: TimeOfDaySlot): { start: DateTime; end: DateTime } {
  const d = day.setZone(CHURCH_TIMEZONE).startOf("day");
  switch (slot) {
    case "morning":
      return { start: d.set({ hour: 8 }), end: d.set({ hour: 12 }) };
    case "afternoon":
      return { start: d.set({ hour: 12 }), end: d.set({ hour: 17 }) };
    case "evening":
      return { start: d.set({ hour: 17 }), end: d.set({ hour: 21 }) };
    case "flexible":
    default:
      return { start: d.set({ hour: 8 }), end: d.set({ hour: 21 }) };
  }
}

/** Every calendar date in `month` (church TZ) that matches preferred weekdays/slots from text. */
export function preferredTextToDateKeysInMonth(
  text: string | null | undefined,
  month: DateTime,
): string[] {
  const parsed = parsePreferredScheduleLines(text);
  if (!parsed.length) return [];
  const start = month.setZone(CHURCH_TIMEZONE).startOf("month");
  const end = start.endOf("month");
  const keys = new Set<string>();
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    const w = d.weekday;
    for (const p of parsed) {
      if (p.luxonWeekday !== w) continue;
      keys.add(d.toISODate()!);
    }
  }
  return [...keys];
}

function windowDateKeysInMonth(startIso: string, endIso: string, month: DateTime): string[] {
  const zoneStart = DateTime.fromISO(startIso, { setZone: true }).setZone(CHURCH_TIMEZONE);
  const zoneEnd = DateTime.fromISO(endIso, { setZone: true }).setZone(CHURCH_TIMEZONE);
  if (!zoneStart.isValid || !zoneEnd.isValid) return [];
  const mStart = month.setZone(CHURCH_TIMEZONE).startOf("month");
  const mEnd = month.setZone(CHURCH_TIMEZONE).endOf("month");
  const keys = new Set<string>();
  let cur = mStart.startOf("day");
  while (cur <= mEnd) {
    const dayStart = cur.startOf("day");
    const dayEnd = cur.endOf("day");
    if (zoneEnd < dayStart || zoneStart > dayEnd) {
      cur = cur.plus({ days: 1 });
      continue;
    }
    keys.add(cur.toISODate()!);
    cur = cur.plus({ days: 1 });
  }
  return [...keys];
}

export type VisitRequestCalendarInput = {
  id: string;
  congregant_name?: string;
  status: VisitRequestStatus;
  created_at: string;
  preferred_times_text: string | null;
  visit_window_start: string | null;
  visit_window_end: string | null;
  intake_timing_mode?: string | null;
  intake_visit_windows?: Json | null;
  deleted_at?: string | null;
};

/**
 * Date keys (YYYY-MM-DD, church TZ) when this request should appear on a month grid.
 */
export function visitRequestCalendarDayKeys(
  req: VisitRequestCalendarInput,
  month: DateTime,
): string[] {
  if (visitRequestExcludedFromCalendar(req)) return [];

  const monthChurch = month.setZone(CHURCH_TIMEZONE);
  const windows = intakeWindowsFromRow(req);

  if (windows.length > 0) {
    const keys = new Set<string>();
    for (const w of windows) {
      for (const k of windowDateKeysInMonth(w.start, w.end, monthChurch)) {
        keys.add(k);
      }
    }
    if (keys.size > 0) return [...keys];
  }

  if (req.visit_window_start && req.visit_window_end) {
    return windowDateKeysInMonth(req.visit_window_start, req.visit_window_end, monthChurch);
  }

  if (req.status === "new") {
    const fromText = preferredTextToDateKeysInMonth(req.preferred_times_text, monthChurch);
    if (fromText.length > 0) return fromText;
  }

  const fallback = dateKeyInChurchFromIso(req.created_at);
  return fallback ? [fallback] : [];
}

/** Concrete church-local visit windows for preferred-slot matching (next N days from anchor). */
export function enumeratePreferredSlotWindows(params: {
  preferred_times_text: string | null | undefined;
  anchorIso: string;
  lookaheadDays: number;
}): Array<{ start: Date; end: Date }> {
  const parsed = parsePreferredScheduleLines(params.preferred_times_text);
  if (!parsed.length) return [];

  const anchor = DateTime.fromISO(params.anchorIso, { setZone: true }).setZone(CHURCH_TIMEZONE);
  if (!anchor.isValid) return [];

  const out: Array<{ start: Date; end: Date }> = [];
  const n = Math.max(1, Math.min(params.lookaheadDays, 60));

  for (let i = 0; i < n; i += 1) {
    const day = anchor.plus({ days: i }).startOf("day");
    const w = day.weekday;
    for (const p of parsed) {
      if (p.luxonWeekday !== w) continue;
      for (const slot of p.slots) {
        const { start, end } = slotLocalRangeOnDay(day, slot);
        out.push({ start: start.toJSDate(), end: end.toJSDate() });
      }
    }
  }
  return out;
}
