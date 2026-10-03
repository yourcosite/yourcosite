import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

// Tar bort adminbehörighet (nedgraderar till vanlig kund). Tar aldrig bort
// själva kontot, och man kan inte ta bort sin egen adminbehörighet härifrån.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  if (check.user.id === params.id) {
    return NextResponse.json(
      { error: "Du kan inte ta bort din egen adminbehörighet." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", params.id)
    .single();

  const { error } = await admin
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "tog bort adminbehörighet för",
    targetType: "staff",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true });
}
