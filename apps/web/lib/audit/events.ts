import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

interface AuditEventInput {
  actorUserId: string | null;
  eventType: string;
  subjectType: string;
  subjectId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(
  supabase: SupabaseClient,
  request: NextRequest,
  input: AuditEventInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("audit_events").insert({
      actor_user_id: input.actorUserId,
      event_type: input.eventType,
      subject_type: input.subjectType,
      subject_id: input.subjectId ?? null,
      ip_address: getRequestIp(request),
      user_agent: request.headers.get("user-agent"),
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.warn("[audit] insert failed", {
        eventType: input.eventType,
        message: error.message,
      });
    }
  } catch (error) {
    console.warn("[audit] insert error", {
      eventType: input.eventType,
      message: error instanceof Error ? error.message : "Unknown audit error.",
    });
  }
}

function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  if (firstForwardedIp) {
    return firstForwardedIp;
  }

  return request.headers.get("x-real-ip");
}
