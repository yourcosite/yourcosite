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
  "linkLabel",
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

// "Läs mer"-texten är valfri och saknas ofta i sparad data — då gäller
// standardtexten och fältet får skapas när kunden skriver en egen.
const DEFAULT_LINK_LABEL = "Läs mer";

function findHolder(section: any, parsed: ParsedField): any | null {
  if (parsed.itemIndex === undefined) return section;
  for (const key of LIST_KEYS) {
    const list = section?.[key];
    const item = Array.isArray(list) ? list[parsed.itemIndex] : undefined;
    if (item && (typeof item[parsed.name] === "string" || parsed.name === "linkLabel")) return item;
  }
  return null;
}

export function getFieldText(section: any, field: string): string | null {
  const parsed = parseFieldPath(field);
  if (!parsed) return null;
  const holder = findHolder(section, parsed);
  const v = holder?.[parsed.name];
  if (typeof v === "string") return v;
  return holder && parsed.name === "linkLabel" ? DEFAULT_LINK_LABEL : null;
}

export function setFieldText(section: any, field: string, text: string): boolean {
  const parsed = parseFieldPath(field);
  if (!parsed) return false;
  const holder = findHolder(section, parsed);
  if (!holder) return false;
  if (typeof holder[parsed.name] !== "string" && parsed.name !== "linkLabel") return false;
  holder[parsed.name] = text;
  return true;
}

// ---- Länkar (knappar och "Läs mer"-rader) ----
// Markeras en knapptext ("ctaLabel") är det knappens länk ("ctaLink") som
// ändras. "Läs mer"-rader är markerade som "ctaLink" eller "items.N.link".
export function linkFieldFor(field: string): string | null {
  if (field === "ctaLabel" || field === "ctaLink") return "ctaLink";
  const m = /^items\.(\d+)\.(link|ctaLabel|ctaLink)$/.exec(field);
  if (m) return `items.${m[1]}.${m[2] === "ctaLabel" ? "link" : m[2]}`;
  return null;
}

function linkHolder(section: any, field: string): { holder: any; key: string } | null {
  const m = /^items\.(\d+)\.(link|ctaLink)$/.exec(field);
  if (m) {
    const item = section?.items?.[Number(m[1])];
    return item ? { holder: item, key: m[2] } : null;
  }
  return field === "ctaLink" ? { holder: section, key: "ctaLink" } : null;
}

export function getLinkValue(section: any, field: string): string {
  const h = linkHolder(section, field);
  const v = h?.holder?.[h.key];
  return typeof v === "string" ? v : "";
}

// Fältet som håller "nytt fönster"-valet till en länk.
function newTabKey(key: string): string {
  return key === "link" ? "newTab" : "ctaNewTab";
}

export function getNewTab(section: any, field: string): boolean | undefined {
  const h = linkHolder(section, field);
  const v = h?.holder?.[newTabKey(h.key)];
  return typeof v === "boolean" ? v : undefined;
}

// newTab: true/false = kundens val, undefined = rör inte valet.
export function setLinkValue(section: any, field: string, value: string, newTab?: boolean): boolean {
  const h = linkHolder(section, field);
  if (!h) return false;
  const nk = newTabKey(h.key);
  if (value) {
    h.holder[h.key] = value;
    if (typeof newTab === "boolean") h.holder[nk] = newTab;
  } else {
    delete h.holder[h.key];
    delete h.holder[nk];
  }
  return true;
}

// Tillåtet mål: en sida på sajten, en webbadress eller e-post/telefon.
export function isAllowedLink(value: string, pagePaths: string[]): boolean {
  if (value === "") return true;
  if (pagePaths.includes(value)) return true;
  return /^(https:\/\/|http:\/\/|mailto:|tel:)\S+$/i.test(value) && value.length <= 500;
}

// Vilket textfält som hör till det markerade fältet: ett vanligt textfält är
// sig självt, en "Läs mer"-rad (ctaLink / items.N.link) har sin text i
// linkLabel / items.N.linkLabel.
export function textFieldFor(field: string): string | null {
  if (parseFieldPath(field)) return field;
  if (field === "ctaLink") return "linkLabel";
  const m = /^items\.(\d+)\.link$/.exec(field);
  return m ? `items.${m[1]}.linkLabel` : null;
}
