// Innehållsmodellen för en sajt. AI:n (och senare kundens redigeringsverktyg)
// jobbar ALDRIG med rå HTML/kod — bara med denna strukturerade JSON. Det gör
// det säkert att låta AI:n göra ändringar (den kan bara sätta fält som finns
// i modellen) och gör det möjligt att rendera sajten med vår egen kod.
//
// Varje sektion har ett fast "type" som bestämmer vilka fält den har. Lägg
// till fler typer här när vi vill stödja fler byggstenar — både
// förstagångsgenereringen och den senare chattredigeraren använder samma
// modell.

export type ThemeFont = "serif" | "sans";
export type BackgroundMode = "light" | "warm" | "dark";

// Knapparnas form — en tredje stilaxel utöver font/bakgrund, se
// lib/themeVariants.ts. INTE AI-vald: precis som font/backgroundMode
// bestäms den av vilken av de sex färdiga stilvarianterna kunden väljer på
// /forslag (en konsekvent "personlighet" hör ihop med varje variant,
// snarare än att fritt kunna kombineras), så den sätts i kod i
// /api/sites/choose-look, aldrig av Claude.
export type ButtonStyle = "pill" | "square" | "underline";

// Headerns uppbyggnad — en FJÄRDE stilaxel, samma princip som ButtonStyle
// ovan: bunden till varje stilvariant (lib/themeVariants.ts), satt i kod i
// /api/sites/choose-look, aldrig valbar fritt och aldrig satt av Claude.
// "left" = logga vänster, meny höger (klassisk, som allt var innan det här
// fältet fanns). "centered-stacked" = loggan centrerad på en egen rad, menyn
// centrerad på raden under — varmare, mer personlig känsla. "split" = logga
// vänster, menyn centrerad i mitten — djärvare, mer redaktionell.
export type HeaderLayout = "left" | "centered-stacked" | "split";

export interface SiteTheme {
  accentColor: string;
  secondaryColors: string[];
  font: ThemeFont;
  // Vilken av de tre stilvarianterna (lib/themeVariants.ts) kunden valt på
  // /forslag. "light" tills kunden har valt — satt av AI:n som startgissning.
  backgroundMode: BackgroundMode;
  // Saknas den (sajter skapade innan det här fältet fanns) faller
  // SitePreview.tsx tillbaka på "pill" — se buttonShape där.
  buttonStyle?: ButtonStyle;
  // Saknas den (sajter skapade innan det här fältet fanns) faller
  // SitePreview.tsx tillbaka på "left" — se headerLayout där.
  headerLayout?: HeaderLayout;
  // FEMTE stilaxeln, samma princip: bunden till varje stilvariant
  // (lib/themeVariants.ts), satt i kod i /api/sites/choose-look. Gäller
  // BARA startsidans hero (se SitePreview.tsx) — undersidornas hero-layout
  // sätts fortfarande fritt av AI:n vid genereringen för variation.
  // Saknas den faller startsidans hero tillbaka på sitt eget AI-satta
  // layout-värde, precis som innan den här axeln fanns.
  heroLayout?: HeroLayout;
}

export type HeroLayout = "centered" | "split-left" | "split-right" | "overlay-bottom" | "fade-bottom" | "collage" | "quad" | "editorial";
export type AboutLayout = "text-left" | "centered";
export type GridLayout = "cards" | "alternating-rows" | "list" | "numbered" | "bento" | "icon-row";
export type TestimonialsLayout = "single-quote" | "carousel-row" | "side-by-side" | "full-bleed" | "carousel-arrows";
export type CtaLayout = "centered" | "split" | "image-bleed";
export type ContactLayout = "centered" | "split-info";
export type FaqLayout = "stacked" | "two-column";
export type MapLayout = "inline" | "full-bleed";

export interface HeroSection {
  id: string;
  type: "hero";
  // AI:n väljer en av fyra uppbyggnader utifrån ton/bransch/referenser —
  // se lib/themeVariants-oberoende layoutbibliotek i SitePreview.tsx.
  layout: HeroLayout;
  eyebrow?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  // Vart knappen ska leda — antingen en av sajtens egna sidor (exakt som
  // i SitePageContent.path, t.ex. "/kontakt") eller en fullständig extern
  // URL ("https://..."). Saknas den är knappen bara dekorativ text, precis
  // som innan det här fältet fanns.
  ctaLink?: string;
  // Satt i kod (aldrig av AI:n) utifrån kundens egna uppladdade foton,
  // om några finns — se lib/assignUploadedImages.ts.
  imageUrl?: string;
  // Bara använd av layout "collage" — en kort, KURSIV fortsättning på
  // rubriken, på egen rad (t.ex. rubrik "Turn Your Vision" + emphasis
  // "Into Something Real") — den redaktionella "blandad stil"-känslan
  // kundens referenssajter (Lumora/Atelier/Norden/Lume) alla hade.
  // Valfri — saknas den visas bara rubriken, som vanligt.
  headlineEmphasis?: string;
  // Bara använd av layout "collage" (index 1, "collageB"), "quad" (index
  // 0) och "editorial" (index 0) — EXTRA bild(er) utöver imageUrl, satt i
  // kod precis som imageUrl — se lib/assignUploadedImages.ts. "collage"
  // använder bara index 1 (ETT extra foto totalt, 2 totalt med
  // imageUrl) — kundens exakta referenskod visade två foton, inte tre.
  collageImageUrls?: string[];
  // Använd av layout "quad" (nyckeltalskortet i bildrutan) och "collage"
  // (det flytande "checklista"-kortet nere i högra hörnet, över bilden —
  // INTE under CTA-knappen längre, se kundens referenskod för "collage").
  // 2-3 korta nyckeltal (t.ex. "15+ år i branschen"). VIKTIGT: AI:n får
  // ALDRIG hitta på siffror om kunder/omdömen/länder — bara sådant kunden
  // faktiskt skrivit i sin brief (grundat år, antal orter, certifiering
  // etc). Saknas tydliga sådana fakta ska fältet utelämnas helt, se
  // schema-beskrivningen i lib/siteContentSchema.ts.
  stats?: { value: string; label: string }[];
}

export interface AboutSection {
  id: string;
  type: "about";
  // Saknas den (äldre sajter, från innan det här fältet fanns) renderas
  // sektionen som "text-left" — se SitePreview.tsx.
  layout?: AboutLayout;
  heading: string;
  body: string;
}

export interface GridItem {
  title: string;
  body: string;
  // Samma princip som HeroSection.imageUrl — tilldelas i kod, inte av AI:n.
  imageUrl?: string;
}

export interface GridSection {
  id: string;
  type: "grid";
  layout: GridLayout;
  heading: string;
  items: GridItem[];
}

export interface TestimonialItem {
  quote: string;
  author: string;
}

export interface TestimonialsSection {
  id: string;
  type: "testimonials";
  layout: TestimonialsLayout;
  heading: string;
  items: TestimonialItem[];
  // Bara använd av layout "full-bleed" — en bild som täcker hela
  // sektionens bredd bakom citatet (se Restaurangen/Snickeriet i
  // /exempel). Satt i kod (aldrig av AI:n), precis som
  // HeroSection.imageUrl — se lib/assignUploadedImages.ts.
  imageUrl?: string;
}

export interface CtaSection {
  id: string;
  type: "cta";
  layout: CtaLayout;
  heading: string;
  body: string;
  ctaLabel: string;
  // Se HeroSection.ctaLink ovan — samma princip.
  ctaLink?: string;
  // Bara använd av layout "image-bleed" — en riktig bild som täcker hela
  // sektionens bredd bakom en mörk gradient, med rubrik/text VÄNSTERSTÄLLD
  // ovanpå (till skillnad från testimonials "full-bleed", som är ett
  // centrerat citat). Satt i kod (aldrig av AI:n), som
  // TestimonialsSection.imageUrl — se lib/assignUploadedImages.ts.
  imageUrl?: string;
}

export interface ContactSection {
  id: string;
  type: "contact";
  layout: ContactLayout;
  heading: string;
  body: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type GalleryLayout = "grid" | "carousel";

export interface GalleryItem {
  // Samma princip som GridItem.imageUrl — tilldelas i kod (eller av Millie
  // när kunden bifogar en egen bild), aldrig en påhittad url.
  imageUrl?: string;
  caption?: string;
}

// Bildspel/galleri — flera bilder i rad, med valfri bildtext under varje.
// "grid" lägger dem i ett rutnät, "carousel" i en horisontellt skrollbar
// rad (särskilt naturlig att svepa i på mobil).
export interface GallerySection {
  id: string;
  type: "gallery";
  layout: GalleryLayout;
  heading: string;
  items: GalleryItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

// Vanliga frågor — varje rad går att fälla ut/ihop för sig (se
// FaqAccordion i components/SitePreview.tsx).
export interface FaqSection {
  id: string;
  type: "faq";
  // Saknas den (äldre sajter) renderas sektionen som "stacked" — se
  // SitePreview.tsx.
  layout?: FaqLayout;
  heading: string;
  items: FaqItem[];
}

// Inbäddad Google Maps-karta utifrån en adress — ingen API-nyckel behövs
// för den enkla inbäddningen (se MapSection-renderingen i
// components/SitePreview.tsx).
export interface MapSection {
  id: string;
  type: "map";
  // Saknas den (äldre sajter) renderas sektionen som "inline" — se
  // SitePreview.tsx.
  layout?: MapLayout;
  heading?: string;
  address: string;
}

export type ContactFormLayout = "centered" | "split-map";

// Ett RIKTIGT, ifyllbart kontaktformulär (namn/e-post/meddelande) — till
// skillnad från ContactSection ovan, som bara VISAR kontaktuppgifter.
// Inskicken sparas i databasen (tabellen site_form_submissions, se
// supabase/schema.sql) via den publika rutten /api/public/form-submit och
// syns för kunden på /statistik.
export interface ContactFormSection {
  id: string;
  type: "contactForm";
  // "split-map" lägger en inbäddad karta BREDVID formuläret (kräver
  // "address") — enda sättet att få ett kontaktformulär och en karta att
  // stå sida vid sida, eftersom sektioner annars alltid läggs under
  // varandra, aldrig bredvid, oavsett vilka typer de är.
  layout?: ContactFormLayout;
  heading: string;
  body?: string;
  // Text på skicka-knappen — "Skicka" om utelämnat.
  submitLabel?: string;
  // Bara använd när layout är "split-map" — adressen som visas i kartan
  // bredvid formuläret. Samma princip som MapSection.address: EXAKT den
  // kunden gett, aldrig påhittad.
  address?: string;
}

// Visar kundens publicerade nyhetsartiklar (titel, bild, ingress) som ett
// klickbart rutnät — varje kort länkar till en egen läsvy med hela artikeln
// och den bifogade bilden (se NewsArticleDetail i components/SitePreview.tsx
// och NewsArticle i lib/newsArticles.ts). Artiklarna själva skrivs och
// publiceras av kunden på /nyheter i panelen (app/nyheter/page.tsx) — INTE
// av Millie i chatten — den här sektionen bara BESTÄMMER VAR på sajten de
// visas. En sida kan ha som mest en sådan sektion.
export interface NewsListSection {
  id: string;
  type: "newsList";
  heading: string;
}

export type Section =
  | HeroSection
  | AboutSection
  | GridSection
  | TestimonialsSection
  | CtaSection
  | ContactSection
  | GallerySection
  | FaqSection
  | MapSection
  | ContactFormSection
  | NewsListSection;

export interface SitePageContent {
  path: string;
  label: string;
  sections: Section[];
  // Valfri överskrivning av sajtens färgtema (theme.backgroundMode) för just
  // DEN HÄR sidan — t.ex. en enskild sida med mörk bakgrund medan resten av
  // sajten är ljus. Saknas den används sajtens vanliga läge (se
  // SitePreview.tsx). Återanvänder samma tre färdiga lägen som
  // stilvalet i onboardingen (lib/themeVariants.ts) istället för en fri
  // hex-färg, så att text/kontrast/kort osv. alltid blir rätt automatiskt —
  // ingen risk att kunden (eller AI:n) råkar be om en bakgrund texten
  // försvinner mot.
  backgroundMode?: BackgroundMode;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SiteContent {
  theme: SiteTheme;
  pages: SitePageContent[];
  // Satt när kunden laddat upp en egen logga i onboardingen. Saknas den
  // visar vi bara företagsnamnet i headern istället — aldrig en AI-skapad
  // logga, det gör vi medvetet inte.
  logoUrl?: string;
  // Kundens sociala medier-länkar från onboarding steg 2 — satta i kod,
  // aldrig valda eller hittade på av AI:n. Visas i sidfoten och på
  // kontaktsidan.
  socialLinks?: SocialLink[];
  // Google Analytics (GA4 "G-XXXXXXXXXX", eller äldre "UA-XXXXXXX-X") och
  // Meta Pixel-ID — satta av kunden själv (i chattredigerarens
  // sajtinställningar, eller genom att be Millie om det) och injicerade i
  // sajten, se TrackingScripts i components/SitePreview.tsx. Laddas ENDAST
  // när besökaren godkänt "Alla cookies" i cookiebannern — se
  // CookieBanner/showCookieBanner i samma fil.
  gaMeasurementId?: string;
  metaPixelId?: string;
}

// Räknar hur många av sajtens bildbärande platser (hero + grid-items) som
// faktiskt fick ett foto av assignUploadedImages, mot hur många platser
// som finns totalt. Används för att visa kunden en tydlig signal om inga
// av hens uppladdade foton kom med i designen — annars är det omöjligt
// att se skillnad på "inga foton uppladdade" och "foton uppladdade men
// inte kopplade", vilket orsakat flera svårfelsökta buggrapporter.
export function countImageSlots(content: SiteContent): { used: number; total: number } {
  let used = 0;
  let total = 0;
  for (const page of content.pages) {
    for (const section of page.sections) {
      if (section.type === "hero") {
        total += 1;
        if (section.imageUrl) used += 1;
      } else if (section.type === "grid" || section.type === "gallery") {
        for (const item of section.items) {
          total += 1;
          if (item.imageUrl) used += 1;
        }
      }
    }
  }
  return { used, total };
}

const VALID_SECTION_TYPES = [
  "hero",
  "about",
  "grid",
  "testimonials",
  "cta",
  "contact",
  "gallery",
  "faq",
  "map",
  "contactForm",
  "newsList",
];

// Samma sidkoll som isValidSiteContent gör per sida, brytes ut för sig så
// chattredigerarens patch-svar (se /api/sites/edit — den skickar bara
// TILLBAKA de sidor som faktiskt ändrades, inte hela sajten, för snabbhetens
// skull) kan valideras sida för sida innan de klistras in i den befintliga
// sajten.
const VALID_BACKGROUND_MODES = ["light", "warm", "dark"];

export function isValidSitePage(value: unknown): value is SitePageContent {
  if (!value || typeof value !== "object") return false;
  const page = value as any;
  if (typeof page.path !== "string" || typeof page.label !== "string") return false;
  if (!Array.isArray(page.sections)) return false;
  if (page.backgroundMode !== undefined && !VALID_BACKGROUND_MODES.includes(page.backgroundMode)) return false;
  return page.sections.every(
    (s: any) => s && typeof s.id === "string" && VALID_SECTION_TYPES.includes(s.type)
  );
}

// Snäv typ-koll av vad Claude skickar tillbaka, så vi aldrig sparar skräp i
// databasen. Inte en fullständig validator, men fångar de vanligaste felen
// (fel typ, saknade obligatoriska fält).
export function isValidSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  if (!v.theme || typeof v.theme.accentColor !== "string") return false;
  if (!Array.isArray(v.theme.secondaryColors)) return false;
  if (!Array.isArray(v.pages) || v.pages.length === 0) return false;

  return v.pages.every(isValidSitePage);
}

// Gör ett sidnamn till en ren url-sökväg ("Våra tjänster" -> "/vara-tjanster")
// — samma princip som artiklarnas slugify() i lib/newsArticles.ts, men för
// hela sidor. Används när kunden skapar en ny sida via "Sidor" i
// redigeraren (app/sidor/page.tsx) och namnger den direkt, istället för att
// AI:n (eller koden) hittar på ett sökvägsnamn kunden aldrig sett.
export function slugifyPagePath(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `/${slug || "sida"}`;
}

// Hittar en sökväg som inte redan finns bland sajtens sidor — lägger på
// "-2", "-3" osv. vid en krock (t.ex. två sidor som båda heter "Kontakt").
export function uniquePagePath(pages: SitePageContent[], label: string, excludePath?: string): string {
  const base = slugifyPagePath(label);
  const taken = new Set(pages.filter((p) => p.path !== excludePath).map((p) => p.path));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
