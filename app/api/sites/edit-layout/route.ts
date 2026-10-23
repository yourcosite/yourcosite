import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, GRID_LAYOUTS, GALLERY_LAYOUTS, TEAM_LAYOUTS, MENU_LAYOUTS, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Byte av layout på en rutnätssektion via den visuella väljaren i redigeraren.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !(GRID_LAYOUTS as string[]).concat(GALLERY_LAYOUTS, TEAM_LAYOUTS, MENU_LAYOUTS).includes(body.layout)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken layout som ska användas.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const page = content.pages.find((p) => p.path === body.pagePath);
  const section = page?.sections.find((s) => s.id === body.sectionId) as any;
  const allowed: string[] = section?.type === "grid" ? GRID_LAYOUTS : section?.type === "gallery" ? GALLERY_LAYOUTS : section?.type === "team" ? TEAM_LAYOUTS : section?.type === "menu" ? MENU_LAYOUTS : [];
  if (!section || !allowed.includes(body.layout)) {
    return NextResponse.json({ error: t("Hittade inte sektionen på sidan.") }, { status: 400 });
  }
  section.layout = body.layout;

  // Startsidans valda stil (theme.gridLayout) skriver annars över layouten på
  // förstasidans första rutnät, så valet skulle aldrig synas.
  if (section.type === "grid" && page?.path === "/" && content.theme.gridLayout && page.sections.find((s) => s.type === "grid")?.id === section.id) {
    delete content.theme.gridLayout;
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-layout", POST_handler);
