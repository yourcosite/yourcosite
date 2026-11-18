import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Nollställer tvåstegsverifieringen för en användare som tappat sin telefon
// och sina reservkoder. Användaren loggar in med bara lösenord och sätter upp
// tvåfaktorn på nytt.
async function POST_handler(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", params.id).single();
  if (!profile) return NextResponse.json({ error: "Hittade ingen användare med det id:t." }, { status: 404 });

  const { data: list, error } = await admin.auth.admin.mfa.listFactors({ userId: params.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  for (const f of list?.factors ?? []) {
    const r = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: params.id });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 });
  }
  await admin.from("mfa_backup_codes").delete().eq("user_id", params.id);

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "nollställde tvåstegsverifiering för",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/reset-2fa", POST_handler);
