import type { SiteContent } from "./contentModel";

// Placerar kundens egna uppladdade foton i designen — helt deterministiskt
// i kod, INTE något AI:n väljer eller ser. Första bilden går till hero på
// förstasidan, resten delas ut till grid-sektionernas items i tur och
// ordning. Finns fler bildplatser än foton upprepas de sista bilderna
// hellre än att lämna tomt. Finns inga foton alls rör vi ingenting — då
// faller SitePreview tillbaka på sin gradient-platshållare.
export function assignUploadedImages(content: SiteContent, imageUrls: string[]): SiteContent {
  if (imageUrls.length === 0) return content;

  let i = 0;
  const next = () => imageUrls[i++ % imageUrls.length];

  const page = content.pages[0];
  if (!page) return content;

  for (const section of page.sections) {
    if (section.type === "hero") {
      section.imageUrl = next();
    } else if (section.type === "grid") {
      section.items = section.items.map((item) => ({ ...item, imageUrl: next() }));
    }
  }

  return content;
}
