import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendVisitReminder } from "@/lib/send-reminder";
import { embedOne } from "@/lib/unwrap-embed";

/**
 * Vercel Cron: daily check for accepted visits whose window is ~24h away.
 * Configure Authorization: Bearer CRON_SECRET in vercel.json cron headers (or query secret).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      visit_requests ( visit_window_start )
    `,
    )
    .eq("status", "accepted")
    .is("reminder_sent_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const sent: string[] = [];
  const skipped: string[] = [];

  for (const row of rows ?? []) {
    const vr = embedOne(row.visit_requests as object) as {
      visit_window_start: string | null;
    } | null;
    const start = vr?.visit_window_start ? new Date(vr.visit_window_start).getTime() : null;
    if (!start) {
      skipped.push(row.id);
      continue;
    }
    const hoursUntil = (start - now) / (1000 * 3600);
    // ~18–50h window so a daily cron still catches "tomorrow"
    if (hoursUntil < 18 || hoursUntil > 50) {
      skipped.push(row.id);
      continue;
    }
    const r = await sendVisitReminder(row.id);
    if (r.ok) sent.push(row.id);
    else skipped.push(row.id);
  }

  return NextResponse.json({ sent: sent.length, skipped: skipped.length });
}
