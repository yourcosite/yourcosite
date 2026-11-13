import type { SiteContent } from "@/lib/contentModel";

// Gemensamt för delningsbild (og:image) och favicon på kundens sajt.

export const SITE_ORIGIN = "https://www.yourcosite.com";

export function absoluteUrl(u: string | undefined | null): string | null {
  if (!u || typeof u !== "string") return null;
  if (u.startsWith("data:")) return null;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${SITE_ORIGIN}${u}`;
  return /^https:\/\//i.test(u) ? u : null;
}

// Delningsbild: kundens egen, annars startsidans toppbild, annars en
// genererad bild med sajtens namn (se /api/site-meta/og/[id]).
export function shareImageFor(site: { id: string; content: SiteContent }): string {
  const own = absoluteUrl(site.content.shareImageUrl);
  if (own) return own;
  const hero = site.content.pages[0]?.sections.find((s: any) => s.type === "hero" && s.imageUrl) as any;
  const heroUrl = absoluteUrl(hero?.imageUrl);
  if (heroUrl && /\.(jpe?g|png|webp)(\?|$)/i.test(heroUrl)) return heroUrl;
  return `${SITE_ORIGIN}/api/site-meta/og/${site.id}`;
}

// Favicon: kundens egen, annars en genererad med sajtens initialer.
export function faviconFor(site: { id: string; content: SiteContent }): string {
  return absoluteUrl(site.content.faviconUrl) ?? `${SITE_ORIGIN}/api/site-meta/icon/${site.id}`;
}

export function initialsOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "•";
  const first = words[0];
  if (first.length <= 3 && first === first.toUpperCase()) return first.slice(0, 3);
  return first[0].toUpperCase();
}

export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#111111";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#FFFFFF";
}
