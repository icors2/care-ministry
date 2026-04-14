import { createServiceClient } from "@/lib/supabase/service";

export type AssignmentResponseError = "not_found" | "already_answered" | "forbidden";

/**
 * Shared accept/decline logic for token links and authenticated dashboard.
 */
export async function applyAssignmentResponse(params: {
  token?: string;
  assignmentId?: string;
  /** When using assignmentId (dashboard), must match the row’s assignee. */
  assigneeId?: string;
  decision: "accept" | "decline";
}): Promise<{ ok: true } | { ok: false; error: AssignmentResponseError }> {
  const supabase = createServiceClient();

  if (params.token) {
    const { data: row, error } = await supabase
      .from("visit_assignments")
      .select("id, status, visit_request_id")
      .eq("response_token", params.token)
      .maybeSingle();

    if (error || !row) {
      return { ok: false, error: "not_found" };
    }
    return finalizeResponse(supabase, row, params.decision);
  }

  if (params.assignmentId && params.assigneeId) {
    const { data: row, error } = await supabase
      .from("visit_assignments")
      .select("id, status, visit_request_id, assignee_id")
      .eq("id", params.assignmentId)
      .maybeSingle();

    if (error || !row) {
      return { ok: false, error: "not_found" };
    }
    if (row.assignee_id !== params.assigneeId) {
      return { ok: false, error: "forbidden" };
    }
    return finalizeResponse(
      supabase,
      { id: row.id, status: row.status, visit_request_id: row.visit_request_id },
      params.decision,
    );
  }

  return { ok: false, error: "not_found" };
}

async function finalizeResponse(
  supabase: ReturnType<typeof createServiceClient>,
  row: { id: string; status: string; visit_request_id: string },
  decision: "accept" | "decline",
): Promise<{ ok: true } | { ok: false; error: AssignmentResponseError }> {
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
