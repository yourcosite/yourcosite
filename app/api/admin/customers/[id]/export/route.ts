import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";

// Exporterar all lagrad data om en kund, i enlighet med GDPR:s rätt till
// registerutdrag. Inkluderar profil, sajter, sajtsidor och interna
// anteckningar (anteckningarna räknas som personuppgifter om kunden
// eftersom de innehåller bedömningar/information om personen).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, phone, company_name, org_number, address_street, address_postal_code, address_city, billing_email, created_at"
    )
    .eq("id", params.id)
    .eq("role", "customer")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Hittade ingen kund med det id:t." }, { status: 404 });
  }

  const { data: sites } = await admin
    .from("sites")
    .select("id, name, domain, industry, tone, status, plan, accent_color, secondary_colors, created_at, updated_at")
    .eq("owner_id", params.id);

  const siteIds = (sites ?? []).map((s) => s.id);
  const { data: pages } =
    siteIds.length > 0
      ? await admin
          .from("site_pages")
          .select("site_id, label, path, status, locked, sort_order, created_at")
          .in("site_id", siteIds)
      : { data: [] };

  const { data: notes } = await admin
    .from("customer_notes")
    .select("content, author_name, created_at")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false });

  const exportData = {
    exporterad: new Date().toISOString(),
    profil: profile,
    sajter: sites ?? [],
    sajtsidor: pages ?? [],
    interna_anteckningar: notes ?? [],
  };

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "exporterade GDPR-data för",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kunddata-${params.id}.json"`,
    },
  });
}
