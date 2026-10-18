import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDraftSite } from "@/lib/supabase/onboardingSite";

// Hämtar kundens pågående onboarding-utkast + de sidor som redan valts,
// så att varje steg kan fylla i fälten igen om kunden går fram och tillbaka
// eller laddar om sidan.
export async function GET() {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const site = await getCurrentDraftSite(supabase, user.id);

  if (!site) return NextResponse.json({ site: null, pages: [] });

  const { data: pages } = await supabase
    .from("site_pages")
    .select("*")
    .eq("site_id", site.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ site, pages: pages ?? [] });
}
