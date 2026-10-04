import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { getSiteNewsArticles, getSiteNewsCategories, uniqueSlugForSite, normalizeCategory, DEFAULT_NEWS_CATEGORY } from "@/lib/newsArticles";

// Nyhetsartiklar för den inloggade kundens egen sajt — skapas och
// publiceras här av kunden själv (app/nyheter/page.tsx), aldrig av Millie
// i chattredigeraren. Visas på sajten via "newsList"-sektionen, se
// lib/contentModel.ts.
const MAX_TITLE = 120;
const MAX_EXCERPT = 300;
const MAX_BODY = 20000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site) return NextResponse.json({ articles: [], categories: [] });

  const [articles, categories] = await Promise.all([
    getSiteNewsArticles(supabase, site.id),
    getSiteNewsCategories(supabase, site.id),
  ]);
  return NextResponse.json({ articles, categories, siteId: site.id });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site) {
    return NextResponse.json({ error: "Du har ingen genererad sajt ännu." }, { status: 400 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE) : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim().slice(0, MAX_EXCERPT) : "";
  const articleBody = typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
  const category = normalizeCategory(body.category) || DEFAULT_NEWS_CATEGORY;

  // Schemalagd publicering: ett framtida klockslag kunden valt istället
  // för att publicera direkt — se isArticleLive/syncScheduledArticles i
  // lib/newsArticles.ts för hur den blir synlig av sig själv när tiden
  // passerat. Ett klockslag som redan passerat (eller en ogiltig sträng)
  // räknas inte som schemaläggning.
  const rawScheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt : "";
  const scheduledDate = rawScheduledAt ? new Date(rawScheduledAt) : null;
  const scheduledAt = scheduledDate && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()
    ? scheduledDate.toISOString()
    : null;
  // En schemaläggning styr framför en samtidig "published" — klienten ska
  // bara skicka ettdera, men det här gör ordningen entydig ändå.
  const published = body.published === true && !scheduledAt;

  if (!title) return NextResponse.json({ error: "Artikeln behöver en rubrik." }, { status: 400 });
  if (!articleBody) return NextResponse.json({ error: "Artikeln behöver text." }, { status: 400 });

  // Bilden måste ligga i kundens egen uppladdningsmapp — samma kontroll som
  // chattredigerarens bilagor (se app/api/sites/edit/route.ts).
  if (imageUrl && !imageUrl.includes(`/uploads/${user.id}/`)) {
    return NextResponse.json({ error: "Ogiltig bild." }, { status: 400 });
  }

  const slug = await uniqueSlugForSite(supabase, site.id, title);
  const now = new Date().toISOString();

  const { data: article, error } = await supabase
    .from("site_news_articles")
    .insert({
      site_id: site.id,
      title,
      slug,
      excerpt: excerpt || null,
      body: articleBody,
      image_url: imageUrl,
      category,
      published,
      scheduled_at: scheduledAt,
      published_at: published ? now : null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ article });
}
