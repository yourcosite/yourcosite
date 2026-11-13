import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Växlar en kunds primära sajt mellan "live" och "pausad". Rör inte
// sajter som fortfarande är i utkastläge (de har inget att pausa).
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();

  const body = await request.json().catch(() => ({}));
  let siteQuery = admin
    .from("sites")
    .select("id, name, status")
    .eq("owner_id", params.id)
    .in("status", ["live", "pausad"]);
  if (typeof body?.siteId === "string" && body.siteId) siteQuery = siteQuery.eq("id", body.siteId);
  const { data: site, error: siteError } = await siteQuery.order("created_at", { ascending: true }).limit(1).single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: t("Kunden har ingen live eller pausad sajt att ändra.") },
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

export const POST = withErrorLog("POST /api/admin/customers/[id]/toggle-pause", POST_handler);
