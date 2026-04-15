import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { PendingAssignmentsCards } from "../_components/pending-assignments-cards";

export const metadata = { title: "Inbox | Care Ministry" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ response?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      created_at,
      visit_requests ( congregant_name, address, phone, visit_window_start, visit_window_end )
    `,
    )
    .eq("assignee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = pending ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cal-ink">Inbox</h1>
      <p className="mt-2 max-w-2xl text-sm text-cal-ink-muted">
        Things that need your attention—starting with visit assignments a coordinator sent you. You can also respond
        from the link in your text or email.
      </p>

      {sp.response === "accepted" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Visit accepted. Thank you for serving. Full details stay in your{" "}
          <Link href="/dashboard/visits" className="underline">
            visit log
          </Link>
          .
        </p>
      ) : null}
      {sp.response === "declined" ? (
        <p className="mt-4 rounded-lg border border-cal-border bg-cal-card px-4 py-3 text-sm text-cal-ink-muted" role="status">
          You declined this visit.
        </p>
      ) : null}
      {sp.response === "already_answered" ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          You already responded to this visit.
        </p>
      ) : null}
      {sp.response === "forbidden" || sp.response === "error" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          We couldn&apos;t update that assignment.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium text-cal-ink">Pending visit assignments</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-cal-ink-muted">
            You&apos;re all caught up. When a coordinator assigns you, it will show here and on{" "}
            <Link href="/dashboard" className="text-cal-primary underline">
              Overview
            </Link>
            .
          </p>
        ) : (
          <PendingAssignmentsCards assignments={rows} returnTo="inbox" />
        )}
      </section>
    </div>
  );
}
