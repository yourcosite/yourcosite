import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { cleanCategories } from "@/lib/menuOps";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Spara hela menyn från redigeringsrutan i redigeraren (utan AI): kategorier,
// rätter, priser, kostmärken och allergitext.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !Array.isArray(body.categories)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken meny som ska ändras.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section || section.type !== "menu") {
    return NextResponse.json({ error: t("Hittade inte menyn på sidan.") }, { status: 400 });
  }

  section.categories = cleanCategories(body.categories);
  if (typeof body.note === "string") {
    const note = body.note.trim().slice(0, 500);
    if (note) section.note = note; else delete section.note;
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-menu", POST_handler);
