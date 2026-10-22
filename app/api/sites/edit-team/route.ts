import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, MAX_TEAM_MEMBERS, type SiteContent, type TeamItem } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isUnsplashImageUrl } from "@/lib/stockPhotos";
import { withErrorLog } from "@/lib/errorLog";

// Spara hela personlistan i en personsektion (team) från redigeringsrutan i
// redigeraren, utan AI. Krav: foto, namn och titel. E-post och telefon är
// valfria.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !Array.isArray(body.members)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vilken personsektion som ska ändras.") }, { status: 400 });
  }
  if (body.members.length > MAX_TEAM_MEMBERS) {
    return NextResponse.json({ error: t("Högst {max} personer går att visa i en sektion.", { max: MAX_TEAM_MEMBERS }) }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const section = content.pages.find((p) => p.path === body.pagePath)?.sections.find((s) => s.id === body.sectionId) as any;
  if (!section || section.type !== "team") {
    return NextResponse.json({ error: t("Hittade inte personsektionen på sidan.") }, { status: 400 });
  }

  const existingUrls = new Set<string>((section.items as TeamItem[]).map((i) => i.imageUrl).filter((u): u is string => !!u));
  const items: TeamItem[] = [];
  for (let n = 0; n < body.members.length; n++) {
    const m = body.members[n] ?? {};
    const name = typeof m.name === "string" ? m.name.trim().slice(0, 80) : "";
    const title = typeof m.title === "string" ? m.title.trim().slice(0, 100) : "";
    const imageUrl = typeof m.imageUrl === "string" ? m.imageUrl : "";
    if (!name || !title || !imageUrl) {
      return NextResponse.json({ error: t("Person {n}: foto, namn och titel krävs.", { n: n + 1 }) }, { status: 400 });
    }
    // Bara kundens egna uppladdningar, en bild som redan finns i sektionen
    // eller en stockbild — aldrig en godtycklig adress.
    const okUrl =
      imageUrl.length < 600 &&
      imageUrl.startsWith("https://") &&
      (existingUrls.has(imageUrl) || imageUrl.includes(`/uploads/${user.id}/`) || isUnsplashImageUrl(imageUrl));
    if (!okUrl) return NextResponse.json({ error: t("Ogiltig bildadress.") }, { status: 400 });
    const email = typeof m.email === "string" ? m.email.trim().slice(0, 120) : "";
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: t("Person {n}: e-postadressen ser inte rätt ut.", { n: n + 1 }) }, { status: 400 });
    }
    const phone = typeof m.phone === "string" ? m.phone.trim().slice(0, 40) : "";
    const item: TeamItem = { imageUrl, name, title };
    if (email) item.email = email;
    if (phone) item.phone = phone;
    items.push(item);
  }
  section.items = items;
  if (!isValidSiteContent(content)) return NextResponse.json({ error: t("Ändringen blev ogiltig.") }, { status: 400 });

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/edit-team", POST_handler);
