import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, MAX_FIXTURES, type SiteContent } from "@/lib/contentModel";
import { cleanFixture, newFixtureId } from "@/lib/fixtureOps";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Spara hela matchlistan (spelschema och resultat) från redigeringsrutan i
// redigeraren, utan AI. Datum och motståndare krävs för varje match.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !Array.isArray(body.fixtures)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken matchsektion som ska ändras.") }, { status: 400 });
  }
  if (body.fixtures.length > MAX_FIXTURES) {
    return NextResponse.json({ error: t("Det ryms inte fler matcher i sektionen.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (site) await saveSiteVersion(supabase, site as any, "edit-fixtures");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section || section.type !== "fixtures") {
    return NextResponse.json({ error: t("Hittade inte matchsektionen på sidan.") }, { status: 400 });
  }

  const items = [];
  const seen = new Set<string>();
  for (let n = 0; n < body.fixtures.length; n++) {
    const raw = body.fixtures[n] ?? {};
    const c = cleanFixture(raw);
    if (!c) return NextResponse.json({ error: t("Match {n}: datum och motståndare krävs.", { n: n + 1 }) }, { status: 400 });
    if (seen.has(c.id)) c.id = newFixtureId();
    seen.add(c.id);
    items.push(c);
  }
  section.items = items;
  if (typeof body.teamName === "string") {
    const name = body.teamName.trim().slice(0, 80);
    if (name) section.teamName = name; else delete section.teamName;
  }
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-fixtures", POST_handler);
