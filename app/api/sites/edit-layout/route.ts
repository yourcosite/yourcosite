import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";
import { SECTION_CATALOG } from "@/lib/sectionCatalog";
import { prepareImageSection, fillMissingImages } from "@/lib/ensureImageSlots";
import { convertSection } from "@/lib/convertSection";

// Byte av layout på en rutnätssektion via den visuella väljaren i redigeraren.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const catalogLayouts = (type: string): string[] => SECTION_CATALOG.find((c) => c.type === type)?.layouts.map((l) => l.id) ?? [];
  const adding = body.add === true;
  if (typeof body.pagePath !== "string" || (!adding && typeof body.sectionId !== "string") || typeof body.layout !== "string") {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken layout som ska användas.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (site) await saveSiteVersion(supabase, site as any, "edit-layout");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const page = content.pages.find((p) => p.path === body.pagePath);
  let section = page?.sections.find((s) => s.id === body.sectionId) as any;
  // Ny sektion: skapas av en tom "om oss"-sektion med platshållartexter och
  // läggs överst (hero) eller sist (övriga typer).
  if (page && adding) {
    if (typeof body.type !== "string" || !catalogLayouts(body.type).includes(body.layout)) {
      return NextResponse.json({ error: t("Den sektionstypen går inte att skapa av en annan sektion. Be Millie lägga till den.") }, { status: 400 });
    }
    const fresh = convertSection({ id: `${body.type}-${Math.random().toString(36).slice(2, 8)}`, type: "about", heading: "", body: "" }, body.type, body.layout);
    if (!fresh) {
      return NextResponse.json({ error: t("Den sektionstypen går inte att skapa av en annan sektion. Be Millie lägga till den.") }, { status: 400 });
    }
    if (body.type === "hero") page.sections.unshift(fresh as any);
    else page.sections.push(fresh as any);
    section = fresh;
  }
  if (!page || !section) {
    return NextResponse.json({ error: t("Hittade inte sektionen på sidan.") }, { status: 400 });
  }
  // Annan sektionstyp vald i mallgalleriet: sektionen byter typ och behåller
  // rubrik, text, bild och knapp där det går.
  if (!adding && typeof body.type === "string" && body.type !== section.type) {
    const catalogOk = catalogLayouts(body.type).includes(body.layout);
    const converted = catalogOk ? convertSection(section, body.type, body.layout) : null;
    if (!converted) {
      return NextResponse.json({ error: t("Den sektionstypen går inte att skapa av en annan sektion. Be Millie lägga till den.") }, { status: 400 });
    }
    page.sections[page.sections.indexOf(section)] = converted as any;
    section = converted;
  }
  const allowed: string[] = section ? catalogLayouts(section.type) : [];
  if (!section || !allowed.includes(body.layout)) {
    return NextResponse.json({ error: t("Hittade inte sektionen på sidan.") }, { status: 400 });
  }
  section.layout = body.layout;
  // Bildsektion: radlayouterna behöver 3 eller 4 bildplatser, fyllda med sajtens egna foton.
  if (section.type === "image") {
    prepareImageSection(section);
    const { data: assetRows } = await supabase.from("site_assets").select("file_url").eq("site_id", site.id).eq("kind", "image");
    const urls = (assetRows || []).map((r: { file_url: string }) => r.file_url);
    const own = [section.imageUrl, ...(section.items || []).map((i: any) => i?.imageUrl)].filter(Boolean) as string[];
    fillMissingImages(content, Array.from(new Set([...own, ...urls])), new Set([page!.path]));
  }

  // Startsidans valda stil (theme.gridLayout) skriver annars över layouten på
  // förstasidans första rutnät, så valet skulle aldrig synas.
  // Samma sak för startsidans första hero, om oss och uppmaning.
  const themeKey: Record<string, "heroLayout" | "aboutLayout" | "gridLayout" | "ctaLayout"> = {
    hero: "heroLayout", about: "aboutLayout", grid: "gridLayout", cta: "ctaLayout",
  };
  const tk = themeKey[section.type];
  if (tk && page?.path === "/" && content.theme[tk] && page.sections.find((s) => s.type === section.type)?.id === section.id) {
    delete content.theme[tk];
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-layout", POST_handler);
