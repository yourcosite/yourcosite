import { SECTION_CATALOG } from "@/lib/sectionCatalog";

// Förslag när den valda mallen inte riktigt passar sektionens innehåll.
// Ren logik utan React: tar sektionen och mallen som valts och svarar med
// varför den inte passar och vilka mallar som skulle få plats med allt.
type Sec = Record<string, any>;
export type Suggestion = { type: string; layout: string; noun: string; label: string };
export type Mismatch = { reason: "no-text" | "many-images"; suggestions: Suggestion[] };

const hasText = (s: Sec): boolean =>
  !!(s.body || s.heading || s.headline || s.intro || s.carry?.body || s.carry?.heading ||
    (Array.isArray(s.items) && s.items.some((i: Sec) => i?.title || i?.body || i?.question || i?.quote)));
const imageCount = (s: Sec): number => {
  if (s.type === "gallery" || s.type === "image") {
    const n = Array.isArray(s.items) ? s.items.filter((i: Sec) => i?.imageUrl).length : 0;
    return Math.max(n, s.imageUrl ? 1 : 0);
  }
  return 0;
};

function make(type: string, layout: string): Suggestion | null {
  const cat = SECTION_CATALOG.find((c) => c.type === type);
  const l = cat?.layouts.find((x) => x.id === layout);
  return cat && l ? { type, layout, noun: cat.name, label: l.label } : null;
}
const list = (pairs: [string, string][]) => pairs.map(([t, l]) => make(t, l)).filter(Boolean) as Suggestion[];

export function checkTemplateFit(section: Sec, pick: { type: string; layout: string }): Mismatch | null {
  // Mallen saknar textplats men sektionen har rubrik och text.
  const textless = pick.type === "gallery" || (pick.type === "image" && pick.layout !== "captioned");
  if (textless && section.type !== pick.type && hasText(section)) {
    return {
      reason: "no-text",
      suggestions: list([
        ["about", "portrait-left"], ["about", "image-right"], ["about", "landscape-top"], ["image", "captioned"],
      ]).filter((s) => s.layout !== pick.layout),
    };
  }
  // Sektionen har flera bilder men mallen visar bara en.
  const single = (pick.type === "about" && ["image-left", "image-right", "image-full", "image-stats", "portrait-left", "portrait-right", "landscape-top", "landscape-bottom"].includes(pick.layout)) ||
    pick.type === "hero" || pick.type === "cta" || (pick.type === "image" && ["plain", "fade-top", "fade-bottom", "fade-both", "tall", "tall-fade-both", "framed", "captioned", "portrait-1"].includes(pick.layout));
  const n = imageCount(section);
  if (single && n >= 2) {
    const s =
      n === 2 ? list([["image", "landscape-2"], ["image", "portrait-2"], ["image", "portrait-landscape"], ["gallery", "grid"]])
      : n === 3 ? list([["image", "row-3"], ["image", "portrait-3"], ["image", "big-two-small"], ["gallery", "masonry"]])
      : list([["image", "row-4"], ["image", "portrait-4"], ["gallery", "tiles"], ["gallery", "mosaic"]]);
    return { reason: "many-images", suggestions: s };
  }
  return null;
}
