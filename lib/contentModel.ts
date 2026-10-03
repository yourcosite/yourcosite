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

export interface HeroSection {
  id: string;
  type: "hero";
  eyebrow?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
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
}

export interface GridSection {
  id: string;
  type: "grid";
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
  heading: string;
  items: TestimonialItem[];
}

export interface CtaSection {
  id: string;
  type: "cta";
  heading: string;
  body: string;
  ctaLabel: string;
}

export interface ContactSection {
  id: string;
  type: "contact";
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

export interface SiteContent {
  theme: SiteTheme;
  pages: SitePageContent[];
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
