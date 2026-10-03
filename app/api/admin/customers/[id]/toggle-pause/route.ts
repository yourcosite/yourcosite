import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

// Växlar en kunds primära sajt mellan "live" och "pausad". Rör inte
// sajter som fortfarande är i utkastläge (de har inget att pausa).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();

  const { data: site, error: siteError } = await admin
    .from("sites")
    .select("id, name, status")
    .eq("owner_id", params.id)
    .in("status", ["live", "pausad"])
    .limit(1)
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "Kunden har ingen live eller pausad sajt att ändra." },
      { status: 400 }
    );
  }

  const nextStatus = site.status === "live" ? "pausad" : "live";

  const { error } = await admin.from("sites").update({ status: nextStatus }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", params.id)
    .single();

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: nextStatus === "pausad" ? "pausade kontot för" : "återaktiverade kontot för",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
