import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Team accounts | Care Ministry" };

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const per = 50;
  const from = (page - 1) * per;
  const to = from + per - 1;

  const supabase = await createClient();
  const { data: rows, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / per));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cal-ink">Team accounts</h1>
          <p className="mt-1 text-sm text-cal-ink-muted">Care team profiles tied to Supabase Auth users.</p>
        </div>
        <Link href="/admin/members/new" className="btn-primary px-4 py-2 text-sm">
          New account
        </Link>
      </div>

      <ul className="space-y-2">
        {(rows ?? []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/members/${p.id}`}
              className="card-surface flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:opacity-95"
            >
              <span className="font-medium text-cal-ink">{p.display_name ?? p.id.slice(0, 8)}</span>
              <span className="text-sm text-cal-ink-muted">{p.role}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm text-cal-ink-muted">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link className="btn-secondary px-3 py-2 text-xs" href={`/admin/members?page=${page - 1}`}>
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link className="btn-secondary px-3 py-2 text-xs" href={`/admin/members?page=${page + 1}`}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
