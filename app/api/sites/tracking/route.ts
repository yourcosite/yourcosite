import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";

// Sätter Google Analytics/Meta Pixel-ID direkt (sajtinställningarna i
// chattredigeraren) — samma fält som Millie kan sätta via /api/sites/edit
// (se gaMeasurementId/metaPixelId där), bara en snabbare väg in när kunden
// redan har ID:t till hands istället för att skriva det i chatten.
const GA_ID_PATTERN = /^(G|UA)-[A-Za-z0-9-]+$/;
const META_PIXEL_ID_PATTERN = /^\d{10,20}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const gaMeasurementId = typeof body.gaMeasurementId === "string" ? body.gaMeasurementId.trim() : "";
  const metaPixelId = typeof body.metaPixelId === "string" ? body.metaPixelId.trim() : "";

  if (gaMeasurementId && !GA_ID_PATTERN.test(gaMeasurementId)) {
    return NextResponse.json(
      { error: "Google Analytics-ID ser fel ut — ska börja med \"G-\" (eller äldre \"UA-\")." },
      { status: 400 }
    );
  }
  if (metaPixelId && !META_PIXEL_ID_PATTERN.test(metaPixelId)) {
    return NextResponse.json({ error: "Meta Pixel-ID ska bara innehålla siffror." }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt att uppdatera." }, { status: 400 });
  }

  const updatedContent: SiteContent = { ...site.content };
  if (gaMeasurementId) updatedContent.gaMeasurementId = gaMeasurementId;
  else delete updatedContent.gaMeasurementId;
  if (metaPixelId) updatedContent.metaPixelId = metaPixelId;
  else delete updatedContent.metaPixelId;

  const { error } = await supabase
    .from("sites")
    .update({ content: updatedContent })
    .eq("id", site.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: updatedContent });
}
