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

export interface SiteTheme {
  accentColor: string;
  secondaryColors: string[];
  font: ThemeFont;
  // Vilken av de tre stilvarianterna (lib/themeVariants.ts) kunden valt på
  // /forslag. "light" tills kunden har valt — satt av AI:n som startgissning.
  backgroundMode: BackgroundMode;
}

export type HeroLayout = "centered" | "split-left" | "split-right" | "overlay-bottom";
export type GridLayout = "cards" | "alternating-rows" | "list" | "numbered";
export type TestimonialsLayout = "single-quote" | "carousel-row" | "side-by-side";
export type CtaLayout = "centered" | "split";
export type ContactLayout = "centered" | "split-info";

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
  // Satt i kod (aldrig av AI:n) utifrån kundens egna uppladdade foton,
  // om några finns — se lib/assignUploadedImages.ts.
  imageUrl?: string;
}

export interface AboutSection {
  id: string;
  type: "about";
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
}

export interface CtaSection {
  id: string;
  type: "cta";
  layout: CtaLayout;
  heading: string;
  body: string;
  ctaLabel: string;
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

export type Section =
  | HeroSection
  | AboutSection
  | GridSection
  | TestimonialsSection
  | CtaSection
  | ContactSection;

export interface SitePageContent {
  path: string;
  label: string;
  sections: Section[];
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
      } else if (section.type === "grid") {
        for (const item of section.items) {
          total += 1;
          if (item.imageUrl) used += 1;
        }
      }
    }
  }
  return { used, total };
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

  const validSectionTypes = ["hero", "about", "grid", "testimonials", "cta", "contact"];

  return v.pages.every((page: any) => {
    if (typeof page.path !== "string" || typeof page.label !== "string") return false;
    if (!Array.isArray(page.sections)) return false;
    return page.sections.every(
      (s: any) => s && typeof s.id === "string" && validSectionTypes.includes(s.type)
    );
  });
}
