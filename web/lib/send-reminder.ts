import { createServiceClient } from "@/lib/supabase/service";
import { getSmtpTransporter } from "@/lib/smtp";
import { embedOne } from "@/lib/unwrap-embed";

function digitsOnly(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d.length >= 10 ? d.slice(-10) : null;
}

/**
 * Sends a short reminder email/MMS before an accepted visit window.
 */
export async function sendVisitReminder(assignmentId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const transporter = getSmtpTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!transporter || !from) {
    return { ok: false, error: "SMTP not configured" };
  }

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      assignee_id,
      reminder_sent_at,
      visit_requests ( congregant_name, visit_window_start )
    `,
    )
    .eq("id", assignmentId)
    .eq("status", "accepted")
    .single();

  if (error || !row || row.reminder_sent_at) {
    return { ok: false, error: "Assignment not eligible" };
  }

  const vr = embedOne(row.visit_requests as object) as {
    congregant_name: string;
    visit_window_start: string | null;
  } | null;
  if (!vr?.visit_window_start) {
    return { ok: false, error: "No visit window" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_digits, mms_gateway_domain, contact_email")
    .eq("id", row.assignee_id)
    .single();

  const digits = digitsOnly(profile?.phone_digits ?? null);
  const domain = profile?.mms_gateway_domain;
  const mmsTo = digits && domain ? `${digits}@${domain}` : null;
  const recipients = [mmsTo, profile?.contact_email].filter(Boolean) as string[];
  if (!recipients.length) {
    return { ok: false, error: "No recipient" };
  }

  const when = new Date(vr.visit_window_start).toLocaleString();
  const text = `Care Ministry reminder: Visit for ${vr.congregant_name} — ${when}`;

  const failures: string[] = [];
  let anyOk = false;
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: "Care Ministry reminder",
        text,
      });
      anyOk = true;
    } catch (e) {
      failures.push(e instanceof Error ? e.message : "send failed");
    }
  }

  if (!anyOk) {
    return { ok: false, error: failures.join("; ") || "send failed" };
  }

  await supabase
    .from("visit_assignments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", assignmentId);

  return { ok: true };
}
