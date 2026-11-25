import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Bildens fokuspunkt (var i bilden det viktiga ligger) för EN bild på EN yta:
// sparas på sektionen (imageFocus för huvudbilden) eller på rutan/bilden
// (focus), så att samma bild kan beskäras olika på olika ställen. x och y är
// procent (0-100). Utan x/y tas fokuspunkten bort (mittbeskärning).
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const sel = body.selection;
  if (!sel || typeof sel.pagePath !== "string" || typeof sel.sectionId !== "string" || !["hero", "gridItem", "galleryItem"].includes(sel.kind)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken bild det gäller.") }, { status: 400 });
  }
  const x = Number(body.x), y = Number(body.y);
  const reset = body.x == null || body.y == null;
  if (!reset && !(isFinite(x) && isFinite(y))) return NextResponse.json({ error: t("Ogiltig position.") }, { status: 400 });
  const focus = reset ? null : { x: Math.round(Math.min(100, Math.max(0, x))), y: Math.round(Math.min(100, Math.max(0, y))) };

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (site) await saveSiteVersion(supabase, site as any, "image-focus");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === sel.pagePath)?.sections.find((sec) => sec.id === sel.sectionId) as any;
  if (!section) return NextResponse.json({ error: t("Hittade inte bilden på sidan.") }, { status: 400 });
  const target = sel.kind === "hero" ? section : Array.isArray(section.items) ? section.items[Number(sel.itemIndex)] : undefined;
  if (!target) return NextResponse.json({ error: t("Hittade inte bilden på sidan.") }, { status: 400 });
  const field = sel.kind === "hero" ? "imageFocus" : "focus";
  if (focus) target[field] = focus;
  else delete target[field];

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/image-focus", POST_handler);
