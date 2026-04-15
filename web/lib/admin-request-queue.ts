import type { VisitRequestStatus } from "@/lib/database.types";

export const ADMIN_QUEUE_STATUSES: { value: VisitRequestStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "pending_member", label: "Pending member" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export type AdminQueueSort = "newest" | "oldest" | "window";

export const ADMIN_QUEUE_SORTS: { value: AdminQueueSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "window", label: "Visit window (soonest)" },
];

const REQUEST_STATUS_VALUES: VisitRequestStatus[] = [
  "new",
  "pending_member",
  "accepted",
  "declined",
  "completed",
  "cancelled",
];

/** Strip characters that break PostgREST `ilike` / `.or()` filter parsing. */
export function sanitizeAdminQueueSearch(raw: string): string {
  return raw
    .trim()
    .slice(0, 120)
    .replace(/[%_\\']/g, "")
    .replace(/,/g, " ");
}

export function parseAdminQueueStatus(raw: string | undefined): VisitRequestStatus | "all" {
  if (!raw || raw === "all") return "all";
  return REQUEST_STATUS_VALUES.includes(raw as VisitRequestStatus) ? (raw as VisitRequestStatus) : "all";
}

export function parseAdminQueueSort(raw: string | undefined): AdminQueueSort {
  if (raw === "oldest" || raw === "window") return raw;
  return "newest";
}

export function adminQueueHref(params: {
  archived?: boolean;
  status?: VisitRequestStatus | "all";
  sort?: AdminQueueSort;
  q?: string;
}): string {
  const u = new URLSearchParams();
  if (params.archived) u.set("archived", "1");
  if (params.status && params.status !== "all") u.set("status", params.status);
  if (params.sort && params.sort !== "newest") u.set("sort", params.sort);
  const q = params.q?.trim();
  if (q) u.set("q", q);
  const s = u.toString();
  return s ? `/admin?${s}` : "/admin";
}
