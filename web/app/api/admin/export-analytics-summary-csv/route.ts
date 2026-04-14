import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requireAdminApi } from "@/lib/admin-route";
import { CHURCH_TIMEZONE } from "@/lib/constants";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { data: reqs } = await gate.supabase.from("visit_requests").select("status, created_at, deleted_at");
  const { data: assigns } = await gate.supabase.from("visit_assignments").select("status, created_at");

  const rows: string[][] = [];
  rows.push(["metric", "value"]);
  rows.push(["generated_at", DateTime.now().setZone(CHURCH_TIMEZONE).toISO() ?? ""]);

  const activeReqs = (reqs ?? []).filter((r) => !(r as { deleted_at?: string | null }).deleted_at);
  rows.push(["visit_requests_total", String(reqs?.length ?? 0)]);
  rows.push(["visit_requests_active", String(activeReqs.length)]);

  const byStatus = new Map<string, number>();
  for (const r of activeReqs) {
    const k = String((r as { status?: string }).status ?? "unknown");
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  for (const [k, v] of byStatus) {
    rows.push([`visit_request_status:${k}`, String(v)]);
  }

  const byAssign = new Map<string, number>();
  for (const a of assigns ?? []) {
    const k = String((a as { status?: string }).status ?? "unknown");
    byAssign.set(k, (byAssign.get(k) ?? 0) + 1);
  }
  for (const [k, v] of byAssign) {
    rows.push([`assignment_status:${k}`, String(v)]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="analytics-summary.csv"',
    },
  });
}
