import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Sätter ett nytt lösenord direkt åt kunden, till exempel när återställnings-
// mejlet inte når fram. Lösenordet loggas aldrig. Adminportalen är på svenska.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 10) {
    return NextResponse.json({ error: "Lösenordet måste vara minst 10 tecken." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", params.id).single();
  if (!profile) return NextResponse.json({ error: "Hittade ingen kund med det id:t." }, { status: 404 });

  const { error } = await admin.auth.admin.updateUserById(params.id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "satte nytt lösenord för",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/set-password", POST_handler);
