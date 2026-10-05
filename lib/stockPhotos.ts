import type { PhotoCredit, SiteContent } from "./contentModel";

// Unsplash-bilder får (och ska) länkas direkt från Unsplashs egen server —
// deras API-regler kräver det, så vi kopierar dem aldrig till vår lagring.
// Därför får bara just den här värden släppas igenom som "stockbild".
export const UNSPLASH_IMAGE_HOST = "https://images.unsplash.com/";
export const UNSPLASH_PROFILE_PREFIX = "https://unsplash.com/";
export const UNSPLASH_DOWNLOAD_PREFIX = "https://api.unsplash.com/photos/";

export function isUnsplashImageUrl(url: string): boolean {
  return url.startsWith(UNSPLASH_IMAGE_HOST);
}

// Fotots "nyckel" = sökvägen utan query-parametrar (t.ex.
// "/photo-1234-abcd"), så samma foto känns igen oavsett storlek/beskärning
// i URL:en.
export function unsplashKey(url: string): string | null {
  if (!isUnsplashImageUrl(url)) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

// Fotografer som faktiskt används någonstans i sajten just nu — ett foto
// som kunden bytt bort ska inte längre stå i sidfoten.
export function creditsInUse(content: SiteContent): PhotoCredit[] {
  const credits = content.photoCredits;
  if (!credits) return [];
  const body = JSON.stringify(content.pages);
  const seen = new Set<string>();
  const result: PhotoCredit[] = [];
  for (const [key, credit] of Object.entries(credits)) {
    if (!body.includes(key) || seen.has(credit.profileUrl)) continue;
    seen.add(credit.profileUrl);
    result.push(credit);
  }
  return result;
}
