import { DateTime } from "luxon";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import type { Database, Json } from "@/lib/database.types";
import { enumeratePreferredSlotWindows } from "@/lib/preferred-times-calendar";
import { intakeWindowsFromRow } from "@/lib/intake-visit-windows";

type Block = Database["public"]["Tables"]["availability_blocks"]["Row"];

/** Map Luxon weekday (Mon=1..Sun=7) to schema day 0=Sun..6=Sat */
function luxonWeekdayToSchema(weekday: number): number {
  return weekday === 7 ? 0 : weekday;
}

/**
 * Returns true if [visitStart, visitEnd] overlaps the availability block on the visit's local calendar day in block.timezone.
 */
export function visitOverlapsBlock(
  visitStart: Date,
  visitEnd: Date,
  block: Pick<Block, "day_of_week" | "start_time" | "end_time" | "timezone">,
): boolean {
  const zone = block.timezone || CHURCH_TIMEZONE;
  const vs = DateTime.fromJSDate(visitStart).setZone(zone);
  const ve = DateTime.fromJSDate(visitEnd).setZone(zone);
  if (!vs.isValid || !ve.isValid) return false;

  const dow = luxonWeekdayToSchema(vs.weekday);
  if (dow !== block.day_of_week) return false;

  const [sh, sm, ss] = block.start_time.split(":").map((n) => parseInt(n, 10));
  const [eh, em, es] = block.end_time.split(":").map((n) => parseInt(n, 10));
  const blockStart = vs.set({
    hour: sh || 0,
    minute: sm || 0,
    second: ss || 0,
    millisecond: 0,
  });
  let blockEnd = vs.set({
    hour: eh || 0,
    minute: em || 0,
    second: es || 0,
    millisecond: 0,
  });
  if (blockEnd <= blockStart) {
    blockEnd = blockEnd.plus({ days: 1 });
  }

  return vs < blockEnd && ve > blockStart;
}

export function memberIdsAvailableForWindow(
  visitStart: Date,
  visitEnd: Date,
  blocksByUser: Map<string, Block[]>,
): string[] {
  const ids: string[] = [];
  for (const [userId, blocks] of blocksByUser) {
    const any = blocks.some((b) => visitOverlapsBlock(visitStart, visitEnd, b));
    if (any) ids.push(userId);
  }
  return ids;
}

type VisitRowForMatching = {
  preferred_times_text: string | null;
  created_at: string;
  visit_timing_recurring?: boolean | null;
  intake_timing_mode?: string | null;
  intake_visit_windows?: Json | null;
  visit_window_start: string | null;
  visit_window_end: string | null;
};

/** Members overlapping any explicit intake / saved visit window pair. */
export function memberIdsMatchingIntakeWindows(
  row: Pick<
    VisitRowForMatching,
    "intake_visit_windows" | "visit_window_start" | "visit_window_end"
  >,
  blocksByUser: Map<string, Block[]>,
): string[] {
  const pairs = intakeWindowsFromRow(row);
  const ids = new Set<string>();
  for (const w of pairs) {
    const vs = new Date(w.start);
    const ve = new Date(w.end);
    if (Number.isNaN(vs.getTime()) || Number.isNaN(ve.getTime())) continue;
    for (const id of memberIdsAvailableForWindow(vs, ve, blocksByUser)) {
      ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Members overlapping preferred weekday slots from intake text (not used when mode is specific_windows).
 */
export function memberIdsMatchingPreferredSchedule(
  row: Pick<
    VisitRowForMatching,
    | "preferred_times_text"
    | "created_at"
    | "visit_timing_recurring"
    | "intake_timing_mode"
  >,
  blocksByUser: Map<string, Block[]>,
): string[] {
  if (row.intake_timing_mode === "specific_windows") {
    return [];
  }
  const lookahead = row.visit_timing_recurring === false ? 7 : 28;
  const windows = enumeratePreferredSlotWindows({
    preferred_times_text: row.preferred_times_text,
    anchorIso: row.created_at,
    lookaheadDays: lookahead,
  });
  const ids = new Set<string>();
  for (const { start, end } of windows) {
    for (const id of memberIdsAvailableForWindow(start, end, blocksByUser)) {
      ids.add(id);
    }
  }
  return [...ids];
}
