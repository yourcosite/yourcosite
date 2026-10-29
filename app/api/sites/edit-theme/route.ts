import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, HEADER_LAYOUTS, type SiteContent } from "@/lib/contentModel";
import { SKINS } from "@/lib/skins";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Designpanelen i redigeraren: kunden ändrar sajtens tema direkt, utan Millie
// och utan AI-anrop. Samma fält som Millie kan sätta via theme-patchen, men här
// valideras de mot en fast lista. null tar bort fältet (mallens eget värde gäller).
export const dynamic = "force-dynamic";

const BUTTON_STYLES = ["pill", "square", "underline", "soft", "outline", "rounded", "gradient"];

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch = body.patch && typeof body.patch === "object" ? (body.patch as Record<string, unknown>) : null;
  if (!patch || Object.keys(patch).length === 0) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vad som ska ändras.") }, { status: 400 });
  }
  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const theme = content.theme as any;
  const bad = () => NextResponse.json({ error: t("Ogiltigt värde.") }, { status: 400 });

  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case "skin":
        if (value === null) delete theme.skin;
        else if (typeof value === "string" && value in SKINS) theme.skin = value;
        else return bad();
        break;
      case "accentColor":
        if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) theme.accentColor = value.toUpperCase();
        else return bad();
        break;
      case "font":
        if (value === "serif" || value === "sans") theme.font = value;
        else return bad();
        break;
      case "backgroundMode":
        if (value === "light" || value === "warm" || value === "dark") theme.backgroundMode = value;
        else return bad();
        break;
      case "buttonStyle":
        if (value === null) delete theme.buttonStyle;
        else if (typeof value === "string" && BUTTON_STYLES.includes(value)) theme.buttonStyle = value;
        else return bad();
        break;
      case "headerLayout":
        if (typeof value === "string" && (HEADER_LAYOUTS as readonly string[]).includes(value)) theme.headerLayout = value;
        else return bad();
        break;
      case "headerGlass":
        if (typeof value === "boolean") {
          if (value) theme.headerGlass = true;
          else delete theme.headerGlass;
        } else return bad();
        break;
      case "sectionSpacing":
        if (value === null || value === "normal") delete theme.sectionSpacing;
        else if (value === "compact" || value === "airy") theme.sectionSpacing = value;
        else return bad();
        break;
      case "textAlign":
        if (value === null || value === "auto") delete theme.textAlign;
        else if (value === "left" || value === "center" || value === "right") theme.textAlign = value;
        else return bad();
        break;
      case "headingScale":
        if (value === null || value === 1) delete theme.headingScale;
        else if (typeof value === "number" && value >= 0.7 && value <= 1.6) theme.headingScale = Math.round(value * 100) / 100;
        else return bad();
        break;
      default:
        return bad();
    }
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content, ...("accentColor" in patch ? { accent_color: content.theme.accentColor } : {}) }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-theme", POST_handler);
