import type { SupabaseClient } from "@supabase/supabase-js";

// Delad typ för en nyhetsartikel (tabellen site_news_articles, se
// supabase/schema.sql) — använd av både panelens /nyheter-sida
// (skapa/redigera/publicera) och den publika renderingen av "newsList"-
// sektionen + artikelns egen läsvy i components/SitePreview.tsx.
// Fasta kategorier att välja mellan — både i panelen (app/nyheter) och när
// Millie skapar en artikel åt kunden i chattredigeraren. Inte en databas-
// begränsning (kolumnen är bara text) så vi kan utöka listan senare utan
// migrering, men appen erbjuder bara dessa tre.
export const NEWS_CATEGORIES = ["Nyheter", "Erbjudanden", "Evenemang"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export const DEFAULT_NEWS_CATEGORY: NewsCategory = "Nyheter";

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
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
  published_at: string | null;
  created_at: string;
  updated_at: string;
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

// Hämtar ALLA artiklar (utkast + publicerade) för sajten, nyast först —
// ägaren ser både i panelen och i sin egen förhandsvisning (SitePreview
// filtrerar sedan till bara de publicerade där det är den riktiga,
// publika renderingen, se newsList-rendringen).
export async function getSiteNewsArticles(
  supabase: SupabaseClient,
  siteId: string
): Promise<NewsArticle[]> {
  const { data } = await supabase
    .from("site_news_articles")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  return (data as NewsArticle[]) || [];
}
