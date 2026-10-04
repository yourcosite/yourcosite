import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { uniqueSlugForSite, normalizeCategory } from "@/lib/newsArticles";

const MAX_TITLE = 120;
const MAX_EXCERPT = 300;
const MAX_BODY = 20000;

// Uppdaterar (redigera, publicera/avpublicera) en av kundens egna
// artiklar. RLS (site_news_articles-policyerna i supabase/schema.sql)
// garanterar att man bara kan röra artiklar på sin egen sajt — men vi
// kollar även explicit här så ett 404 känns rimligt istället för ett
// tyst "0 rader uppdaterade".
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site) return NextResponse.json({ error: "Ingen sajt hittades." }, { status: 400 });

  const { data: existing } = await supabase
    .from("site_news_articles")
    .select("*")
    .eq("id", params.id)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Hittade inte artikeln." }, { status: 404 });

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, MAX_TITLE);
    if (!title) return NextResponse.json({ error: "Artikeln behöver en rubrik." }, { status: 400 });
    update.title = title;
    if (title !== existing.title) {
      update.slug = await uniqueSlugForSite(supabase, site.id, title, existing.id);
    }
  }
  if (typeof body.excerpt === "string") update.excerpt = body.excerpt.trim().slice(0, MAX_EXCERPT) || null;
  if (typeof body.category === "string") {
    const category = normalizeCategory(body.category);
    if (!category) return NextResponse.json({ error: "Artikeln behöver en kategori." }, { status: 400 });
    update.category = category;
  }
  if (typeof body.body === "string") {
    const articleBody = body.body.trim().slice(0, MAX_BODY);
    if (!articleBody) return NextResponse.json({ error: "Artikeln behöver text." }, { status: 400 });
    update.body = articleBody;
  }
  if (typeof body.imageUrl === "string" || body.imageUrl === null) {
    const imageUrl = body.imageUrl || null;
    if (imageUrl && !imageUrl.includes(`/uploads/${user.id}/`)) {
      return NextResponse.json({ error: "Ogiltig bild." }, { status: 400 });
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

  const { data: article, error } = await supabase
    .from("site_news_articles")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ article });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site) return NextResponse.json({ error: "Ingen sajt hittades." }, { status: 400 });

  const { error } = await supabase
    .from("site_news_articles")
    .delete()
    .eq("id", params.id)
    .eq("site_id", site.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
