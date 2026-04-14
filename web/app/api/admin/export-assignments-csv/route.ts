import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-route";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { data } = await gate.supabase
    .from("visit_assignments")
    .select(
      `
      id,
      status,
      created_at,
      accepted_at,
      declined_at,
      notification_sent_at,
      post_visit_notes,
      visit_request_id,
      assignee_id,
      profiles ( display_name )
    `,
    )
    .order("created_at", { ascending: false });

  const headers = [
    "assignment_id",
    "visit_request_id",
    "assignee_id",
    "assignee_name",
    "status",
    "created_at",
    "accepted_at",
    "declined_at",
    "notification_sent_at",
    "post_visit_notes",
  ];

  const lines = [headers.join(",")];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown> & {
      profiles?: { display_name?: string | null } | { display_name?: string | null }[] | null;
    };
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const vals = [
      r.id,
      r.visit_request_id,
      r.assignee_id,
      prof?.display_name ?? "",
      r.status,
      r.created_at,
      r.accepted_at,
      r.declined_at,
      r.notification_sent_at,
      r.post_visit_notes,
    ];
    lines.push(
      vals
        .map((v) => {
          if (v === null || v === undefined) return "";
          const s = typeof v === "string" ? v : JSON.stringify(v);
          return `"${String(s).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visit-assignments.csv"',
    },
  });
}
