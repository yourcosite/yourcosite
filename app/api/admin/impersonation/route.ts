import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/activityLog";
import { IMPERSONATION_COOKIE, IMPERSONATION_FLAG_COOKIE, readImpersonationToken } from "@/lib/impersonation";

// GET: visar om den här webbläsaren just nu är inloggad "som kund" via
// adminportalen (och vilken kund), så att en knapp för att gå tillbaka kan visas.
export async function GET() {
  const info = readImpersonationToken(cookies().get(IMPERSONATION_COOKIE)?.value);
  if (!info) return NextResponse.json({ active: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Är man redan inloggad som admin igen (eller utloggad) är det inte aktivt.
  if (!user || user.id === info.adminId) return NextResponse.json({ active: false });

  const admin = createAdminClient();
  const { data: customer } = await admin.from("profiles").select("full_name, email").eq("id", info.customerId).maybeSingle();
  return NextResponse.json({ active: true, customerName: customer?.full_name || customer?.email || "kunden" });
}

// POST: tillbaka till adminvyn utan att logga in på nytt. Rollen kontrolleras
// igen här — kakan räcker inte ensam.
export async function POST(request: Request) {
  const info = readImpersonationToken(cookies().get(IMPERSONATION_COOKIE)?.value);
  if (!info) return NextResponse.json({ error: "Ingen pågående inloggning som kund." }, { status: 400 });

  const admin = createAdminClient();
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("email, role, full_name")
    .eq("id", info.adminId)
    .maybeSingle();
  if (!adminProfile?.email || adminProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Adminkontot kunde inte återställas." }, { status: 403 });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: adminProfile.email,
    options: { redirectTo: `${origin}/admin/kunder/${info.customerId}` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logActivity(admin, {
    actorId: info.adminId,
    actorName: adminProfile.full_name || adminProfile.email,
    action: "gick tillbaka till adminvyn efter att ha varit inloggad som kund",
    targetType: "customer",
    targetId: info.customerId,
    targetLabel: "",
  });

  const hashed = data.properties?.hashed_token;
  if (!hashed) return NextResponse.json({ error: "Kunde inte skapa inloggningslänken." }, { status: 500 });
  const res = NextResponse.json({
    actionLink: `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&next=${encodeURIComponent(`/admin/kunder/${info.customerId}`)}`,
  });
  res.cookies.delete(IMPERSONATION_COOKIE);
  res.cookies.delete(IMPERSONATION_FLAG_COOKIE);
  return res;
}
