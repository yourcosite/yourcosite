import type { SiteContent } from "./contentModel";

// Placerar kundens egna uppladdade foton i designen — helt deterministiskt
// i kod, INTE något AI:n väljer eller ser. Varje sidas hero får en bild,
// och grid-sektionernas items delas ut i tur och ordning — över ALLA
// sidor, inte bara förstasidan (annars stod undersidorna utan bilder).
// Finns fler bildplatser än foton upprepas listan hellre än att lämna
// tomt. Finns inga foton alls rör vi ingenting — då faller SitePreview
// tillbaka på sin gradient-platshållare.
export function assignUploadedImages(content: SiteContent, imageUrls: string[]): SiteContent {
  if (imageUrls.length === 0) return content;

  let i = 0;
  const next = () => imageUrls[i++ % imageUrls.length];

  for (const page of content.pages) {
    for (const section of page.sections) {
      if (section.type === "hero") {
        section.imageUrl = next();
      } else if (section.type === "grid") {
        section.items = section.items.map((item) => ({ ...item, imageUrl: next() }));
      }
    }
  }

  return content;
}
