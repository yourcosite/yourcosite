// Byter typ på en sektion (t.ex. Om oss till Ren bild) och tar med det som går
// att ta med: rubrik, text, bild, knapp och sektionens egna inställningar.
// Typer som kräver kunduppgifter vi inte har (bokning, karta, meny, matcher,
// personer m.fl.) skapas inte här, de får Millie lägga till.

type Sec = Record<string, any>;

export const CONVERTIBLE_TYPES = ["hero", "about", "grid", "testimonials", "cta", "faq", "toggle", "gallery", "image"];

const TEXT_KEYS = ["title", "body", "name", "question", "answer", "quote", "author", "caption"];
function textOf(items: unknown): Sec[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((i: Sec) => Object.fromEntries(TEXT_KEYS.filter((k) => typeof i?.[k] === "string" && i[k].trim()).map((k) => [k, i[k]])))
    .filter((o) => Object.keys(o).length > 0)
    .slice(0, 24);
}

const KEEP = ["bgColor", "spacing", "textAlign", "fadeTop", "fadeBottom", "ctaStyle", "ctaColor"];

export function convertSection(old: Sec, type: string, layout: string): Sec | null {
  if (!CONVERTIBLE_TYPES.includes(type)) return null;
  // "carry" sparar rubrik, text och listtexter från tidigare sektionstyper, så
  // inget går förlorat när en typ utan textplats (t.ex. Ren bild) väljs och
  // allt kommer tillbaka om man byter tillbaka.
  const prev: Sec = old.carry && typeof old.carry === "object" ? old.carry : {};
  const textItems = textOf(old.items);
  const carry: Sec = {};
  const put = (k: string, v: unknown) => { if (v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) carry[k] = v; };
  put("heading", old.headline || old.heading || prev.heading);
  put("body", old.body || old.intro || prev.body);
  put("eyebrow", old.eyebrow || prev.eyebrow);
  put("ctaLabel", old.ctaLabel || prev.ctaLabel);
  put("ctaLink", old.ctaLink || prev.ctaLink);
  put("items", textItems.length ? textItems : prev.items);
  const title: string = old.headline || old.heading || prev.heading || "";
  let body: string = old.body || old.intro || prev.body || "";
  // En lista (rutor, frågor, omdömen) blir löpande text om målet har textruta men ingen lista.
  if (!body && Array.isArray(carry.items) && ["about", "hero", "cta"].includes(type)) {
    body = (carry.items as Sec[]).map((i) => [i.title || i.name || i.question, i.body || i.answer || i.quote].filter(Boolean).join(": ")).filter(Boolean).join("\n\n").slice(0, 1500);
  }
  const imageUrl: string | undefined =
    old.imageUrl || (Array.isArray(old.items) ? old.items.find((i: Sec) => i?.imageUrl)?.imageUrl : undefined);
  const base: Sec = { id: old.id, type, layout };
  if (Object.keys(carry).length) base.carry = carry;
  for (const k of KEEP) if (old[k] !== undefined) base[k] = old[k];
  const ctaLabel0 = old.ctaLabel || prev.ctaLabel;
  const ctaLink0 = old.ctaLink || prev.ctaLink;
  const cta = ctaLabel0 ? { ctaLabel: ctaLabel0, ...(ctaLink0 ? { ctaLink: ctaLink0 } : {}) } : null;

  switch (type) {
    case "hero":
      return { ...base, headline: title || "Din rubrik", body: body || "Skriv en kort text här.", ...((old.eyebrow || prev.eyebrow) ? { eyebrow: old.eyebrow || prev.eyebrow } : {}), ...(cta ?? {}), ...(imageUrl ? { imageUrl } : {}) };
    case "about":
      return { ...base, heading: title || "Om oss", body: body || "Skriv några rader om er här.", ...(imageUrl ? { imageUrl } : {}) };
    case "cta":
      return { ...base, heading: title || "Hör av dig", body: body || "Skriv en kort uppmaning här.", ctaLabel: ctaLabel0 || "Kontakta oss", ...(ctaLink0 ? { ctaLink: ctaLink0 } : { ctaLink: "/kontakt" }), ...(imageUrl ? { imageUrl } : {}) };
    case "image": {
      // Bildtexten tar med rubriken, så den syns även i en ren bildmall.
      const s: Sec = { ...base, ...(imageUrl ? { imageUrl } : {}), ...(layout === "captioned" && (title || body) ? { caption: title || body.slice(0, 120) } : {}) };
      return s;
    }
    case "grid": {
      const src: Sec[] = Array.isArray(old.items) && old.items.some((i: Sec) => i && (i.title || i.body || i.name || i.question)) ? old.items.filter((i: Sec) => i && (i.title || i.body || i.name || i.question)) : Array.isArray(prev.items) ? prev.items : [];
      const items = src.length
        ? src.map((i: Sec) => ({ title: i.title || i.name || i.question || "Rubrik", body: i.body || i.answer || i.quote || "Skriv en kort text här.", ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}) }))
        : [1, 2, 3].map(() => ({ title: title || "Rubrik", body: body || "Skriv en kort text här." }));
      return { ...base, heading: title || "Det här gör vi", items };
    }
    case "testimonials": {
      const src: Sec[] = Array.isArray(old.items) && old.items.some((i: Sec) => i?.quote) ? old.items.filter((i: Sec) => i?.quote) : Array.isArray(prev.items) ? prev.items.filter((i: Sec) => i?.quote) : [];
      return { ...base, heading: title || "Vad kunderna säger", items: src.length ? src.map((i: Sec) => ({ quote: i.quote, author: i.author || "Namn" })) : [{ quote: body || "Skriv ett omdöme här.", author: "Namn" }] };
    }
    case "faq": {
      const src: Sec[] = Array.isArray(old.items) && old.items.some((i: Sec) => i?.question || i?.title) ? old.items.filter((i: Sec) => i?.question || i?.title) : Array.isArray(prev.items) ? prev.items.filter((i: Sec) => i?.question || i?.title) : [];
      return { ...base, heading: title || "Vanliga frågor", items: src.length ? src.map((i: Sec) => ({ question: i.question || i.title, answer: i.answer || i.body || "" })) : [{ question: title || "Fråga", answer: body || "Skriv svaret här." }] };
    }
    case "toggle": {
      const src: Sec[] = Array.isArray(old.items) && old.items.some((i: Sec) => i && (i.title || i.question || i.name)) ? old.items.filter((i: Sec) => i && (i.title || i.question || i.name)) : Array.isArray(prev.items) ? prev.items : [];
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
