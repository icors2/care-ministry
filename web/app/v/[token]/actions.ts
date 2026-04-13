"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type RespondResult = { ok: true } | { ok: false; error: string };

/**
 * Accept or decline using the secret token from MMS/email (no login). Service role updates state.
 */
export async function respondToVisitToken(
  token: string,
  decision: "accept" | "decline",
): Promise<RespondResult> {
  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("visit_assignments")
    .select("id, status, visit_request_id")
    .eq("response_token", token)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "not_found" };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "already_answered" };
  }

  const now = new Date().toISOString();

  if (decision === "accept") {
    await supabase
      .from("visit_assignments")
      .update({ status: "accepted", accepted_at: now })
      .eq("id", row.id);

    await supabase
      .from("visit_requests")
      .update({ status: "accepted" })
      .eq("id", row.visit_request_id);

    await supabase
      .from("visit_assignments")
      .update({ status: "declined", declined_at: now })
      .eq("visit_request_id", row.visit_request_id)
      .neq("id", row.id)
      .eq("status", "pending");
  } else {
    await supabase
      .from("visit_assignments")
      .update({ status: "declined", declined_at: now })
      .eq("id", row.id);

    const { count } = await supabase
      .from("visit_assignments")
      .select("*", { count: "exact", head: true })
      .eq("visit_request_id", row.visit_request_id)
      .eq("status", "pending");

    if ((count ?? 0) === 0) {
      const { count: accepted } = await supabase
        .from("visit_assignments")
        .select("*", { count: "exact", head: true })
        .eq("visit_request_id", row.visit_request_id)
        .eq("status", "accepted");

      if ((accepted ?? 0) === 0) {
        await supabase
          .from("visit_requests")
          .update({ status: "new" })
          .eq("id", row.visit_request_id);
      }
    }
  }

  return { ok: true };
}
