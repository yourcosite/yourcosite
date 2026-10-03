import type { SupabaseClient } from "@supabase/supabase-js";

// Skriver en rad till admin_activity_log. Tar alltid admin-klienten
// (service role) eftersom den som loggar nästan alltid gör det som en
// del av en annan privilegierad åtgärd. Fel vid loggning ska aldrig
// stoppa själva åtgärden — vi bara struntar i felet.
export async function logActivity(
  admin: SupabaseClient,
  entry: {
    actorId: string;
    actorName: string;
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
  }
) {
  try {
    await admin.from("admin_activity_log").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
    });
  } catch {
    // best-effort, ignorera
  }
}
