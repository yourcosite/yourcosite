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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = await request.json();
  const fullName = (body.fullName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = (body.email ?? "").trim();

  const admin = createAdminClient();

  if (email) {
    const { error: authError } = await admin.auth.admin.updateUserById(params.id, { email });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      ...(email ? { email } : {}),
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
