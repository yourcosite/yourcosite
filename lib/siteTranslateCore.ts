// Översättning av en kunds sajt till fler språk — delen som körs både i
// webbläsaren och på servern (inga anrop, bara ren logik).
//
// Idén: sajten på huvudspråket är alltid "sanningen". Varje extra språk är ett
// minne (memo) från originaltext till översatt text, sparat i sites.translations.
// Förhandsvisningen av ett språk bygger sajten på huvudspråket och byter ut
// varje text mot sin översättning. Ändrar kunden en text finns inte den nya
// texten i minnet, så språket blir "Behöver uppdateras" och bara de ändrade
// texterna översätts om (se /api/sites/languages).

import type { SiteContent } from "@/lib/contentModel";

// Bara fält med text som en besökare läser. Adresser, namn på personer, länkar,
// färger och liknande översätts aldrig.
const TEXT_KEYS = new Set([
  "headline", "headlineEmphasis", "eyebrow", "body", "heading", "intro", "ctaLabel", "linkLabel",
  "title", "name", "description", "caption", "quote", "question", "answer", "note", "submitLabel",
  "label", "hours", "seoTitle", "seoDescription", "value",
]);

export const MAX_EXTRA_LANGUAGES = 3;

export type LanguageMemo = { memo: Record<string, string>; translatedAt?: string };
export type SiteTranslations = Record<string, LanguageMemo>;

// Enkel, snabb 53-bitars hash (cyrb53). Samma resultat i webbläsare och server.
export function hashText(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

type Mapper = (text: string) => string;

function mapNode(node: unknown, key: string, inTeam: boolean, fn: Mapper): unknown {
  if (typeof node === "string") {
    if (!TEXT_KEYS.has(key)) return node;
    if (inTeam && key === "name") return node; // personers namn översätts inte
    return node.trim() ? fn(node) : node;
  }
  if (Array.isArray(node)) return node.map((x) => mapNode(x, key, inTeam, fn));
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const team = inTeam || o.type === "team";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = mapNode(v, k, team, fn);
    return out;
  }
  return node;
}

function mapContent(content: SiteContent, fn: Mapper): SiteContent {
  const out: SiteContent = { ...content, pages: mapNode(content.pages, "pages", false, fn) as SiteContent["pages"] };
  const cta = content.theme?.headerCta;
  if (cta?.label) out.theme = { ...content.theme, headerCta: { ...cta, label: fn(cta.label) } };
  if (content.imageAlts) {
    out.imageAlts = Object.fromEntries(Object.entries(content.imageAlts).map(([url, alt]) => [url, alt.trim() ? fn(alt) : alt]));
  }
  return out;
}

// Alla unika texter på sajten som ska översättas.
export function collectTexts(content: SiteContent): string[] {
  const seen = new Set<string>();
  mapContent(content, (s) => {
    seen.add(s);
    return s;
  });
  return [...seen];
}

// Texter som saknar översättning i minnet (nya eller ändrade).
export function missingTexts(content: SiteContent, memo: Record<string, string>): string[] {
  return collectTexts(content).filter((s) => memo[hashText(s)] === undefined);
}

// Sajten på det översatta språket. Text som saknar översättning visas på huvudspråket.
export function applyTranslations(content: SiteContent, memo: Record<string, string>): SiteContent {
  return mapContent(content, (s) => memo[hashText(s)] ?? s);
}

export type LanguageStatus = "done" | "stale";

export function languageStatus(content: SiteContent, entry: LanguageMemo | undefined): LanguageStatus {
  return entry && missingTexts(content, entry.memo).length === 0 ? "done" : "stale";
}
