import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isAllowedImageUrl } from "@/lib/stockPhotos";
import { uniqueSlugForSite, normalizeCategory } from "@/lib/newsArticles";
import { withErrorLog } from "@/lib/errorLog";

const MAX_TITLE = 120;
const MAX_EXCERPT = 300;
const MAX_BODY = 20000;

// Uppdaterar (redigera, publicera/avpublicera) en av kundens egna
// artiklar. RLS (site_news_articles-policyerna i supabase/schema.sql)
// garanterar att man bara kan röra artiklar på sin egen sajt — men vi
// kollar även explicit här så ett 404 känns rimligt istället för ett
// tyst "0 rader uppdaterade".
async function PATCH_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const rawBody = await request.json();
  // Vilken av kundens (eventuellt flera) sajter artikeln hör till — se
  // getCurrentPublishedSite för bakgrunden.
  const siteId = typeof rawBody.siteId === "string" ? rawBody.siteId : null;
  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Ingen sajt hittades.") }, { status: 400 });

  const { data: existing } = await supabase
    .from("site_news_articles")
    .select("*")
    .eq("id", params.id)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: t("Hittade inte artikeln.") }, { status: 404 });

  const body = rawBody;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, MAX_TITLE);
    if (!title) return NextResponse.json({ error: t("Artikeln behöver en rubrik.") }, { status: 400 });
    update.title = title;
    if (title !== existing.title) {
      update.slug = await uniqueSlugForSite(supabase, site.id, title, existing.id);
    }
  }
  if (typeof body.excerpt === "string") update.excerpt = body.excerpt.trim().slice(0, MAX_EXCERPT) || null;
  if (typeof body.category === "string") {
    const category = normalizeCategory(body.category);
    if (!category) return NextResponse.json({ error: t("Artikeln behöver en kategori.") }, { status: 400 });
    update.category = category;
  }
  if (typeof body.body === "string") {
    const articleBody = body.body.trim().slice(0, MAX_BODY);
    if (!articleBody) return NextResponse.json({ error: t("Artikeln behöver text.") }, { status: 400 });
    update.body = articleBody;
  }
  if (typeof body.imageUrl === "string" || body.imageUrl === null) {
    const imageUrl = body.imageUrl || null;
    if (imageUrl && !isAllowedImageUrl(imageUrl, user.id)) {
      return NextResponse.json({ error: t("Ogiltig bild.") }, { status: 400 });
    }
    update.image_url = imageUrl;
  }

  // Schemaläggning (se POST-routen för samma resonemang) — skickas antingen
  // som ett ISO-klockslag (sätt/ändra) eller null (avbryt schemaläggningen,
  // tillbaka till utkast). Vinner över en samtidig "published" i samma
  // anrop, precis som vid skapandet.
  let schedulingNow = false;
  if (body.scheduledAt === null) {
    update.scheduled_at = null;
  } else if (typeof body.scheduledAt === "string" && body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
      update.scheduled_at = d.toISOString();
      update.published = false;
      schedulingNow = true;
    }
  }
  if (typeof body.published === "boolean" && !schedulingNow) {
    update.published = body.published;
    if (body.published) {
      update.scheduled_at = null;
      if (!existing.published) update.published_at = new Date().toISOString();
    }
  }

  // Automatisk avpublicering: ISO-klockslag (sätt/ändra) eller null (ta bort).
  // Avpublicerar man för hand rensas den också — annars blir statusen
  // missvisande.
  if (body.unpublishAt === null || body.published === false) {
    update.unpublish_at = null;
  } else if (typeof body.unpublishAt === "string" && body.unpublishAt) {
    const u = new Date(body.unpublishAt);
    if (isNaN(u.getTime()) || u.getTime() <= Date.now()) {
      return NextResponse.json({ error: t("Avpubliceringen måste ligga i framtiden.") }, { status: 400 });
    }
    const publishFrom = typeof update.scheduled_at === "string" ? new Date(update.scheduled_at).getTime() : Date.now();
    if (u.getTime() <= publishFrom) {
      return NextResponse.json({ error: t("Avpubliceringen måste ligga efter publiceringen.") }, { status: 400 });
    }
    update.unpublish_at = u.toISOString();
  } else if (body.published === true && existing.unpublish_at && new Date(existing.unpublish_at).getTime() <= Date.now()) {
    // Publicerar om en artikel vars avpubliceringstid redan passerat.
    update.unpublish_at = null;
  }
  // Utkast ska inte ha någon avpubliceringstid.
  if (update.unpublish_at && update.published !== true && !update.scheduled_at && !existing.published && !existing.scheduled_at) {
    update.unpublish_at = null;
  }

  const { data: article, error } = await supabase
    .from("site_news_articles")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ article });
}

async function DELETE_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const siteId = new URL(request.url).searchParams.get("siteId");
  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Ingen sajt hittades.") }, { status: 400 });

  const { error } = await supabase
    .from("site_news_articles")
    .delete()
    .eq("id", params.id)
    .eq("site_id", site.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withErrorLog("PATCH /api/news/[id]", PATCH_handler);
export const DELETE = withErrorLog("DELETE /api/news/[id]", DELETE_handler);
