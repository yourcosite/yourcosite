import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { GRID_ICON_IDS } from "@/lib/gridIcons";
import { withErrorLog } from "@/lib/errorLog";

// Byte av ikon i en ruta via den visuella väljaren i redigeraren.
// icon: null = tillbaka till automatiskt val. Inget går via AI:n.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const icon = body.icon === null ? null : typeof body.icon === "string" && GRID_ICON_IDS.includes(body.icon) ? body.icon : undefined;
  const itemIndex = Number.isInteger(body.itemIndex) ? (body.itemIndex as number) : -1;
  if (icon === undefined || typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || itemIndex < 0) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken ikon som ska ändras.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  const item = section?.type === "grid" ? section.items?.[itemIndex] : null;
  if (!item) return NextResponse.json({ error: t("Hittade inte rutan på sidan.") }, { status: 400 });

  if (icon === null) delete item.icon;
  else item.icon = icon;
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-icon", POST_handler);
