// Språk i verktygets eget gränssnitt (kundzonen, redigeraren, mejlen). Svenska
// är förlagan: texterna i koden ÄR de svenska, och för övriga språk finns en
// ordlista (lib/i18n/<språk>.json) där den svenska texten är nyckeln.
// Saknas en översättning visas den svenska, så inget går sönder.
export const LOCALES = ["sv", "en", "da", "fi", "de", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sv";
export const LOCALE_COOKIE = "ycs_lang";
export const LOCALE_HEADER = "x-ycs-lang";

export const LOCALE_NAMES: Record<Locale, string> = {
  sv: "Svenska",
  en: "English",
  da: "Dansk",
  fi: "Suomi",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

// Språkens namn på engelska — används i instruktioner till AI:n.
export const LANGUAGE_ENGLISH: Record<string, string> = {
  sv: "Swedish",
  en: "English",
  da: "Danish",
  fi: "Finnish",
  de: "German",
  fr: "French",
  es: "Spanish",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

// Väljer språk utifrån webbläsarens Accept-Language (t.ex. "da,en;q=0.8").
// Första språket vi stödjer vinner. Stöds inget av dem används engelska,
// men saknas rubriken helt (sökrobotar m.m.) används svenska.
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const wanted = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? parseFloat(q.slice(2)) : 1 };
    })
    .filter((x) => x.lang && x.lang !== "*" && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  for (const w of wanted) if (isLocale(w.lang)) return w.lang;
  return "en";
}

export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{([\p{L}\p{N}_]+)\}/gu, (m, k) => (k in vars ? String(vars[k]) : m));
}

export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

export function makeT(dict: Record<string, string> | undefined): TFunction {
  return (text, vars) => interpolate(dict?.[text] ?? text, vars);
}

// Markerar en text som ligger utanför en komponent (t.ex. i en lista högst upp
// i filen) så att översättningsskriptet hittar den. Gör ingenting själv:
// visa texten med t(...) där den ritas ut.
export const msg = (text: string): string => text;
