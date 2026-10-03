// Hämtar en kort textsammanfattning av kundens referenssajter (onboarding
// steg 2), så AI:n faktiskt kan känna av ton/struktur istället för att bara
// se en URL som text. Vi skickar ALDRIG den rå texten vidare som
// citerbart material — bara en kraftigt trunkerad, HTML-rensad bit, och
// prompten är tydlig om att bara stämning/struktur får inspirera, aldrig
// ord-för-ord-kopiering.
//
// Utöver texten läser vi av enkla STRUKTURELLA signaler direkt ur HTML:en
// (har sajten en stor bild/hero högst upp eller inte?) — kundens egna
// referenslänkar ska väga tungt i layoutvalet, inte bara tonen i texten.
// Det här är medvetet enkla, statiska heuristiker (ingen rendering/screenshot
// av sajten — det är inte praktiskt genomförbart i en Vercel-funktion) och
// kan missa fall där bilden sätts via t.ex. en JS-driven bildkarusell, men
// fångar den vanligaste varianten: en og:image/bild tidigt i sidan.
//
// OBS: detta når externa sajter via fetch() och är därför beroende av att
// miljön den körs i (Vercel) har utgående nätverksåtkomst dit. Går en
// hämtning inte (blockerad, nedsajt, timeout) hoppar vi helt enkelt över
// den länken istället för att fela hela genereringen.

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Grov men billig heuristik: har sajten troligen en framträdande bild/hero
// högst upp? Letar efter en og:image-tagg (de flesta sajter med en stor
// hero-bild sätter den som delningsbild), en bild tidigt i <body>, eller ett
// hero/banner-aktigt klassnamn — vilket som helst av dem räcker.
function detectHeroImage(html: string): boolean {
  const hasOgImage = /<meta[^>]+property=["']og:image["'][^>]+content=["'][^"']+["']/i.test(html);
  const bodyMatch = html.match(/<body[\s\S]*/i);
  const bodyHtml = (bodyMatch ? bodyMatch[0] : html).slice(0, 4000);
  const hasEarlyImg = /<img\b/i.test(bodyHtml) || /background-image\s*:/i.test(bodyHtml);
  const hasHeroClass = /(class|id)\s*=\s*["'][^"']*(hero|banner|jumbotron|masthead)[^"']*["']/i.test(html);
  return hasOgImage || hasEarlyImg || hasHeroClass;
}

async function fetchOne(url: string): Promise<{ text: string; hasHeroImage: boolean } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "YourCoSiteBot/1.0 (+https://yourcosite.com)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return { text: stripHtml(html).slice(0, 1500), hasHeroImage: detectHeroImage(html) };
  } catch {
    return null;
  }
}

export interface InspirationSummary {
  // Textbiten att klistra in i prompten (tomt om inga länkar gick att läsa).
  promptText: string;
  // "yes"/"no" när referenssajterna tydligt pekar åt ett håll (majoritet av
  // de som gick att hämta hade/saknade en framträdande hero-bild), annars
  // "unknown" (inga länkar, inga som gick att hämta, eller delat utfall) —
  // då får anroparen falla tillbaka på egen variation istället för att
  // hitta på ett falskt "kundval".
  heroImageSignal: "yes" | "no" | "unknown";
}

// Max samma 5 MB som InspirationImageUpload redan begränsar uppladdningen
// till (dubbelkollat här också eftersom gränsen annars bara gäller vid
// uppladdningstillfället, inte vid själva genereringen).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface FetchedInspirationImage {
  mediaType: string;
  base64: string;
}

// Hämtar kundens uppladdade inspirationsbilder (onboarding steg 2) och
// base64-kodar dem så de kan skickas som riktig bilddata till Claude — en
// betydligt starkare signal om layout/stämning än att bara läsa textutdrag
// ur en länk (se detectHeroImage ovan, som är en ren HTML-gissning).
// Hoppar tyst över en bild som inte går att hämta eller är för stor,
// istället för att fela hela genereringen.
export async function fetchInspirationImages(urls: string[]): Promise<FetchedInspirationImage[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
        if (!SUPPORTED_IMAGE_TYPES.includes(contentType)) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_IMAGE_BYTES) return null;
        return { mediaType: contentType, base64: buf.toString("base64") };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is FetchedInspirationImage => r !== null);
}

export async function summarizeInspirationLinks(links: string[]): Promise<InspirationSummary> {
  const valid = links.filter((l) => {
    try {
      new URL(l);
      return true;
    } catch {
      return false;
    }
  });
  if (valid.length === 0) return { promptText: "", heroImageSignal: "unknown" };

  const results = await Promise.all(valid.map((url) => fetchOne(url)));
  const fetched = results.filter((r): r is { text: string; hasHeroImage: boolean } => r !== null);

  const parts = results
    .map((r, i) => (r ? `Referenssajt ${i + 1} (${valid[i]}), rått textutdrag: "${r.text}"` : null))
    .filter(Boolean);

  const promptText =
    parts.length === 0
      ? ""
      : `\nKunden har visat dessa sajter som inspiration för KÄNSLA, TON och STRUKTUR — kopiera ALDRIG text eller specifika formuleringar från dem, använd dem bara för att förstå vilken stämning kunden gillar:\n${parts.join("\n\n")}\n`;

  let heroImageSignal: InspirationSummary["heroImageSignal"] = "unknown";
  if (fetched.length > 0) {
    const yes = fetched.filter((r) => r.hasHeroImage).length;
    const no = fetched.length - yes;
    if (yes > no) heroImageSignal = "yes";
    else if (no > yes) heroImageSignal = "no";
  }

  return { promptText, heroImageSignal };
}
