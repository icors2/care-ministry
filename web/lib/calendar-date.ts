import { DateTime } from "luxon";
import { CHURCH_TIMEZONE } from "@/lib/constants";

/** YYYY-MM-DD in church timezone for an ISO timestamp (respects offset, then converts). */
export function dateKeyInChurchFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) return null;
  return dt.setZone(CHURCH_TIMEZONE).toISODate();
}
