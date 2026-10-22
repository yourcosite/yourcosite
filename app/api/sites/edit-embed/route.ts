import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { MAX_EMBED_CODE } from "@/lib/embedDoc";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Spara kundens inbäddade kod (sektionen "embed") direkt från redigeraren,
// utan AI. Koden körs senare i en isolerad ram (lib/embedDoc.ts).
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken inbäddning som ska ändras.") }, { status: 400 });
  }
  if (body.code.length > MAX_EMBED_CODE) {
    return NextResponse.json({ error: t("Koden är för lång (högst {max} tecken).", { max: MAX_EMBED_CODE }) }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section || section.type !== "embed") {
    return NextResponse.json({ error: t("Hittade inte inbäddningen på sidan.") }, { status: 400 });
  }

  const code = body.code.trim();
  if (code) section.code = code; else delete section.code;
  const h = Number(body.height);
  if (Number.isFinite(h) && h >= 100 && h <= 3000) section.height = Math.round(h); else delete section.height;
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-embed", POST_handler);
