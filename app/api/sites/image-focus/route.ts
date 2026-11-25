import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Bildens fokuspunkt (var i bilden det viktiga ligger), så att den beskärs
// runt rätt ställe på varje yta. Sparas i content.imageFocus med bildens
// adress som nyckel, som imageAlts. x och y är procent (0-100). Utan x/y
// tas fokuspunkten bort och bilden beskärs mot mitten som förut.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  if (!imageUrl || imageUrl.length > 1000) return NextResponse.json({ error: t("Ogiltig bildadress.") }, { status: 400 });
  const x = Number(body.x), y = Number(body.y);
  const reset = body.x == null || body.y == null;
  if (!reset && !(isFinite(x) && isFinite(y))) return NextResponse.json({ error: t("Ogiltig position.") }, { status: 400 });

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (site) await saveSiteVersion(supabase, site as any, "image-focus");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const map: Record<string, { x: number; y: number }> = { ...(content.imageFocus || {}) };
  if (reset) delete map[imageUrl];
  else if (Object.keys(map).length < 200 || map[imageUrl]) {
    map[imageUrl] = { x: Math.round(Math.min(100, Math.max(0, x))), y: Math.round(Math.min(100, Math.max(0, y))) };
  }
  if (Object.keys(map).length) content.imageFocus = map;
  else delete content.imageFocus;

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/image-focus", POST_handler);
