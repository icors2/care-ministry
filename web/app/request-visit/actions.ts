"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { checkIntakeRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import type { Json } from "@/lib/database.types";

export type SubmitVisitResult =
  | { ok: true }
  | { ok: false; error: string };

function parseWindowsJson(raw: string): { start: string; end: string }[] {
  if (!raw.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: { start: string; end: string }[] = [];
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const start = typeof o.start === "string" ? o.start : null;
      const end = typeof o.end === "string" ? o.end : null;
      if (!start || !end) continue;
      const s = new Date(start);
      const e = new Date(end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) continue;
      out.push({ start, end });
    }
    return out;
  } catch {
    return [];
  }
}

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
  const prayer_requests = String(formData.get("prayer_requests") ?? "").trim() || null;
  const special_instructions = String(formData.get("special_instructions") ?? "").trim() || null;

  const intake_timing_mode = String(formData.get("intake_timing_mode") ?? "preferred_slots") as
    | "preferred_slots"
    | "specific_windows";
  const recurringRaw = String(formData.get("visit_timing_recurring") ?? "true");
  const visit_timing_recurring = recurringRaw !== "false";

  const preferred_times_text = String(formData.get("preferred_times_text") ?? "").trim() || null;
  const windowsJson = String(formData.get("intake_visit_windows_json") ?? "").trim();
  const parsedWindows = parseWindowsJson(windowsJson);

  const windowStartRaw = String(formData.get("visit_window_start") ?? "").trim();
  const windowEndRaw = String(formData.get("visit_window_end") ?? "").trim();
  let visit_window_start = windowStartRaw ? new Date(windowStartRaw).toISOString() : null;
  let visit_window_end = windowEndRaw ? new Date(windowEndRaw).toISOString() : null;

  let intake_visit_windows: Json | null = null;

  if (intake_timing_mode === "specific_windows") {
    if (!parsedWindows.length) {
      return { ok: false, error: "timing_required" };
    }
    intake_visit_windows = parsedWindows as unknown as Json;
    const first = parsedWindows[0]!;
    visit_window_start = new Date(first.start).toISOString();
    visit_window_end = new Date(first.end).toISOString();
  } else {
    if (!preferred_times_text) {
      return { ok: false, error: "timing_required" };
    }
  }

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
    visit_timing_recurring,
    intake_timing_mode,
    intake_visit_windows,
  });

  if (error) {
    console.error(error);
    return { ok: false, error: "db_error" };
  }

  return { ok: true };
}
