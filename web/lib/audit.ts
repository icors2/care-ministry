import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/database.types";

export async function writeAuditLog(params: {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Json;
}) {
  const supabase = createServiceClient();
  await supabase.from("audit_log").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    meta: (params.meta ?? {}) as Json,
  });
}
