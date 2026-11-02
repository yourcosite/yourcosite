import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { saveSiteVersion } from "@/lib/siteVersions";
import { withErrorLog } from "@/lib/errorLog";

// Versionshistorik: GET listar sparade versioner (se lib/siteVersions.ts),
// POST återställer en av dem. Den nuvarande sajten sparas först som en ny
// version, så även en återställning går att ångra.
export const dynamic = "force-dynamic";

function countWords(v: unknown): number {
  if (typeof v === "string") return v.trim() ? v.trim().split(/\s+/).length : 0;
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + countWords(x), 0);
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).reduce(
      (n, [k, x]) => n + (/url|link|id|type|layout|color|path/i.test(k) ? 0 : countWords(x)),
      0
    );
  }
  return 0;
}

async function GET_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId");
  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });

  const { data, error } = await supabase
    .from("site_versions")
    .select("id, reason, created_at, content")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ versions: [], unavailable: true });

  const versions = (data || []).map((r: { id: string; reason: string | null; created_at: string; content: SiteContent }) => {
    const pages = Array.isArray(r.content?.pages) ? r.content.pages : [];
    return {
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      pages: pages.length,
      sections: pages.reduce((n, p) => n + (Array.isArray(p.sections) ? p.sections.length : 0), 0),
      words: countWords(pages),
    };
  });
  const cur = (site.content as SiteContent).pages || [];
  return NextResponse.json({
    versions,
    current: { pages: cur.length, sections: cur.reduce((n, p) => n + p.sections.length, 0), words: countWords(cur) },
  });
}

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const body = await request.json();
  const versionId = typeof body.versionId === "string" ? body.versionId : null;
  if (!versionId) return NextResponse.json({ error: t("Välj en version.") }, { status: 400 });
  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });

  const { data: version } = await supabase
    .from("site_versions")
    .select("content")
    .eq("id", versionId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!version || !isValidSiteContent(version.content)) {
    return NextResponse.json({ error: t("Den versionen gick inte att läsa.") }, { status: 400 });
  }

  await saveSiteVersion(supabase, site as any, "restore");

  const restored: SiteContent = { ...(version.content as SiteContent) };
  // Loggan och sociala länkar styrs från onboardingen, aldrig av en version.
  if (site.logo_url) restored.logoUrl = site.logo_url;
  else delete restored.logoUrl;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) restored.socialLinks = site.social_links;
  else delete restored.socialLinks;

  const { error } = await supabase
    .from("sites")
    .update({ content: restored, accent_color: restored.theme.accentColor, secondary_colors: restored.theme.secondaryColors })
    .eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: restored });
}

export const GET = withErrorLog("GET /api/sites/versions", GET_handler);
export const POST = withErrorLog("POST /api/sites/versions", POST_handler);
