import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hämtar den inloggade kundens senast skapade sajt (med genererat innehåll).
// Används av förhandsgranskningen efter onboardingen.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
