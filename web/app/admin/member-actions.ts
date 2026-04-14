"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import type { UserRole } from "@/lib/database.types";

export async function adminCreateUser(formData: FormData) {
  const { user } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const role = (String(formData.get("role") ?? "member") as UserRole) || "member";

  if (!email || password.length < 8) {
    redirect("/admin/members/new?error=1");
  }

  const svc = createServiceClient();
  const { data: created, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: display_name ? { full_name: display_name } : undefined,
  });

  if (error || !created.user) {
    console.error(error);
    redirect("/admin/members/new?error=1");
  }

  await svc
    .from("profiles")
    .update({ role, display_name })
    .eq("id", created.user.id);

  await writeAuditLog({
    actorId: user.id,
    action: "admin_create_user",
    entityType: "profile",
    entityId: created.user.id,
    meta: { email, role },
  });

  revalidatePath("/admin/members");
  redirect(`/admin/members/${created.user.id}?created=1`);
}

export async function adminUpdateMember(formData: FormData) {
  const { user } = await requireAdmin();
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) redirect("/admin/members");

  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "member") as UserRole;
  const phone_digits = String(formData.get("phone_digits") ?? "").replace(/\D/g, "") || null;
  const mms_gateway_domain = String(formData.get("mms_gateway_domain") ?? "").trim() || null;
  const contact_email = String(formData.get("contact_email") ?? "").trim() || null;
  const newPassword = String(formData.get("new_password") ?? "").trim();

  const svc = createServiceClient();

  if (role !== "admin" && role !== "member") {
    redirect(`/admin/members/${memberId}?error=1`);
  }

  const { data: targetProfile } = await svc
    .from("profiles")
    .select("role")
    .eq("id", memberId)
    .single();

  if (targetProfile?.role === "admin" && role === "member") {
    const { count } = await svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("id", memberId);
    if ((count ?? 0) === 0) {
      redirect(`/admin/members/${memberId}?error=last_admin`);
    }
  }

  await svc
    .from("profiles")
    .update({
      display_name,
      role,
      phone_digits,
      mms_gateway_domain,
      contact_email,
    })
    .eq("id", memberId);

  if (newPassword.length >= 8) {
    const { error } = await svc.auth.admin.updateUserById(memberId, { password: newPassword });
    if (error) {
      console.error(error);
      redirect(`/admin/members/${memberId}?error=pw`);
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: "admin_update_user",
    entityType: "profile",
    entityId: memberId,
    meta: { role },
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  redirect(`/admin/members/${memberId}?saved=1`);
}
