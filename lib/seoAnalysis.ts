// Sökmotoranalys av en kunds sajt ("Förbättra"-panelen, app/forbattra).
//
// Ren kod utan AI-anrop: reglerna körs direkt mot sajtens innehåll, så
// analysen är gratis, går på millisekunder och kan köras om hur ofta som
// helst. Resultatet är god praxis för sökmotorer, ingen garanti för
// placering — det säger panelen också.
//
// Fyra sorters punkter:
//   rule  = kontrolleras mot innehållet, och kunden (eller Millie) kan fixa den
//   auto  = YourCoSite ordnar det åt kunden, räknas alltid som klart. OBS:
//           teknikpunkterna (laddning, sitemap, HTTPS, bildstorlek) måste
//           faktiskt levereras när publiceringen byggs — se AUTO_NOTE nedan.
//   na    = gäller inte än (t.ex. språkkoppling när sajten bara har ett språk),
//           räknas inte med varken för eller emot
// Betyget = intjänade poäng delat med alla poäng som räknas (rule + auto).

import { msg } from "@/lib/i18n/config";
import type { SiteContent, SitePageContent } from "@/lib/contentModel";

export type SeoGroupId = "basics" | "content" | "local" | "tech" | "measure";
export type SeoKind = "rule" | "auto" | "na";

export type SeoItem = {
  id: string;
  group: SeoGroupId;
  kind: SeoKind;
  title: string;
  pts: number;
  done: boolean;
  // Förklaring när punkten inte är klar (svenska nycklar, översätts med t()).
  why?: string;
  // Siffra som sätts in i "why" där {n} står.
  n?: number;
  // Vad "Fixa med Millie" skriver i meddelanderutan. Saknas = ingen knapp.
  ask?: string;
  // Annan väg att fixa den, t.ex. kontaktsektionen.
  tone: "red" | "amber";
};

export type SeoGroup = { id: SeoGroupId; title: string; earned: number; total: number; items: SeoItem[] };

export type SeoResult = { score: number; earned: number; total: number; todo: number; auto: number; groups: SeoGroup[] };

export type SeoNewsInput = { published: boolean; published_at: string | null }[];

// Teknikpunkterna nedan är sådant YourCoSite ska ordna när sajterna publiceras
// på riktigt (snabb laddning, sitemap och robots, HTTPS, krympta bilder).
// Ändra till kind "rule" med en riktig kontroll om något av dem inte
// levereras, så att betyget inte lovar mer än sajten håller.
const GROUP_TITLES: Record<SeoGroupId, string> = {
  basics: msg("Grundläggande"),
  content: msg("Innehåll"),
  local: msg("Lokal synlighet"),
  tech: msg("Teknik"),
  measure: msg("Mätning och delning"),
};
const GROUP_ORDER: SeoGroupId[] = ["basics", "content", "local", "tech", "measure"];

const SKIP_KEYS = new Set([
  "id", "type", "layout", "imageUrl", "image", "ctaLink", "bgColor", "ctaColor", "ctaStyle", "ctaNewTab",
  "spacing", "textAlign", "fadeTop", "fadeBottom", "url", "code", "icon", "email", "phone", "path",
  "platform", "videoUrl", "embedUrl", "iconName", "color", "style", "variant",
]);

function walkStrings(node: unknown, out: string[], key = "") {
  if (typeof node === "string") {
    if (SKIP_KEYS.has(key)) return;
    const s = node.trim();
    if (!s || /^(https?:)?\/\//.test(s) || s.startsWith("/") || s.startsWith("#")) return;
    out.push(s);
  } else if (Array.isArray(node)) {
    node.forEach((x) => walkStrings(x, out, key));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walkStrings(v, out, k);
  }
}

function wordCount(page: SitePageContent): number {
  const strs: string[] = [];
  walkStrings(page.sections, strs);
  return strs.join(" ").split(/\s+/).filter(Boolean).length;
}

function imageUrls(content: SiteContent): string[] {
  const urls = new Set<string>();
  const walk = (node: unknown, key = "") => {
    if (typeof node === "string") {
      if ((key === "imageUrl" || key === "image") && node.trim()) urls.add(node.trim());
    } else if (Array.isArray(node)) node.forEach((x) => walk(x, key));
    else if (node && typeof node === "object") for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, k);
  };
  walk(content.pages);
  return [...urls];
}

type ContactLike = { type: string; email?: string; phone?: string; address?: string; hours?: string };

function contactSections(content: SiteContent): ContactLike[] {
  const out: ContactLike[] = [];
  for (const p of content.pages) for (const s of p.sections as unknown as ContactLike[]) if (s.type === "contact") out.push(s);
  return out;
}

// "591 74 Borensberg" -> "Borensberg"
function cityFromAddress(address: string): string | null {
  const m = address.match(/\b\d{3}\s?\d{2}\s+([A-ZÅÄÖ][\p{L}-]+)/u);
  return m ? m[1] : null;
}

function hasEmptySection(content: SiteContent): boolean {
  for (const p of content.pages) {
    for (const raw of p.sections as unknown as Record<string, unknown>[]) {
      const text = JSON.stringify(raw).toLowerCase();
      if (text.includes("lorem ipsum")) return true;
      if (["hero", "about", "cta", "contact"].includes(String(raw.type))) {
        const head = String(raw.headline ?? raw.heading ?? "").trim();
        const body = String(raw.body ?? "").trim();
        if (!head && !body) return true;
      }
    }
  }
  return false;
}

export function analyzeSeo(content: SiteContent, news: SeoNewsInput = [], now: Date = new Date()): SeoResult {
  const home = content.pages.find((p) => p.path === "/") ?? content.pages[0];
  const items: SeoItem[] = [];
  const add = (it: Omit<SeoItem, "tone" | "done"> & { tone?: "red" | "amber"; done?: boolean }) =>
    items.push({ tone: "amber", done: it.kind === "auto", ...it });

  // Grundläggande (30)
  const title = (home?.seoTitle ?? "").trim();
  add({ id: "title", group: "basics", kind: "rule", title: msg("Sidtitel för Google"), pts: 8, tone: "red",
    done: title.length >= 20 && title.length <= 65,
    why: title ? msg("Titeln bör vara mellan 20 och 65 tecken. Din är {n}.") : msg("Titeln visas som rubrik i sökresultatet. Din sajt saknar en."),
    n: title.length, ask: msg("Sätt en sidtitel för Google på startsidan") });
  const desc = (home?.seoDescription ?? "").trim();
  add({ id: "description", group: "basics", kind: "rule", title: msg("Beskrivning under titeln"), pts: 8, tone: "red",
    done: desc.length >= 70 && desc.length <= 160,
    why: desc ? msg("Beskrivningen bör vara mellan 70 och 160 tecken. Din är {n}.") : msg("Två rader under titeln. En bra text får fler att klicka."),
    n: desc.length, ask: msg("Skriv en beskrivning för Google på startsidan") });
  add({ id: "h1", group: "basics", kind: "auto", title: msg("En tydlig huvudrubrik per sida"), pts: 6 });
  const titles = content.pages.map((p) => (p.seoTitle ?? "").trim());
  const allPageMeta = content.pages.every((p) => (p.seoTitle ?? "").trim() && (p.seoDescription ?? "").trim()) &&
    new Set(titles.map((x) => x.toLowerCase())).size === titles.length;
  add({ id: "pageMeta", group: "basics", kind: "rule", title: msg("Egen titel och beskrivning per sida"), pts: 4,
    done: allPageMeta, why: msg("Varje sida bör ha en egen titel och beskrivning, inte samma som de andra."),
    ask: msg("Sätt titel och beskrivning på alla sidor") });
  add({ id: "urls", group: "basics", kind: "auto", title: msg("Beskrivande sidadresser"), pts: 4 });

  // Innehåll (25)
  const words = home ? wordCount(home) : 0;
  add({ id: "text", group: "content", kind: "rule", title: msg("Tillräckligt med text på startsidan"), pts: 6,
    done: words >= 150, n: words, why: msg("Startsidan har cirka {n} ord. Google gillar minst 150."),
    ask: msg("Skriv mer text på startsidan") });
  add({ id: "headings", group: "content", kind: "auto", title: msg("Rubriker i logisk ordning"), pts: 4 });
  const imgs = imageUrls(content);
  const alts = content.imageAlts ?? {};
  const missingAlt = imgs.filter((u) => !alts[u]).length;
  add({ id: "alt", group: "content", kind: "rule", title: msg("Bilder har beskrivande text (alt)"), pts: 6, tone: "red",
    done: missingAlt === 0, n: missingAlt, why: msg("{n} bilder saknar beskrivning. Den hjälper Google och läsare som inte ser bilden."),
    ask: msg("Skriv bildtexter för alla bilder") });
  const cutoff = now.getTime() - 90 * 86400000;
  const fresh = news.some((a) => a.published && a.published_at && new Date(a.published_at).getTime() >= cutoff);
  add({ id: "fresh", group: "content", kind: "rule", title: msg("Färskt innehåll"), pts: 4,
    done: fresh, why: msg("Sajter med nya inlägg rankar bättre. Du har inte publicerat något på 90 dagar."),
    ask: msg("Skriv en nyhet om något som hänt hos oss nyligen") });
  add({ id: "nav", group: "content", kind: "auto", title: msg("Alla sidor nås via menyn"), pts: 3 });
  add({ id: "empty", group: "content", kind: "rule", title: msg("Inga tomma sektioner"), pts: 2,
    done: !hasEmptySection(content), why: msg("Någon sektion är tom eller har platshållartext."),
    ask: msg("Fyll i eller ta bort tomma sektioner") });

  // Lokal synlighet (15)
  const contacts = contactSections(content);
  const withAddr = contacts.find((c) => c.address && (c.phone || c.email));
  add({ id: "nap", group: "local", kind: "rule", title: msg("Namn, adress och telefon finns"), pts: 6,
    done: !!withAddr, why: msg("Lägg in adress och telefon eller e-post i kontaktsektionen."),
    ask: msg("Lägg in vår adress och vårt telefonnummer i kontaktsektionen") });
  const addr = contacts.map((c) => c.address || "").find((a) => cityFromAddress(a));
  const city = addr ? cityFromAddress(addr) : null;
  const cityHaystack = [title, ...(home ? (() => { const s: string[] = []; walkStrings(home.sections, s); return s.slice(0, 6); })() : [])].join(" ").toLowerCase();
  add({ id: "city", group: "local", kind: "rule", title: msg("Orten nämns i titel eller rubrik"), pts: 4,
    done: !!city && cityHaystack.includes(city.toLowerCase()),
    why: city ? msg("Skriv orten i titeln så hittas du av dem som söker i närheten.") : msg("Lägg in en adress med postnummer och ort först."),
    ask: city ? msg("Sätt en sidtitel för Google på startsidan som nämner orten") : undefined });
  add({ id: "hours", group: "local", kind: "rule", title: msg("Öppettider"), pts: 3,
    done: contacts.some((c) => (c.hours || "").trim().length > 0),
    why: msg("Öppettider visas direkt i Google och på kartan."),
    ask: msg("Lägg in öppettider i kontaktsektionen:") });
  add({ id: "clickable", group: "local", kind: "auto", title: msg("Telefon och mejl går att klicka på"), pts: 2 });

  // Teknik (20), levereras av YourCoSite
  add({ id: "speed", group: "tech", kind: "auto", title: msg("Snabb laddning"), pts: 6 });
  add({ id: "mobile", group: "tech", kind: "auto", title: msg("Fungerar bra på mobil"), pts: 4 });
  add({ id: "indexing", group: "tech", kind: "auto", title: msg("Sitemap och robots, sajten får indexeras"), pts: 4 });
  add({ id: "https", group: "tech", kind: "auto", title: msg("HTTPS och rätt omdirigering"), pts: 3 });
  add({ id: "imgsize", group: "tech", kind: "auto", title: msg("Bilderna krymps automatiskt"), pts: 3 });

  // Mätning och delning (10)
  add({ id: "stats", group: "measure", kind: "auto", title: msg("Besöksstatistik"), pts: 4 });
  add({ id: "share", group: "measure", kind: "auto", title: msg("Delningsbild och delningstitel"), pts: 3 });
  // Språkkoppling (hreflang) gäller först när kundens sajt kan ha flera språk.
  add({ id: "hreflang", group: "measure", kind: "rule", title: msg("Språk kopplas rätt (hreflang)"), pts: 3, done: false });
  const hl = items[items.length - 1];
  hl.kind = "na";

  const counted = items.filter((i) => i.kind !== "na");
  const total = counted.reduce((n, i) => n + i.pts, 0);
  const earned = counted.filter((i) => i.done).reduce((n, i) => n + i.pts, 0);
  const groups: SeoGroup[] = GROUP_ORDER.map((id) => {
    const its = items.filter((i) => i.group === id);
    const c = its.filter((i) => i.kind !== "na");
    return {
      id,
      title: GROUP_TITLES[id],
      items: its,
      total: c.reduce((n, i) => n + i.pts, 0),
      earned: c.filter((i) => i.done).reduce((n, i) => n + i.pts, 0),
    };
  });
  return {
    score: total ? Math.round((earned / total) * 100) : 0,
    earned,
    total,
    todo: counted.filter((i) => !i.done).length,
    auto: items.filter((i) => i.kind === "auto").length,
    groups,
  };
}
