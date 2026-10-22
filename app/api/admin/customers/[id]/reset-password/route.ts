import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Skickar ett återställningsmail till kunden så de kan sätta ett nytt
// lösenord själva (landar på /aterstall-losenord).
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", params.id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: t("Hittade ingen kund med det id:t.") }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/aterstall-losenord`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "skickade återställningsmail till",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/reset-password", POST_handler);
