import type { VisitRequestStatus } from "@/lib/database.types";

export type VisitRequestLike = {
  status: VisitRequestStatus;
  deleted_at?: string | null;
};

export function visitRequestExcludedFromCalendar(req: VisitRequestLike): boolean {
  if (req.deleted_at) return true;
  if (req.status === "completed" || req.status === "cancelled" || req.status === "declined") {
    return true;
  }
  return false;
}

export function visitRequestActiveForAdminList(req: VisitRequestLike): boolean {
  return !req.deleted_at;
}

export function visitRequestArchived(req: VisitRequestLike): boolean {
  return Boolean(req.deleted_at);
}
