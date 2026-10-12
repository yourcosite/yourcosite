// Hjälp för att läsa och skriva en enskild textrad i en sektion, utan AI.
// Fältnamnen kommer från markeringen i förhandsvisningen ("headline",
// "items.1.title" …). Länkar och adresser till bilder får aldrig skrivas
// över härifrån, så vi tillåter bara en känd lista med rena textfält.

const TEXT_FIELDS = new Set([
  "eyebrow",
  "headline",
  "headlineEmphasis",
  "heading",
  "body",
  "intro",
  "ctaLabel",
  "submitLabel",
  "title",
  "caption",
  "question",
  "answer",
  "quote",
  "author",
  "email",
  "phone",
  "address",
]);

export type ParsedField = { itemIndex?: number; name: string };

export function parseFieldPath(field: string): ParsedField | null {
  const m = /^items\.(\d+)\.([A-Za-z]+)$/.exec(field);
  if (m) {
    return TEXT_FIELDS.has(m[2]) ? { itemIndex: Number(m[1]), name: m[2] } : null;
  }
  return TEXT_FIELDS.has(field) ? { name: field } : null;
}

// Vissa sektioner (t.ex. omdömen) har sina rader under andra listnamn än
// "items" — vi letar därför i de vanliga listorna.
const LIST_KEYS = ["items", "testimonials", "quotes", "faqs", "questions"];

function findHolder(section: any, parsed: ParsedField): any | null {
  if (parsed.itemIndex === undefined) return section;
  for (const key of LIST_KEYS) {
    const list = section?.[key];
    if (Array.isArray(list) && list[parsed.itemIndex] && typeof list[parsed.itemIndex][parsed.name] === "string") {
      return list[parsed.itemIndex];
    }
  }
  return null;
}

export function getFieldText(section: any, field: string): string | null {
  const parsed = parseFieldPath(field);
  if (!parsed) return null;
  const holder = findHolder(section, parsed);
  const v = holder?.[parsed.name];
  return typeof v === "string" ? v : null;
}

export function setFieldText(section: any, field: string, text: string): boolean {
  const parsed = parseFieldPath(field);
  if (!parsed) return false;
  const holder = findHolder(section, parsed);
  if (!holder || typeof holder[parsed.name] !== "string") return false;
  holder[parsed.name] = text;
  return true;
}
