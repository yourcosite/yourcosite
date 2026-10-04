import type { SiteContent, HeroSection, GallerySection, TestimonialsSection } from "./contentModel";

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

// Förstasidan ska kännas bildstark utöver sin egen hero — men INTE genom
// upprepade stora bild+text-rader. Tidigare tvingade den här funktionen
// alltid förstasidans första "grid"-sektion till layouten
// "alternating-rows" (stora, liggande bilder som växlar sida om sida med
// text), i tron att det var vad kunden menade med "stora bilder över hela
// sidan". Kundens skärmdumpar visade att det i praktiken blev 2–3 tunga,
// nästan identiska bild+text-block på rad — tungt och repetitivt, inte
// alls känslan i exemplen kunden pekade på (Restaurangen/Snickeriet,
// /exempel): "Snygg tonat längst upp, några ingångar, en bild som täcker
// hela bredden med någon text osv. Snyggt cleant." Den känslan är i
// praktiken EN kompakt "cards"-grid (små ingångar/kort) + EN dramatisk,
// fullbred bildsektion med ett citat ovanpå — inte flera stora rader.
// Grid-sektionens layout rörs alltså inte längre här (den slumpas redan,
// säkert, av randomizeSectionLayouts i app/api/sites/generate/route.ts).
// Istället är det en "testimonials"-sektion (om AI:n lagt till en på
// förstasidan) som tvingas till layouten "full-bleed" — EN riktig bild
// som täcker hela bredden bakom ett enda citat, precis mönstret ovan.
export function enforceHomepageImageRichness(content: SiteContent): SiteContent {
  const home = content.pages.find((p) => p.path === "/");
  if (!home) return content;

  const fullBleedTestimonials = home.sections.find(
    (s): s is TestimonialsSection => s.type === "testimonials"
  );
  if (fullBleedTestimonials) {
    fullBleedTestimonials.layout = "full-bleed";
  }

  // En "gallery" (små rutnätsbilder, katalogkänsla) direkt efter hero ger
  // fel förstaintryck — flyttas sist på sidan istället om den råkar hamna
  // som sidans ANDRA sektion. Ingen förlorad data, bara ombytt ordning.
  if ((home.sections[1] as GallerySection | undefined)?.type === "gallery") {
    const [gallery] = home.sections.splice(1, 1);
    home.sections.push(gallery);
  }

  return content;
}
