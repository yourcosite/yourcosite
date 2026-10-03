import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { PLAN_LABELS } from "@/lib/pricing";

const VALID_PLANS = ["bas", "standard", "premium"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const plan = body.plan;
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Ogiltig plan." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: site, error: siteError } = await admin
    .from("sites")
    .select("id")
    .eq("owner_id", params.id)
    .limit(1)
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "Kunden har ingen sajt att ändra plan på än." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("sites").update({ plan }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", params.id)
    .single();

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: `ändrade plan till ${PLAN_LABELS[plan] ?? plan} för`,
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true, plan });
}
