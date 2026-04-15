import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import {
  ADMIN_QUEUE_SORTS,
  ADMIN_QUEUE_STATUSES,
  adminQueueHref,
  parseAdminQueueSort,
  parseAdminQueueStatus,
  sanitizeAdminQueueSearch,
  type AdminQueueSort,
} from "@/lib/admin-request-queue";
import type { VisitRequestStatus } from "@/lib/database.types";

export const metadata = { title: "Admin | Care Ministry" };

function paramOne(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string | string[]; status?: string | string[]; sort?: string | string[]; q?: string | string[] }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const archivedOnly = paramOne(sp.archived) === "1";
  const status = parseAdminQueueStatus(paramOne(sp.status));
  const sort = parseAdminQueueSort(paramOne(sp.sort));
  const qRaw = paramOne(sp.q) ?? "";
  const search = sanitizeAdminQueueSearch(qRaw);

  const supabase = await createClient();
  let query = supabase.from("visit_requests").select("*");

  if (archivedOnly) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search.length > 0) {
    const like = `%${search}%`;
    query = query.or(
      `congregant_name.ilike.${like},phone.ilike.${like},address.ilike.${like}`,
    );
  }

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "window") {
    query = query.order("visit_window_start", { ascending: true, nullsFirst: false });
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: requests, error } = await query;

  const filtered = requests ?? [];
  const hasActiveFilters =
    status !== "all" || sort !== "newest" || search.length > 0;

  const base = { archived: archivedOnly } as const;

  return (
    <div>
      <p className="text-sm text-cal-ink-muted">
        Open a request to set the visit window, see who matches availability, assign someone, and send the MMS/email
        notification.
      </p>

      <div className="card-surface mt-6 space-y-4 p-4">
        <h2 className="text-sm font-semibold text-cal-ink">Find requests</h2>

        <form method="get" action="/admin" className="flex flex-wrap items-end gap-3">
          {archivedOnly ? <input type="hidden" name="archived" value="1" /> : null}
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
          <label className="field min-w-[12rem] flex-1">
            <span className="text-xs font-medium text-cal-ink-muted">Search name, phone, or address</span>
            <input
              type="search"
              name="q"
              defaultValue={qRaw}
              placeholder="e.g. Smith or 555…"
              className="mt-1 w-full rounded-lg border border-cal-border bg-cal-page px-3 py-2 text-sm text-cal-ink shadow-sm"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Search
          </button>
        </form>

        <div>
          <p className="text-xs font-medium text-cal-ink-muted">Status</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ADMIN_QUEUE_STATUSES.map(({ value, label }) => {
              const active = status === value;
              const href = adminQueueHref({
                ...base,
                status: value as VisitRequestStatus | "all",
                sort,
                q: search || undefined,
              });
              return (
                <Link
                  key={value}
                  href={href}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    active
                      ? "bg-cal-primary text-white"
                      : "border border-cal-border bg-cal-page text-cal-ink-muted hover:bg-cal-card"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-cal-ink-muted">Sort</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ADMIN_QUEUE_SORTS.map(({ value, label }) => {
              const active = sort === value;
              const href = adminQueueHref({
                ...base,
                status,
                sort: value as AdminQueueSort,
                q: search || undefined,
              });
              return (
                <Link
                  key={value}
                  href={href}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    active
                      ? "bg-cal-primary text-white"
                      : "border border-cal-border bg-cal-page text-cal-ink-muted hover:bg-cal-card"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {hasActiveFilters ? (
          <p className="text-xs">
            <Link
              href={adminQueueHref(base)}
              className="text-cal-primary underline"
            >
              Clear filters
            </Link>
            {archivedOnly ? (
              <>
                {" · "}
                <Link href="/admin" className="text-cal-primary underline">
                  Active requests only
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Couldn&apos;t load requests. Try a simpler search.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {!archivedOnly ? (
          <Link className="text-cal-primary underline" href={adminQueueHref({ ...base, archived: true, status, sort, q: search || undefined })}>
            Archived requests
          </Link>
        ) : (
          <Link className="text-cal-primary underline" href={adminQueueHref({ archived: false, status, sort, q: search || undefined })}>
            Active requests
          </Link>
        )}
        <Link className="text-cal-primary underline" href="/admin/members">
          Team accounts
        </Link>
        <Link className="text-cal-primary underline" href="/admin/volunteer-offers">
          Volunteer offers
        </Link>
      </div>

      <ul className="mt-6 space-y-2">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/requests/${r.id}`}
              className="card-surface flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm hover:opacity-95"
            >
              <span className="font-medium text-cal-ink">{r.congregant_name}</span>
              <span className="text-cal-ink-muted">
                {r.status}
                {r.visit_window_start ? ` · ${new Date(r.visit_window_start).toLocaleString()}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!error && !filtered.length ? (
        <p className="mt-4 text-sm text-cal-ink-muted">
          {archivedOnly
            ? hasActiveFilters
              ? "No archived requests match your filters."
              : "No archived requests."
            : hasActiveFilters
              ? "No active requests match your filters."
              : "No requests yet."}
        </p>
      ) : null}
    </div>
  );
}
