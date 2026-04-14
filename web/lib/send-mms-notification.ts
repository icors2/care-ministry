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

function shortText(s: string | null | undefined, max: number): string {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export type MmsNotifyResult = {
  ok: boolean;
  /** Some recipients failed while at least one succeeded. */
  partial?: boolean;
  error?: string;
};

/**
 * Sends email-to-MMS (and optional email fallback) for a pending visit assignment.
 * Uses SUPABASE_SERVICE_ROLE_KEY to load rows regardless of caller.
 * Sends one SMTP message per recipient so partial delivery is possible.
 */
export async function sendMmsNotification(visitAssignmentId: string): Promise<MmsNotifyResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return { ok: false, error: "NEXT_PUBLIC_APP_URL is not set" };
  }

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("visit_assignments")
    .select(
      `
      id,
      response_token,
      assignee_id,
      visit_requests (
        id,
        congregant_name,
        address,
        prayer_requests
      )
    `,
    )
    .eq("id", visitAssignmentId)
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Assignment not found" };
  }

  const req = embedOne(row.visit_requests as object) as {
    id: string;
    congregant_name: string;
    address: string;
    prayer_requests: string | null;
  } | null;
  if (!req) {
    return { ok: false, error: "Visit request missing" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_digits, mms_gateway_domain, contact_email, display_name")
    .eq("id", row.assignee_id)
    .single();

  const digits = digitsOnly(profile?.phone_digits ?? null);
  const domain = profile?.mms_gateway_domain;
  const mmsTo = digits && domain ? `${digits}@${domain}` : null;

  const acceptUrl = `${baseUrl}/v/${row.response_token}`;
  const denyUrl = `${baseUrl}/v/${row.response_token}?a=deny`;

  const body = [
    `Care Ministry: Visit for ${shortText(req.congregant_name, 40)}.`,
    shortText(req.address, 60),
    req.prayer_requests ? `Prayer: ${shortText(req.prayer_requests, 80)}` : "",
    `Open: ${acceptUrl}`,
    `Decline: ${denyUrl}`,
  ]
    .filter(Boolean)
    .join(" ");

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const transporter = getSmtpTransporter();

  if (!transporter || !from) {
    return {
      ok: false,
      error: "SMTP_HOST and SMTP_FROM must be configured to send notifications",
    };
  }

  const recipients: string[] = [];
  if (mmsTo) recipients.push(mmsTo);
  if (profile?.contact_email) recipients.push(profile.contact_email);

  if (recipients.length === 0) {
    return {
      ok: false,
      error: "Assignee has no MMS address and no contact_email fallback",
    };
  }

  const failures: string[] = [];
  let anyOk = false;
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: "Care Ministry visit",
        text: body,
      });
      anyOk = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send failed";
      failures.push(`${to}: ${msg}`);
    }
  }

  if (anyOk) {
    await supabase
      .from("visit_assignments")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", visitAssignmentId);
  }

  if (!anyOk) {
    return { ok: false, error: failures.join("; ") || "Send failed" };
  }

  return {
    ok: true,
    partial: failures.length > 0,
    error: failures.length > 0 ? failures.join("; ") : undefined,
  };
}
