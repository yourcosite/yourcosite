import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

// Genererar en engångslänk som loggar in webbläsaren som kunden.
// Bara superadmin, eftersom det här är den känsligaste admin-åtgärden
// som finns — den byter faktiskt ut vems session webbläsaren har.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", params.id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: "Hittade ingen kund med det id:t." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo: `${origin}/dashboard` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "loggade in som kunden",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });

  return NextResponse.json({ actionLink: data.properties?.action_link });
}
