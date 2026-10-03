import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";

export async function GET() {
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data });
}

export async function POST(request: Request) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const email = (body.email ?? "").trim();
  const fullName = (body.fullName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const companyName = (body.companyName ?? "").trim();
  const orgNumber = (body.orgNumber ?? "").trim();
  const addressStreet = (body.addressStreet ?? "").trim();
  const addressPostalCode = (body.addressPostalCode ?? "").trim();
  const addressCity = (body.addressCity ?? "").trim();
  const billingEmail = (body.billingEmail ?? "").trim();

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

  await admin
    .from("profiles")
    .update({
      phone,
      company_name: companyName,
      org_number: orgNumber,
      address_street: addressStreet,
      address_postal_code: addressPostalCode,
      address_city: addressCity,
      billing_email: billingEmail,
    })
    .eq("id", created.user.id);

  return NextResponse.json({
    customer: { id: created.user.id, email, fullName },
    tempPassword,
  });
}
