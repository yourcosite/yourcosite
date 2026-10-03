import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hämtar kundens pågående onboarding-utkast + de sidor som redan valts,
// så att varje steg kan fylla i fälten igen om kunden går fram och tillbaka
// eller laddar om sidan.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", user.id)
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!site) return NextResponse.json({ site: null, pages: [] });

  const { data: pages } = await supabase
    .from("site_pages")
    .select("*")
    .eq("site_id", site.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ site, pages: pages ?? [] });
}
