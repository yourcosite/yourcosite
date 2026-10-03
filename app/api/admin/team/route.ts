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

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = await request.json();
  const email = (body.email ?? "").trim();
  const fullName = (body.fullName ?? "").trim();

  if (!email || !fullName) {
    return NextResponse.json({ error: "Namn och e-post krävs." }, { status: 400 });
  }

  const admin = createAdminClient();
  const tempPassword = `YCS-${Math.random().toString(36).slice(2, 10)}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Triggern skapar profilraden med role='customer' som standard — höj till admin.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", created.user.id);

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  return NextResponse.json({
    admin: { id: created.user.id, email, fullName },
    tempPassword,
  });
}
