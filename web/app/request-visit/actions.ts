"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { checkIntakeRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export type SubmitVisitResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Public intake: honeypot, consent, rate limit (hashed IP), then insert via service role.
 */
export async function submitVisitRequest(formData: FormData): Promise<SubmitVisitResult> {
  if (formData.get("website")) {
    return { ok: false, error: "spam" };
  }

  const consent = formData.get("consent") === "on";
  if (!consent) {
    return { ok: false, error: "consent_required" };
  }

  const headersList = await headers();
  const ip = clientIpFromHeaders(headersList);
  const { ok: rateOk } = await checkIntakeRateLimit(ip);
  if (!rateOk) {
    return { ok: false, error: "rate_limited" };
  }

  const congregant_name = String(formData.get("congregant_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const preferred_times_text = String(formData.get("preferred_times_text") ?? "").trim() || null;
  const prayer_requests = String(formData.get("prayer_requests") ?? "").trim() || null;
  const special_instructions = String(formData.get("special_instructions") ?? "").trim() || null;

  const windowStartRaw = String(formData.get("visit_window_start") ?? "").trim();
  const windowEndRaw = String(formData.get("visit_window_end") ?? "").trim();
  const visit_window_start = windowStartRaw ? new Date(windowStartRaw).toISOString() : null;
  const visit_window_end = windowEndRaw ? new Date(windowEndRaw).toISOString() : null;

  if (!congregant_name || !address || !phone) {
    return { ok: false, error: "missing_fields" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("visit_requests").insert({
    congregant_name,
    address,
    phone,
    preferred_times_text,
    prayer_requests,
    special_instructions,
    visit_window_start,
    visit_window_end,
    consent_contact: true,
    status: "new",
  });

  if (error) {
    console.error(error);
    return { ok: false, error: "db_error" };
  }

  return { ok: true };
}
