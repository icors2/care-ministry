import { DateTime } from "luxon";
import type { Database } from "@/lib/database.types";

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
  const zone = block.timezone || "America/New_York";
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
