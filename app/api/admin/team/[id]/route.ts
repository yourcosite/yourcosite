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

// Tar bort adminbehörighet (nedgraderar till vanlig kund). Tar aldrig bort
// själva kontot, och man kan inte ta bort sin egen adminbehörighet härifrån.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  if (check.user.id === params.id) {
    return NextResponse.json(
      { error: "Du kan inte ta bort din egen adminbehörighet." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
