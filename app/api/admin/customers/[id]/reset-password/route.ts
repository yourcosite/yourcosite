import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Inte inloggad." }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Kräver admin-behörighet." }, { status: 403 }) };
  }
  return { user };
}

// Skickar ett återställningsmail till kunden så de kan sätta ett nytt
// lösenord själva (landar på /aterstall-losenord).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
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
