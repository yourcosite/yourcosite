import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const fullName = (body.fullName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = (body.email ?? "").trim();
  const companyName = (body.companyName ?? "").trim();
  const orgNumber = (body.orgNumber ?? "").trim();
  const addressStreet = (body.addressStreet ?? "").trim();
  const addressPostalCode = (body.addressPostalCode ?? "").trim();
  const addressCity = (body.addressCity ?? "").trim();
  const billingEmail = (body.billingEmail ?? "").trim();

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
      company_name: companyName,
      org_number: orgNumber,
      address_street: addressStreet,
      address_postal_code: addressPostalCode,
      address_city: addressCity,
      billing_email: billingEmail,
      ...(email ? { email } : {}),
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "redigerade kunden",
    targetType: "customer",
    targetId: params.id,
    targetLabel: fullName || email || params.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", params.id)
    .single();

  const { error } = await admin.auth.admin.deleteUser(params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "tog bort kunden",
    targetType: "customer",
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true });
}
