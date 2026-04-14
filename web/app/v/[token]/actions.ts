"use server";

import { applyAssignmentResponse } from "@/lib/visit-assignment-response";

export type RespondResult = { ok: true } | { ok: false; error: string };

/**
 * Accept or decline using the secret token from MMS/email (no login). Service role updates state.
 */
export async function respondToVisitToken(
  token: string,
  decision: "accept" | "decline",
): Promise<RespondResult> {
  const res = await applyAssignmentResponse({ token, decision });
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return { ok: true };
}
