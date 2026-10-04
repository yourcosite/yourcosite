import type { SupabaseClient } from "@supabase/supabase-js";

// Delad typ för en nyhetsartikel (tabellen site_news_articles, se
// supabase/schema.sql) — använd av både panelens /nyheter-sida
// (skapa/redigera/publicera) och den publika renderingen av "newsList"-
// sektionen + artikelns egen läsvy i components/SitePreview.tsx.
//
// Tre föreslagna startkategorier — bara förslag, INTE en begränsning
// (kolumnen är fri text): kunden kan skriva en egen kategori i panelen,
// och Millie kan göra detsamma i chatten. Används för standardvalet i
// kategori-väljaren och för att ge Millie något att utgå från.
export const NEWS_CATEGORIES = ["Nyheter", "Erbjudanden", "Evenemang"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export const DEFAULT_NEWS_CATEGORY: NewsCategory = "Nyheter";

const MAX_CATEGORY_LENGTH = 40;

// Normaliserar en kategori (trimmar, kapar längden) och avvisar en tom
// sträng — i övrigt fri text, se kommentaren ovan.
export function normalizeCategory(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_CATEGORY_LENGTH);
  return trimmed || null;
}

export interface NewsArticle {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  image_url: string | null;
  category: string;
  published: boolean;
  // Satt när kunden valt att schemalägga artikeln till ett framtida
  // klockslag istället för att publicera direkt — se isArticleLive/
  // syncScheduledArticles nedan för hur den faktiskt blir synlig.
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Är artikeln synlig för besökare just nu? Antingen uttryckligen
// publicerad, eller schemalagd till ett klockslag som redan passerat (se
// syncScheduledArticles — den "låser upp" en sådan permanent i databasen
// nästa gång någon hämtar sajtens artiklar, men den här funktionen gör
// att gränsen känns exakt även mellan de hämtningarna).
export function isArticleLive(article: Pick<NewsArticle, "published" | "scheduled_at">): boolean {
  if (article.published) return true;
  if (article.scheduled_at && new Date(article.scheduled_at).getTime() <= Date.now()) return true;
  return false;
}

// De kategorier kunden redan använt på den här sajten (utöver de tre
// föreslagna standardkategorierna) — används för att fylla
// kategori-väljaren i panelen och för att Millie i chatten ska återanvända
// exakt samma stavning istället för att skapa en nästan identisk ny.
export async function getSiteNewsCategories(supabase: SupabaseClient, siteId: string): Promise<string[]> {
  const { data } = await supabase.from("site_news_articles").select("category").eq("site_id", siteId);
  const used = new Set<string>(NEWS_CATEGORIES);
  for (const row of data || []) {
    if (row.category) used.add(row.category);
  }
  return Array.from(used);
}

// Gör en titel url-vänlig ("Vår nya lokal!" -> "var-nya-lokal") — samma
// princip som sidornas egna "path"-fält, men med å/ä/ö normaliserade så
// länken blir ren.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "artikel";
}

// Hittar en slug som inte redan finns för den här sajten — lägger på
// "-2", "-3" osv. om den önskade redan är tagen (t.ex. två artiklar med
// samma titel).
export async function uniqueSlugForSite(
  supabase: SupabaseClient,
  siteId: string,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  while (true) {
    let query = supabase
      .from("site_news_articles")
      .select("id")
      .eq("site_id", siteId)
      .eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// Appen har ingen bakgrundsjobb/cron som kan "trigga" en schemalagd
// artikel exakt på klockslaget — istället görs det latent, här: varje gång
// någon hämtar sajtens artiklar (ägaren i panelen, förhandsvisningen,
// eller den riktiga sajtens rendering) flyttas förfallna schemaläggningar
// över till "published" i databasen, så statusen i panelen (och
// published_at, som styr visat datum) blir rätt permanent — inte bara
// tillfälligt rätt via isArticleLive() ovan för just den här visningen.
async function syncScheduledArticles(supabase: SupabaseClient, siteId: string) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("site_news_articles")
    .update({ published: true, published_at: nowIso })
    .eq("site_id", siteId)
    .eq("published", false)
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", nowIso);
}

// Hämtar ALLA artiklar (utkast + publicerade) för sajten, nyast först —
// ägaren ser både i panelen och i sin egen förhandsvisning (SitePreview
// filtrerar sedan till bara de "live" — se isArticleLive — där det är den
// riktiga, publika renderingen, se newsList-rendringen).
export async function getSiteNewsArticles(
  supabase: SupabaseClient,
  siteId: string
): Promise<NewsArticle[]> {
  await syncScheduledArticles(supabase, siteId);
  const { data } = await supabase
    .from("site_news_articles")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  return (data as NewsArticle[]) || [];
}
