import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, StaffRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

const INVITABLE_ROLES: StaffRole[] = ["support", "admin", "superadmin"];

export async function GET() {
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .in("role", ["support", "admin", "superadmin"])
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data });
}

export async function POST(request: Request) {
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const email = (body.email ?? "").trim();
  const fullName = (body.fullName ?? "").trim();
  const role: StaffRole = INVITABLE_ROLES.includes(body.role) ? body.role : "admin";

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

  // Triggern skapar profilraden med role='customer' som standard — höj till vald nivå.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", created.user.id);

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: `bjöd in ${fullName} som ${role}`,
    targetType: "staff",
    targetId: created.user.id,
    targetLabel: fullName || email,
  });

  return NextResponse.json({
    admin: { id: created.user.id, email, fullName, role },
    tempPassword,
  });
}
