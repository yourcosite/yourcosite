import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Byte av knappstil för knapparna i en enskild sektion via redigeraren.
// style = null tar bort sektionens egen stil (sajtens gäller igen).
export const dynamic = "force-dynamic";
const STYLES = ["pill", "square", "underline", "soft", "outline", "rounded", "gradient"];

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const style = body.style;
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !(style === null || STYLES.includes(style))) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken knappstil som ska användas.") }, { status: 400 });
  }
  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section) return NextResponse.json({ error: t("Hittade inte sektionen på sidan.") }, { status: 400 });
  if (style === null) delete section.ctaStyle;
  else section.ctaStyle = style;
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-button-style", POST_handler);
