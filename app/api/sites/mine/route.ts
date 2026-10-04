import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";

// Hämtar kundens sajt med genererat innehåll. Tar ett valfritt ?id= — utan
// det (eller om id:t inte matchar en egen sajt) faller den tillbaka på
// "senast skapade sajten", precis som innan. ?id= används av kundzonen
// (app/dashboard) och redigeraren så att varje sajt-kort faktiskt öppnar
// SIN egen sajt när kontot har flera — se kommentaren i
// lib/supabase/currentSite.ts för bakgrunden till buggen det fixar.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const requestedId = new URL(request.url).searchParams.get("id");
  const site = await getCurrentPublishedSite(supabase, user.id, requestedId);

  // Hur många foton kunden faktiskt laddade upp för den här sajten — skickas
  // med så att /forslag kan varna tydligt om inga av dem kom med i designen
  // (annars omöjligt att skilja "laddade inget" från "laddade upp men
  // kopplades fel", något som orsakat flera svårfelsökta buggrapporter).
  let uploadedPhotoCount = 0;
  if (site) {
    const { count } = await supabase
      .from("site_assets")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .eq("kind", "image");
    uploadedPhotoCount = count ?? 0;
  }

  return NextResponse.json({ site, uploadedPhotoCount });
}
