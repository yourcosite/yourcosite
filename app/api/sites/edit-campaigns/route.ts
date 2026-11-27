import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { sanitizeCampaigns } from "@/lib/campaigns";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Sparar kundens kampanjytor från panelen Kampanjer (utan AI). Hela listan
// skickas och ersätter den gamla. Går att ångra som andra ändringar.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.campaigns)) {
    return NextResponse.json({ error: t("Det gick inte att spara kampanjerna.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (site) await saveSiteVersion(supabase, site as any, "edit-campaigns");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const campaigns = sanitizeCampaigns(body.campaigns);
  if (campaigns.length > 0) content.campaigns = campaigns;
  else delete content.campaigns;

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-campaigns", POST_handler);
