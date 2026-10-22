import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, MAX_GALLERY_IMAGES, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Lägg till eller ta bort bilder i ett galleri direkt i redigeraren (utan AI).
// Bilderna är redan uppladdade till lagringen av webbläsaren; här sparas bara
// adresserna.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || (body.action !== "add" && body.action !== "remove")) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilket galleri som ska ändras.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section || section.type !== "gallery") {
    return NextResponse.json({ error: t("Hittade inte galleriet på sidan.") }, { status: 400 });
  }

  if (body.action === "add") {
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls.filter((u: unknown): u is string => typeof u === "string" && /^https:\/\//.test(u) && u.length < 600).slice(0, 40)
      : [];
    if (urls.length === 0) return NextResponse.json({ error: t("Inga bilder att lägga till.") }, { status: 400 });
    // Tomma platser (utan bild) fylls först, sedan läggs resten till sist.
    const rest = [...urls];
    for (const it of section.items) {
      if (!it.imageUrl && rest.length > 0) it.imageUrl = rest.shift();
    }
    for (const u of rest) section.items.push({ imageUrl: u });
    if (section.items.length > MAX_GALLERY_IMAGES) {
      return NextResponse.json({ error: t("Ett galleri kan ha högst {max} bilder.", { max: MAX_GALLERY_IMAGES }) }, { status: 400 });
    }
  } else {
    const idx = Number.isInteger(body.index) ? (body.index as number) : -1;
    if (idx < 0 || idx >= section.items.length) {
      return NextResponse.json({ error: t("Hittade inte bilden i galleriet.") }, { status: 400 });
    }
    section.items.splice(idx, 1);
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-gallery", POST_handler);
