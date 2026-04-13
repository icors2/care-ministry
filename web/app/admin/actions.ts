"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendMmsNotification } from "@/lib/send-mms-notification";

export async function updateVisitWindow(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("visit_request_id") ?? "");
  const start = String(formData.get("visit_window_start") ?? "").trim();
  const end = String(formData.get("visit_window_end") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("visit_requests")
    .update({
      visit_window_start: start ? new Date(start).toISOString() : null,
      visit_window_end: end ? new Date(end).toISOString() : null,
    })
    .eq("id", id);

  await writeAuditLog({
    actorId: user.id,
    action: "update_visit_window",
    entityType: "visit_request",
    entityId: id,
  });

  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
}

/** Form action: create assignment (or resend MMS) and refresh. */
export async function assignAndNotify(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const visitRequestId = String(formData.get("visit_request_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  if (!visitRequestId || !assigneeId) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("visit_assignments")
    .select("id")
    .eq("visit_request_id", visitRequestId)
    .eq("assignee_id", assigneeId)
    .maybeSingle();

  if (existing) {
    await sendMmsNotification(existing.id);
    revalidatePath(`/admin/requests/${visitRequestId}`);
    revalidatePath("/admin");
    return;
  }

  const { data: inserted, error } = await supabase
    .from("visit_assignments")
    .insert({
      visit_request_id: visitRequestId,
      assignee_id: assigneeId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error(error);
    return;
  }

  await supabase
    .from("visit_requests")
    .update({ status: "pending_member" })
    .eq("id", visitRequestId);

  await writeAuditLog({
    actorId: user.id,
    action: "assign_visit",
    entityType: "visit_assignment",
    entityId: inserted.id,
    meta: { visit_request_id: visitRequestId, assignee_id: assigneeId },
  });

  await sendMmsNotification(inserted.id);

  revalidatePath(`/admin/requests/${visitRequestId}`);
  revalidatePath("/admin");
}
