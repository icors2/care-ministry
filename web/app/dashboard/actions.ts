"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const phone_digits = String(formData.get("phone_digits") ?? "").replace(/\D/g, "") || null;
  const mms_gateway_domain = String(formData.get("mms_gateway_domain") ?? "").trim() || null;
  const contact_email = String(formData.get("contact_email") ?? "").trim() || null;

  await supabase
    .from("profiles")
    .update({
      display_name,
      phone_digits,
      mms_gateway_domain,
      contact_email,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/profile");
}

export async function addAvailabilityBlock(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const day_of_week = parseInt(String(formData.get("day_of_week")), 10);
  const start_time = String(formData.get("start_time") ?? "09:00");
  const end_time = String(formData.get("end_time") ?? "12:00");
  const timezone = String(formData.get("timezone") ?? "America/New_York");

  if (Number.isNaN(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return;
  }

  await supabase.from("availability_blocks").insert({
    user_id: user.id,
    day_of_week,
    start_time: start_time.length === 5 ? `${start_time}:00` : start_time,
    end_time: end_time.length === 5 ? `${end_time}:00` : end_time,
    timezone,
  });

  revalidatePath("/dashboard/availability");
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
}

export async function savePostVisitNotes(formData: FormData) {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!assignmentId) return;
  const supabase = await createClient();
  await supabase
    .from("visit_assignments")
    .update({ post_visit_notes: notes })
    .eq("id", assignmentId)
    .eq("assignee_id", user.id)
    .eq("status", "accepted");
  revalidatePath("/dashboard/visits");
}
