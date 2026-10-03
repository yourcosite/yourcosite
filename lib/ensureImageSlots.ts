import type { SiteContent, HeroSection } from "./contentModel";

// Bara "hero"- och "grid"-sektioner har en bildplats (se contentModel.ts).
// Väljer AI:n en sida med bara t.ex. "about" + "contact" blir den sidan
// helt utan bild, oavsett hur många foton kunden laddat upp — det är det
// kunden upplevde som "undersidor som saknar bilder". Prompten ber AI:n
// att alltid inleda varje sida med en hero, men vi garanterar det även i
// kod: saknar en sida en bildbärande sektion byggs en enkel hero-sektion
// in överst, med rubrik/text återanvänd från sidans första sektion (eller
// bara sidans namn) så sidan inte tappar sitt eget innehåll.
export function ensureImageSlots(content: SiteContent): SiteContent {
  for (const page of content.pages) {
    const hasImageSlot = page.sections.some((s) => s.type === "hero" || s.type === "grid");
    if (hasImageSlot) continue;

    const first = page.sections[0] as any;
    const headline: string = first?.heading || first?.headline || page.label;
    const body: string = first?.body || "";

    const autoHero: HeroSection = {
      id: `${page.path || page.label}-auto-hero`,
      type: "hero",
      layout: "centered",
      headline,
      body,
    };

    page.sections = [autoHero, ...page.sections];
  }

  return content;
}
