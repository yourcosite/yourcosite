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
  const hasStyle = "style" in body;
  const hasColor = "color" in body;
  const style = body.style;
  const color = body.color;
  const header = body.header === true;
  const styleOk = !hasStyle || style === null || STYLES.includes(style);
  const colorOk = !hasColor || color === null || (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color));
  if ((!hasStyle && !hasColor) || !styleOk || !colorOk || (!header && (typeof body.pagePath !== "string" || typeof body.sectionId !== "string"))) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken knappstil som ska användas.") }, { status: 400 });
  }
  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  let target: any;
  if (header) {
    const prev = content.theme.headerCta ?? {};
    content.theme.headerCta = { ...prev };
    target = content.theme.headerCta;
  } else {
    const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
    if (!section) return NextResponse.json({ error: t("Hittade inte sektionen på sidan.") }, { status: 400 });
    const idx = typeof body.itemIndex === "number" ? body.itemIndex : null;
    target = idx !== null ? section.items?.[idx] : section;
  }
  if (!target) return NextResponse.json({ error: t("Hittade inte knappen i sektionen.") }, { status: 400 });
  if (hasStyle) {
    if (style === null) delete target.ctaStyle, delete target.style;
    else if (header) target.style = style;
    else target.ctaStyle = style;
  }
  if (hasColor) {
    if (color === null) delete target.ctaColor, delete target.color;
    else if (header) target.color = color;
    else target.ctaColor = color;
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-button-style", POST_handler);
