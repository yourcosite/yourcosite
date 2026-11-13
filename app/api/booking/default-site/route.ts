import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withErrorLog } from "@/lib/errorLog";

// Sparar vilken sajt som ska visas först när kunden klickar på "Bokningar"
// i menyn (profiles.default_booking_site, se supabase/bokning-forsta-sajt.sql).
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });

  // Sajten måste ägas av kunden.
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 });

  const { error } = await createAdminClient().from("profiles").update({ default_booking_site: siteId }).eq("id", user.id);
  if (error) return NextResponse.json({ error: t("Kunde inte spara valet.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/booking/default-site", POST_handler);
