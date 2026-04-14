import { createServiceClient } from "@/lib/supabase/service";
import { getAppBaseUrl } from "@/lib/app-base-url";
import { getSmtpTransporter } from "@/lib/smtp";

/**
 * Emails all admin accounts (auth email) when a care team member volunteers for an open visit.
 * No-ops if SMTP or app base URL is missing; logs errors per recipient but does not throw.
 */
export async function notifyAdminsVolunteerOffer(params: {
  visitRequestId: string;
  congregantName: string;
  volunteerName: string;
}): Promise<void> {
  const baseUrl = getAppBaseUrl();
  const transporter = getSmtpTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!transporter || !from || !baseUrl) {
    console.warn(
      "[notifyAdminsVolunteerOffer] Skipping email: configure SMTP_HOST, SMTP_FROM, and NEXT_PUBLIC_APP_URL (or VERCEL_URL on Vercel)",
    );
    return;
  }

  const svc = createServiceClient();
  const { data: admins } = await svc.from("profiles").select("id").eq("role", "admin");
  const emails: string[] = [];
  for (const a of admins ?? []) {
    const { data, error } = await svc.auth.admin.getUserById(a.id);
    if (error || !data.user?.email) continue;
    emails.push(data.user.email);
  }
  const unique = [...new Set(emails)];
  if (!unique.length) return;

  const subject = `Care Ministry: Volunteer offer — ${params.congregantName}`;
  const text = [
    `${params.volunteerName} offered to help with an open visit request.`,
    `Congregant / visit: ${params.congregantName}`,
    "",
    `Review and assign in admin:`,
    `${baseUrl}/admin/requests/${params.visitRequestId}`,
    "",
    `All volunteer offers: ${baseUrl}/admin/volunteer-offers`,
  ].join("\n");

  for (const to of unique) {
    try {
      await transporter.sendMail({ from, to, subject, text });
    } catch (e) {
      console.error("[notifyAdminsVolunteerOffer] send failed", to, e);
    }
  }
}
