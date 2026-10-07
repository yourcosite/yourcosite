import type { SiteContent, HeroSection, GallerySection, TestimonialsSection, CtaSection } from "./contentModel";

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

    // En kund rapporterade "två liggande bilder efter varandra" på
    // förstasidan — orsaken: "cta"-sektionens layout "image-bleed" är
    // OCKSÅ en egen fullbred bild (se SitePreview.tsx), och
    // randomizeSectionLayouts slumpar den fritt. Råkar den hamna direkt
    // före eller efter det här citat-blockets tvingade fullbredds-bild
    // blir det två tunga, liggande bilder på rad utan någon paus
    // emellan. Byt bara DEN sektionens layout till en variant utan egen
    // bild — rör ingenting annat på sidan.
    const idx = home.sections.indexOf(fullBleedTestimonials);
    for (const neighborIdx of [idx - 1, idx + 1]) {
      const neighbor = home.sections[neighborIdx] as CtaSection | undefined;
      if (neighbor?.type === "cta" && neighbor.layout === "image-bleed") {
        neighbor.layout = Math.random() < 0.5 ? "centered" : "split";
      }
    }
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

// Kontaktformuläret med layout "split-map" har redan en inbäddad karta
// bredvid sig. Lägger AI:n (eller kunden via Millie) ÄVEN en separat
// "map"-sektion på samma sida blir det två kartor. Samma sak om en sida
// råkar få två "map"-sektioner.
//   "drop-map"   (generering): den separata kartan tas bort — formulärets
//                 karta visar samma adress (tas över om formuläret saknar).
//   "flatten-form" (Millie): kunden bad nyss om en karta, så den behålls och
//                 formuläret får layouten "centered" i stället.
export function dedupeMaps(content: SiteContent, mode: "drop-map" | "flatten-form" = "drop-map"): SiteContent {
  for (const page of content.pages) {
    let seenMap = false;
    page.sections = page.sections.filter((s) => {
      if (s.type !== "map") return true;
      if (seenMap) return false; // två "map" på samma sida — behåll bara den första
      seenMap = true;
      return true;
    });
    const form = page.sections.find((s) => s.type === "contactForm" && (s as any).layout === "split-map") as any;
    const mapIdx = page.sections.findIndex((s) => s.type === "map");
    if (form && mapIdx !== -1) {
      if (mode === "drop-map") {
        const map = page.sections[mapIdx] as any;
        if (!form.address && map.address) form.address = map.address;
        page.sections.splice(mapIdx, 1);
      } else {
        form.layout = "centered";
      }
    }
  }
  return content;
}
