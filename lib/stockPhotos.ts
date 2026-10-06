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

// Fotografen kan också följa med SJÄLVA bildadressen, som ett "fragment"
// (#ycs=...) sist i URL:en. Ett fragment skickas aldrig till Unsplash och
// påverkar inte bilden, men följer med överallt där adressen sparas —
// onboardingens bilder, nyhetsartiklar och hero-bilden — utan att vi
// behöver ändra databasen.
export function withCredit(url: string, credit: PhotoCredit): string {
  const base = url.split("#")[0];
  return `${base}#ycs=${encodeURIComponent(JSON.stringify({ n: credit.name, p: credit.profileUrl }))}`;
}

export function creditFromUrl(url: string | null | undefined): PhotoCredit | null {
  if (!url || !isUnsplashImageUrl(url)) return null;
  const idx = url.indexOf("#ycs=");
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(url.slice(idx + 5)));
    if (typeof parsed.n === "string" && typeof parsed.p === "string" && parsed.p.startsWith(UNSPLASH_PROFILE_PREFIX)) {
      return { name: parsed.n.slice(0, 80), profileUrl: parsed.p.slice(0, 300) };
    }
  } catch {
    // trasigt fragment — ingen kredit
  }
  return null;
}

// Godkänd bild-URL för en kund: antingen i kundens egen uppladdningsmapp
// eller en Unsplash-bild (hotlinkad). Används av alla API-rutter som tar
// emot en bildadress från webbläsaren.
export function isAllowedImageUrl(url: string, userId: string): boolean {
  return url.includes(`/uploads/${userId}/`) || isUnsplashImageUrl(url);
}

// Fotografer som faktiskt används någonstans i sajten just nu — ett foto
// som kunden bytt bort ska inte längre stå i sidfoten.
export function creditsInUse(content: SiteContent): PhotoCredit[] {
  const body = JSON.stringify(content.pages);
  const seen = new Set<string>();
  const result: PhotoCredit[] = [];
  const add = (credit: PhotoCredit) => {
    if (seen.has(credit.profileUrl)) return;
    seen.add(credit.profileUrl);
    result.push(credit);
  };
  for (const [key, credit] of Object.entries(content.photoCredits || {})) {
    if (body.includes(key)) add(credit);
  }
  // Bilder där fotografen följer med själva adressen (onboarding).
  const matches = body.match(/https:\/\/images\.unsplash\.com\/[^"\\\s]*#ycs=[^"\\\s]+/g) || [];
  for (const m of matches) {
    const c = creditFromUrl(m);
    if (c) add(c);
  }
  return result;
}
