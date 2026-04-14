import type { Json } from "@/lib/database.types";

export type IntakeWindowPair = { start: string; end: string };

function asWindowArray(raw: unknown): IntakeWindowPair[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: IntakeWindowPair[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const start = typeof o.start === "string" ? o.start : null;
    const end = typeof o.end === "string" ? o.end : null;
    if (start && end) out.push({ start, end });
  }
  return out;
}

export function intakeWindowsFromRow(row: {
  intake_visit_windows?: Json | null;
  visit_window_start?: string | null;
  visit_window_end?: string | null;
}): IntakeWindowPair[] {
  const fromJson = asWindowArray(row.intake_visit_windows);
  if (fromJson.length > 0) return fromJson;
  if (row.visit_window_start && row.visit_window_end) {
    return [{ start: row.visit_window_start, end: row.visit_window_end }];
  }
  if (row.visit_window_start) {
    return [{ start: row.visit_window_start, end: row.visit_window_start }];
  }
  return [];
}
