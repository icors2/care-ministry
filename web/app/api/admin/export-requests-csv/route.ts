import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-route";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { data } = await gate.supabase
    .from("visit_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const headers = [
    "id",
    "congregant_name",
    "address",
    "phone",
    "status",
    "created_at",
    "visit_window_start",
    "visit_window_end",
    "deleted_at",
    "intake_timing_mode",
    "visit_timing_recurring",
  ];

  const lines = [headers.join(",")];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    lines.push(
      headers
        .map((h) => {
          const v = r[h];
          if (v === null || v === undefined) return "";
          const s = typeof v === "string" ? v : JSON.stringify(v);
          const safe = `"${String(s).replace(/"/g, '""')}"`;
          return safe;
        })
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visit-requests.csv"',
    },
  });
}
