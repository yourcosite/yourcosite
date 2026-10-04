import type { SiteContent } from "./contentModel";

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
  heroImageUrl?: string | null
): SiteContent {
  const generalUrls = heroImageUrl ? imageUrls.filter((u) => u !== heroImageUrl) : imageUrls;

  if (generalUrls.length > 0) {
    let i = 0;
    const next = () => generalUrls[i++ % generalUrls.length];

    for (const page of content.pages) {
      for (const section of page.sections) {
        if (section.type === "hero") {
          section.imageUrl = next();
        } else if (section.type === "grid" || section.type === "gallery") {
          section.items = section.items.map((item) => ({ ...item, imageUrl: next() }));
        } else if (section.type === "testimonials" && section.layout === "full-bleed") {
          // Samma princip som hero ovan — "full-bleed" visar EN bild som
          // täcker hela sektionen bakom citatet (se contentModel.ts), inte
          // en konstbakgrund, så den behöver sin egen bild precis som en
          // hero gör. Utan uppladdade foton rör vi ingenting — SitePreview
          // faller då tillbaka på gradient-platshållaren, som vanligt.
          section.imageUrl = next();
        }
      }
    }
  }

  if (heroImageUrl) {
    const home = content.pages.find((p) => p.path === "/");
    const homeHero = home?.sections.find((s) => s.type === "hero");
    if (homeHero) homeHero.imageUrl = heroImageUrl;
  }

  return content;
}
