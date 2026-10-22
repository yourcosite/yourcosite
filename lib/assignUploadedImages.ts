import type { SiteContent, Section } from "./contentModel";
import { MAX_GALLERY_IMAGES } from "./contentModel";

const GALLERY_HEADING: Record<string, string> = {
  sv: "Galleri", en: "Gallery", da: "Galleri", fi: "Galleria", de: "Galerie", fr: "Galerie", es: "Galería",
};
const GALLERY_PAGE_RE = /galleri|gallery|galerie|galería|galeria|bilder|images|photos|fotos|portfolio|inspiration|referens/i;
// Så många bilder måste bli över (efter att mallens bildplatser fyllts) för att
// ett galleri ska läggas till.
const MIN_GALLERY_LEFTOVER = 3;

// Placerar kundens egna uppladdade foton i designen — helt deterministiskt
// i kod, INTE något AI:n väljer eller ser. Varje sidas hero får en bild,
// och grid-sektionernas items delas ut i tur och ordning — över ALLA
// sidor, inte bara förstasidan (annars stod undersidorna utan bilder).
// Finns fler bildplatser än foton upprepas listan hellre än att lämna
// tomt. Finns inga foton alls rör vi ingenting — då faller SitePreview
// tillbaka på sin gradient-platshållare.
//
// heroImageUrl är kundens EGET val av huvudbild (steg 3:s dedikerade
// "Huvudbild"-fält) — om satt vinner den alltid över startsidans hero,
// oavsett vad round-robin-fördelningen annars skulle lagt där. Den räknas
// bort ur den allmänna foto-poolen så den inte också dyker upp någon
// annanstans och stör ordningen.
export function assignUploadedImages(
  content: SiteContent,
  imageUrls: string[],
  heroImageUrl?: string | null,
  language?: string | null
): SiteContent {
  return assignUploadedImagesDetailed(content, imageUrls, heroImageUrl, language).content;
}

// Som ovan, men säger också hur många bilder som hamnade i kundens galleri.
// Blir det fler uppladdade foton över än mallens bildplatser rymmer läggs de
// i ett galleri: det galleri som redan finns, annars ett nytt på sidan som
// heter något med galleri/bilder/portfolio (annars startsidan).
export function assignUploadedImagesDetailed(
  content: SiteContent,
  imageUrls: string[],
  heroImageUrl?: string | null,
  language?: string | null
): { content: SiteContent; galleryCount: number } {
  let galleryCount = 0;
  const generalUrls = heroImageUrl ? imageUrls.filter((u) => u !== heroImageUrl) : imageUrls;

  if (generalUrls.length > 0) {
    let i = 0;
    const next = () => generalUrls[i++ % generalUrls.length];
    const slotsUsed = () => i;

    for (const page of content.pages) {
      for (const section of page.sections) {
        if (section.type === "hero") {
          section.imageUrl = next();
          // collageImageUrls fylls ALLTID (inte bara när AI:n själv satte
          // layout "collage") — precis som imageUrl ovan. Anledningen:
          // startsidans hero-layout bestäms i praktiken av kundens VAL av
          // stilvariant på /forslag (se heroLayoutOverride/theme.heroLayout
          // i SitePreview.tsx), inte av AI:ns eget layout-värde i det här
          // steget — samma innehåll används för alla sju förhandsvisningar.
          // Väljer kunden INTE "redaktionell" (den enda varianten med
          // layout "collage") används fälten aldrig, men kostar inget att
          // ha dem redo.
          section.collageImageUrls = [next(), next()];
        } else if (section.type === "grid" || section.type === "gallery") {
          section.items = section.items.map((item) => ({ ...item, imageUrl: next() }));
        } else if (section.type === "testimonials" && section.layout === "full-bleed") {
          // Samma princip som hero ovan — "full-bleed" visar EN bild som
          // täcker hela sektionen bakom citatet (se contentModel.ts), inte
          // en konstbakgrund, så den behöver sin egen bild precis som en
          // hero gör. Utan uppladdade foton rör vi ingenting — SitePreview
          // faller då tillbaka på gradient-platshållaren, som vanligt.
          section.imageUrl = next();
        } else if (section.type === "booking" && (section.layout === "image-left" || section.layout === "image-right" || section.layout === "image-background")) {
          // Samma princip som hero imageUrl — se contentModel.ts BookingSection.imageUrl.
          section.imageUrl = next();
        } else if (section.type === "cta" && (section.layout === "image-bleed" || section.layout === "dark-split")) {
          // Samma princip igen — se contentModel.ts CtaSection.imageUrl.
          section.imageUrl = next();
        } else if (section.type === "about" && section.layout === "stats-split") {
          // Samma princip som hero collageImageUrls — se contentModel.ts
          // AboutSection.collageImageUrls (två foton i olika höjd).
          section.collageImageUrls = [next(), next()];
        } else if (section.type === "about" && (section.layout === "image-full" || section.layout === "image-stats" || section.layout === "image-left" || section.layout === "image-right")) {
          // Samma princip som hero imageUrl — se contentModel.ts
          // AboutSection.imageUrl (en bild som täcker hela sektionshöjden).
          section.imageUrl = next();
        }
      }
    }

    // Startsidans FÖRSTA "about"/"cta"-sektion kan få sin layout TVINGAD
    // av en stilvariant (SiteTheme.aboutLayout/ctaLayout — se
    // kommentaren i lib/contentModel.ts och heroImageUrl-principen ovan)
    // till en bildkrävande layout, OAVSETT vad AI:n själv valde för just
    // den sektionen vid genereringen. Utan den här "toppningen" skulle en
    // sådan sektion sakna bild/collageImageUrls om AI:ns egna layout-val
    // råkade bli t.ex. "text-left"/"centered" — precis samma princip som
    // hero.collageImageUrls alltid fylls ovan. Bara HEMSIDANS första
    // sektion av respektive typ påverkas (matchar overridens egen
    // begränsning), inte alla about/cta-sektioner på hela sajten — det
    // skulle i onödan ta bilder från grid/galleri-rutor på andra sidor.
    const home = content.pages.find((p) => p.path === "/");
    const firstHomeAbout = home?.sections.find((s) => s.type === "about");
    if (firstHomeAbout && firstHomeAbout.type === "about") {
      if (!firstHomeAbout.collageImageUrls || firstHomeAbout.collageImageUrls.length < 2) {
        firstHomeAbout.collageImageUrls = [next(), next()];
      }
      if (!firstHomeAbout.imageUrl) firstHomeAbout.imageUrl = next();
    }
    const firstHomeCta = home?.sections.find((s) => s.type === "cta");
    if (firstHomeCta && firstHomeCta.type === "cta" && !firstHomeCta.imageUrl) {
      firstHomeCta.imageUrl = next();
    }

    // Fler foton än mallen har bildplatser för: samla dem i ett galleri.
    if (generalUrls.length - slotsUsed() >= MIN_GALLERY_LEFTOVER) {
      const all = (heroImageUrl ? [heroImageUrl, ...generalUrls] : generalUrls).slice(0, MAX_GALLERY_IMAGES);
      const items = all.map((imageUrl) => ({ imageUrl }));
      const layoutFor = (n: number) => (n >= 12 ? "mosaic" : n >= 7 ? "masonry" : "grid");
      const pagePrefer = content.pages.find((p) => p.path !== "/" && GALLERY_PAGE_RE.test(`${p.label} ${p.path}`));
      let existing: any;
      for (const pg of pagePrefer ? [pagePrefer, ...content.pages] : content.pages) {
        existing = pg.sections.find((sec) => sec.type === "gallery");
        if (existing) break;
      }
      if (existing) {
        existing.items = items;
        existing.layout = layoutFor(items.length);
      } else {
        const target = pagePrefer ?? content.pages.find((p) => p.path === "/") ?? content.pages[0];
        if (target) {
          const section = {
            id: "gallery-uploads",
            type: "gallery",
            layout: layoutFor(items.length),
            heading: GALLERY_HEADING[language || "sv"] ?? GALLERY_HEADING.sv,
            items,
          } as unknown as Section;
          // Före sista avslutande sektion (cta/kontakt/formulär) om sådan finns.
          const tailTypes = ["cta", "contact", "contactForm", "booking", "map"];
          let at = target.sections.length;
          while (at > 1 && tailTypes.includes(target.sections[at - 1].type)) at--;
          target.sections.splice(at, 0, section);
        }
      }
      galleryCount = items.length;
    }
  }

  if (heroImageUrl) {
    const home = content.pages.find((p) => p.path === "/");
    const homeHero = home?.sections.find((s) => s.type === "hero");
    if (homeHero) homeHero.imageUrl = heroImageUrl;
  }

  return { content, galleryCount };
}
