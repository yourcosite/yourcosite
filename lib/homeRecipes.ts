import type { Section, SiteContent } from "./contentModel";

// Förstasidans "recept" — i vilken ORDNING sektionerna kommer efter heron.
// Kundfeedback: förslagen hade alltid exakt samma uppbyggnad under heron
// ("Vad vi gör" → text → citat → knapp), även när huvudet och färgerna
// skilde sig. Receptet byter bara ordning (inget innehåll tas bort eller
// skrivs om), så ett förslag kan öppna med "Vad vi gör", ett annat med ett
// stort citat och ett tredje med företagets berättelse/nyckeltal.
//
// Receptlistan är medvetet kort och säker: "testimonials" (som renderas som
// en fullbredds bild) hamnar aldrig direkt före "cta" — se
// enforceHomepageImageRichness i lib/ensureImageSlots.ts för varför två
// stora bilder på rad ska undvikas.
export interface HomeRecipe {
  id: string;
  label: string;
  // Ordningen på de sektionstyper som kommer direkt efter heron. Typer som
  // saknas på sajten hoppas över.
  order: ("grid" | "about" | "testimonials")[];
}

export const HOME_RECIPES: HomeRecipe[] = [
  { id: "tjanster-forst", label: "Vad vi gör först", order: ["grid", "testimonials", "about"] },
  { id: "citat-forst", label: "Stort citat först", order: ["testimonials", "grid", "about"] },
  { id: "berattelse-forst", label: "Berättelse och nyckeltal först", order: ["about", "testimonials", "grid"] },
  { id: "citat-berattelse", label: "Citat, sedan berättelse", order: ["testimonials", "about", "grid"] },
];

export function isHomeRecipeId(v: unknown): v is string {
  return typeof v === "string" && HOME_RECIPES.some((r) => r.id === v);
}

// Receptet för förslag nummer `index` (0-baserat) — `seed` är ett slumptal
// som sätts när sajten genereras (SiteContent.layoutSeed), så en omgenerering
// fördelar recepten på förslagen på ett nytt sätt. Grannar i listan får
// alltid olika recept.
export function recipeForVariant(index: number, seed: number | undefined): HomeRecipe {
  const n = HOME_RECIPES.length;
  return HOME_RECIPES[(((index + (seed ?? 0)) % n) + n) % n];
}

// Typer som alltid ska ligga sist på sidan, i sin ursprungliga ordning.
const TAIL_TYPES = new Set(["faq", "map", "contact", "contactForm", "newsList"]);

// Returnerar en KOPIA av sajten där förstasidans sektioner ligger i receptets
// ordning. Heron ligger kvar överst, "cta" och sidans avslutande sektioner
// (faq/karta/kontakt …) ligger kvar sist. Undersidor rörs aldrig.
export function applyHomeRecipe(content: SiteContent, recipeId: string): SiteContent {
  const recipe = HOME_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return content;
  const homeIdx = content.pages.findIndex((p) => p.path === "/");
  if (homeIdx < 0) return content;

  const sections = content.pages[homeIdx].sections;
  const hero = sections[0]?.type === "hero" ? sections[0] : null;
  const rest = hero ? sections.slice(1) : sections.slice();

  const picked = new Set<Section>();
  const ordered: Section[] = [];
  for (const type of recipe.order) {
    const found = rest.find((s) => s.type === type && !picked.has(s));
    if (found) {
      picked.add(found);
      ordered.push(found);
    }
  }
  const remaining = rest.filter((s) => !picked.has(s));
  const middle = remaining.filter((s) => s.type !== "cta" && !TAIL_TYPES.has(s.type));
  const ctas = remaining.filter((s) => s.type === "cta");
  const tail = remaining.filter((s) => TAIL_TYPES.has(s.type));

  const newSections = [...(hero ? [hero] : []), ...ordered, ...middle, ...ctas, ...tail];
  const pages = content.pages.slice();
  pages[homeIdx] = { ...pages[homeIdx], sections: newSections };
  return { ...content, pages };
}
