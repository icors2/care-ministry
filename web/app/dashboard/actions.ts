"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { applyAssignmentResponse } from "@/lib/visit-assignment-response";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const phone_digits = String(formData.get("phone_digits") ?? "").replace(/\D/g, "") || null;
  const mms_gateway_domain = String(formData.get("mms_gateway_domain") ?? "").trim() || null;
  const contact_email = String(formData.get("contact_email") ?? "").trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      phone_digits,
      mms_gateway_domain,
      contact_email,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/profile");
  if (error) {
    redirect("/dashboard/profile?error=1");
  }
  redirect("/dashboard/profile?saved=1");
}

const RECURRENCE_VALUES = new Set(["weekly", "biweekly", "monthly"]);

export async function addAvailabilityBlock(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const day_of_week = parseInt(String(formData.get("day_of_week")), 10);
  const start_time = String(formData.get("start_time") ?? "09:00");
  const end_time = String(formData.get("end_time") ?? "12:00");
  const recurrenceRaw = String(formData.get("recurrence") ?? "weekly");
  const recurrence = RECURRENCE_VALUES.has(recurrenceRaw)
    ? (recurrenceRaw as "weekly" | "biweekly" | "monthly")
    : "weekly";

  if (Number.isNaN(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return;
  }

  const { error } = await supabase.from("availability_blocks").insert({
    user_id: user.id,
    day_of_week,
    start_time: start_time.length === 5 ? `${start_time}:00` : start_time,
    end_time: end_time.length === 5 ? `${end_time}:00` : end_time,
    timezone: CHURCH_TIMEZONE,
    recurrence,
  });

  revalidatePath("/dashboard/availability");
  if (error) {
    console.error(error);
    redirect("/dashboard/availability?error=1");
  }
  redirect("/dashboard/availability?updated=1");
}

export async function deleteAvailabilityBlock(blockId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("availability_blocks")
    .delete()
    .eq("id", blockId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?updated=1");
}

export async function savePostVisitNotes(formData: FormData) {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!assignmentId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("visit_assignments")
    .update({ post_visit_notes: notes })
    .eq("id", assignmentId)
    .eq("assignee_id", user.id)
    .eq("status", "accepted");
  revalidatePath("/dashboard/visits");
  if (error) {
    redirect(`/dashboard/visits?notesError=1&editNotes=${encodeURIComponent(assignmentId)}`);
  }
  redirect("/dashboard/visits?notesSaved=1");
}

export async function respondToAssignmentFromDashboard(formData: FormData) {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const decisionRaw = String(formData.get("decision") ?? "");
  if (!assignmentId || (decisionRaw !== "accept" && decisionRaw !== "decline")) {
    redirect("/dashboard/visits?response=error");
  }
  const res = await applyAssignmentResponse({
    assignmentId,
    assigneeId: user.id,
    decision: decisionRaw,
  });
  if (!res.ok) {
    redirect(`/dashboard/visits?response=${res.error}`);
  }
  redirect(`/dashboard/visits?response=${decisionRaw === "accept" ? "accepted" : "declined"}`);
}

export async function offerVolunteerForVisit(formData: FormData) {
  const user = await requireUser();
  const visitRequestId = String(formData.get("visit_request_id") ?? "");
  if (!visitRequestId) redirect("/dashboard/calendar?volunteer=error");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "member" && profile?.role !== "admin") {
    redirect("/dashboard/calendar?volunteer=forbidden");
  }

  const { data: req } = await supabase.from("visit_requests").select("*").eq("id", visitRequestId).single();

  const row = req as { id: string; status: string; deleted_at?: string | null } | null;
  const archived = Boolean(row?.deleted_at);
  if (!row || row.status !== "new" || archived) {
    redirect("/dashboard/calendar?volunteer=closed");
  }

  const { error } = await supabase.from("visit_offers").insert({
    visit_request_id: visitRequestId,
    member_id: user.id,
  });
  revalidatePath("/dashboard/calendar");
  if (error) {
    redirect("/dashboard/calendar?volunteer=duplicate");
  }
  redirect("/dashboard/calendar?volunteer=ok");
}

export async function withdrawVolunteerForVisit(formData: FormData) {
  const user = await requireUser();
  const visitRequestId = String(formData.get("visit_request_id") ?? "");
  if (!visitRequestId) return;
  const supabase = await createClient();
  await supabase
    .from("visit_offers")
    .delete()
    .eq("visit_request_id", visitRequestId)
    .eq("member_id", user.id);
  revalidatePath("/dashboard/calendar");
  redirect("/dashboard/calendar?volunteer=withdrawn");
}
