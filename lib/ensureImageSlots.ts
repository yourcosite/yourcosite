import type { SiteContent, HeroSection, GridSection, GallerySection } from "./contentModel";

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

// Förstasidan ska kännas bildstark utöver sin egen hero (kundönskemål:
// "liggande stora bilder över hela sidan", som Restaurangen/Snickeriet i
// /exempel) — prompten (app/api/sites/generate/route.ts) BER redan AI:n
// om just det, men språkmodeller har en stark slagsida åt det "säkra"
// mönstret (en liten tre-kolumners ikonbilds-grid) även när de uttryckligen
// ombeds variera, så en ren promptknuff visade sig otillräcklig i
// praktiken. Därför tvingas det igenom i kod istället, precis som
// ensureImageSlots ovan: FÖRSTA "grid"-sektionen på förstasidan får
// layouten "alternating-rows" (stora, liggande bilder som växlar sida om
// sida med text) — påverkar bara layout-fältet, aldrig sektionens egna
// rubrik/text/bilder, så inget innehåll går förlorat.
export function enforceHomepageImageRichness(content: SiteContent): SiteContent {
  const home = content.pages.find((p) => p.path === "/");
  if (!home) return content;

  const firstGrid = home.sections.find((s): s is GridSection => s.type === "grid");
  if (firstGrid) {
    firstGrid.layout = "alternating-rows";
    // Layouten är medvetet FAST (alltid "alternating-rows", aldrig
    // slumpad som randomizeSectionLayouts gör med andra sektioner) för
    // att garantera det bildstarka förstaintrycket varje gång — men utan
    // NÅGON variation alls blev den delen av sidan (allt som syns utan
    // att scrolla) för identisk mellan omgenereringar. Att slumpa
    // ORDNINGEN på rutorna (i stället för layouten) ger en annan
    // bild/textpar i varje rad och om första raden börjar med bild eller
    // text, utan att ge upp bildgarantin.
    if (Math.random() < 0.5) firstGrid.items = [...firstGrid.items].reverse();
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
