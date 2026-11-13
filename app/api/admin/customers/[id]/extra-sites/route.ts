import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Admin: sätt hur många EXTRA sajter (utöver den första som ingår i paketet)
// kunden får ha, när tillägget "1 extra sajt" beställts och fakturerats.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const extraSites = Number(body.extraSites);
  if (!Number.isInteger(extraSites) || extraSites < 0 || extraSites > 4) {
    return NextResponse.json({ error: t("Ange ett antal mellan 0 och 4.") }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ extra_sites: extraSites }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", params.id).single();
  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: `satte antal extra sajter till ${extraSites} för`,
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true, extraSites });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/extra-sites", POST_handler);
