"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendMmsNotification } from "@/lib/send-mms-notification";

function notifyRedirect(visitRequestId: string, kind: string, msg?: string): never {
  const qs = new URLSearchParams();
  qs.set("notify", kind);
  if (msg) qs.set("msg", msg.slice(0, 800));
  redirect(`/admin/requests/${visitRequestId}?${qs.toString()}`);
}

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
      intake_visit_windows: null,
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
  const { data: vr } = await supabase
    .from("visit_requests")
    .select("status, deleted_at")
    .eq("id", visitRequestId)
    .single();

  const deleted = Boolean((vr as { deleted_at?: string | null } | null)?.deleted_at);
  if (
    !vr ||
    deleted ||
    vr.status === "completed" ||
    vr.status === "cancelled"
  ) {
    notifyRedirect(visitRequestId, "blocked");
  }

  const { data: existing } = await supabase
    .from("visit_assignments")
    .select("id")
    .eq("visit_request_id", visitRequestId)
    .eq("assignee_id", assigneeId)
    .maybeSingle();

  if (existing) {
    const send = await sendMmsNotification(existing.id);
    if (!send.ok) {
      notifyRedirect(visitRequestId, "error", send.error);
    }
    await supabase.from("visit_offers").delete().eq("visit_request_id", visitRequestId);
    if (send.partial) {
      notifyRedirect(visitRequestId, "partial", send.error);
    }
    notifyRedirect(visitRequestId, "sent");
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
    notifyRedirect(visitRequestId, "assign_failed");
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

  const send = await sendMmsNotification(inserted.id);
  if (!send.ok) {
    notifyRedirect(visitRequestId, "error", send.error);
  }
  await supabase.from("visit_offers").delete().eq("visit_request_id", visitRequestId);
  if (send.partial) {
    notifyRedirect(visitRequestId, "partial", send.error);
  }

  revalidatePath(`/admin/requests/${visitRequestId}`);
  revalidatePath("/admin");
  notifyRedirect(visitRequestId, "sent");
}

export async function archiveVisitRequest(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("visit_request_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("visit_requests").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  await writeAuditLog({
    actorId: user.id,
    action: "archive_visit_request",
    entityType: "visit_request",
    entityId: id,
  });
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function restoreVisitRequest(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("visit_request_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("visit_requests").update({ deleted_at: null }).eq("id", id);
  await writeAuditLog({
    actorId: user.id,
    action: "restore_visit_request",
    entityType: "visit_request",
    entityId: id,
  });
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/requests/${id}`);
}

export async function setVisitRequestLifecycle(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("visit_request_id") ?? "");
  const next = String(formData.get("next_status") ?? "") as
    | "new"
    | "completed"
    | "cancelled";
  if (!id || !["new", "completed", "cancelled"].includes(next)) return;

  const supabase = await createClient();
  await supabase.from("visit_requests").update({ status: next }).eq("id", id);
  await writeAuditLog({
    actorId: user.id,
    action: "visit_request_lifecycle",
    entityType: "visit_request",
    entityId: id,
    meta: { next_status: next },
  });
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/requests/${id}`);
}
