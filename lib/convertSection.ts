// Byter typ på en sektion (t.ex. Om oss till Ren bild) och tar med det som går
// att ta med: rubrik, text, bild, knapp och sektionens egna inställningar.
// Typer som kräver kunduppgifter vi inte har (bokning, karta, meny, matcher,
// personer m.fl.) skapas inte här, de får Millie lägga till.

type Sec = Record<string, any>;

export const CONVERTIBLE_TYPES = ["hero", "about", "grid", "testimonials", "cta", "faq", "toggle", "gallery", "image"];

const KEEP = ["bgColor", "spacing", "textAlign", "fadeTop", "fadeBottom", "ctaStyle", "ctaColor"];

export function convertSection(old: Sec, type: string, layout: string): Sec | null {
  if (!CONVERTIBLE_TYPES.includes(type)) return null;
  const title: string = old.headline || old.heading || "";
  const body: string = old.body || old.intro || "";
  const imageUrl: string | undefined =
    old.imageUrl || (Array.isArray(old.items) ? old.items.find((i: Sec) => i?.imageUrl)?.imageUrl : undefined);
  const base: Sec = { id: old.id, type, layout };
  for (const k of KEEP) if (old[k] !== undefined) base[k] = old[k];
  const cta = old.ctaLabel ? { ctaLabel: old.ctaLabel, ...(old.ctaLink ? { ctaLink: old.ctaLink } : {}) } : null;

  switch (type) {
    case "hero":
      return { ...base, headline: title || "Din rubrik", body: body || "Skriv en kort text här.", ...(old.eyebrow ? { eyebrow: old.eyebrow } : {}), ...(cta ?? {}), ...(imageUrl ? { imageUrl } : {}) };
    case "about":
      return { ...base, heading: title || "Om oss", body: body || "Skriv några rader om er här.", ...(imageUrl ? { imageUrl } : {}) };
    case "cta":
      return { ...base, heading: title || "Hör av dig", body: body || "Skriv en kort uppmaning här.", ctaLabel: old.ctaLabel || "Kontakta oss", ...(old.ctaLink ? { ctaLink: old.ctaLink } : { ctaLink: "/kontakt" }), ...(imageUrl ? { imageUrl } : {}) };
    case "image": {
      const s: Sec = { ...base, ...(imageUrl ? { imageUrl } : {}) };
      return s;
    }
    case "grid": {
      const src: Sec[] = Array.isArray(old.items) ? old.items.filter((i: Sec) => i && (i.title || i.body || i.name || i.question)) : [];
      const items = src.length
        ? src.map((i: Sec) => ({ title: i.title || i.name || i.question || "Rubrik", body: i.body || i.answer || i.quote || "Skriv en kort text här.", ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}) }))
        : [1, 2, 3].map(() => ({ title: title || "Rubrik", body: body || "Skriv en kort text här." }));
      return { ...base, heading: title || "Det här gör vi", items };
    }
    case "testimonials": {
      const src: Sec[] = Array.isArray(old.items) ? old.items.filter((i: Sec) => i?.quote) : [];
      return { ...base, heading: title || "Vad kunderna säger", items: src.length ? src.map((i: Sec) => ({ quote: i.quote, author: i.author || "Namn" })) : [{ quote: body || "Skriv ett omdöme här.", author: "Namn" }] };
    }
    case "faq": {
      const src: Sec[] = Array.isArray(old.items) ? old.items.filter((i: Sec) => i?.question || i?.title) : [];
      return { ...base, heading: title || "Vanliga frågor", items: src.length ? src.map((i: Sec) => ({ question: i.question || i.title, answer: i.answer || i.body || "" })) : [{ question: title || "Fråga", answer: body || "Skriv svaret här." }] };
    }
    case "toggle": {
      const src: Sec[] = Array.isArray(old.items) ? old.items.filter((i: Sec) => i && (i.title || i.question || i.name)) : [];
      const items = src.length
        ? src.map((i: Sec) => ({ title: i.title || i.question || i.name, body: i.body || i.answer || "Skriv texten här.", ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}) }))
        : [1, 2, 3].map(() => ({ title: title || "Rubrik", body: body || "Skriv texten här." }));
      return { ...base, heading: title || "Läs mer", ...(old.intro ? { intro: old.intro } : {}), items };
    }
    case "gallery": {
      const src: Sec[] = Array.isArray(old.items) ? old.items.filter((i: Sec) => i?.imageUrl) : [];
      const items = src.length ? src.map((i: Sec) => ({ imageUrl: i.imageUrl, ...(i.caption ? { caption: i.caption } : {}) })) : imageUrl ? [{ imageUrl }] : [{}];
      return { ...base, heading: title || "Bilder", items };
    }
  }
  return null;
}
