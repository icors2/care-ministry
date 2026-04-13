import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;

/**
 * Limits anonymous public intake by hashed IP. Uses service role (RLS blocks direct client writes).
 */
export async function checkIntakeRateLimit(ip: string): Promise<{ ok: boolean }> {
  const secret = process.env.RATE_LIMIT_SECRET ?? "care-ministry-local";
  const ip_hash = createHash("sha256").update(`${secret}:${ip}`).digest("hex");
  const supabase = createServiceClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error: countError } = await supabase
    .from("intake_rate_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("created_at", since);

  if (countError) {
    console.error(countError);
    return { ok: true };
  }

  if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false };
  }

  const { error: insertError } = await supabase
    .from("intake_rate_log")
    .insert({ ip_hash });

  if (insertError) {
    console.error(insertError);
  }

  return { ok: true };
}

export function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return h.get("x-real-ip") ?? "unknown";
}
