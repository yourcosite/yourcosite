import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent } from "@/lib/contentModel";
import { assignUploadedImages } from "@/lib/assignUploadedImages";
import { ensureImageSlots } from "@/lib/ensureImageSlots";

// Kopplar om kundens uppladdade foton till en REDAN byggd sajt, utan att
// skriva om några texter (inget nytt AI-anrop — helt gratis och snabbt).
// Täcker fallet där fotona av någon anledning inte kom med i den
// ursprungliga genereringen (t.ex. laddades upp efter att sajten byggdes),
// så kunden slipper bygga om — och betala för — hela sajten på nytt bara
// för att få in bilderna.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, content, hero_image_url")
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (siteError || !site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen genererad sajt." }, { status: 400 });
  }

  const { data: imageAssets, error: assetsError } = await supabase
    .from("site_assets")
    .select("file_url")
    .eq("site_id", site.id)
    .eq("kind", "image")
    .order("created_at", { ascending: true });

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 500 });
  }

  const imageUrls = (imageAssets ?? []).map((a) => a.file_url);
  if (imageUrls.length === 0 && !site.hero_image_url) {
    return NextResponse.json(
      { error: "Hittade inga uppladdade foton att koppla in." },
      { status: 400 }
    );
  }

  const content = ensureImageSlots(site.content);
  const finalContent = assignUploadedImages(content, imageUrls, site.hero_image_url);

  const { error: updateError } = await supabase
    .from("sites")
    .update({ content: finalContent })
    .eq("id", site.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, imagesLinked: imageUrls.length });
}
