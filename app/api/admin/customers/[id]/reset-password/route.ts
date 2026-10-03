import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";

// Skickar ett återställningsmail till kunden så de kan sätta ett nytt
// lösenord själva (landar på /aterstall-losenord).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", params.id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: "Hittade ingen kund med det id:t." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/aterstall-losenord`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
