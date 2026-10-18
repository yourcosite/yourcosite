import type { Locale } from "./config";
import en from "./chrome/en.json";

// Texter på kundens SAJT (cookiebanner, bokning, formulär). Egen, liten
// ordlista per språk så att den publika sajten inte behöver ladda hela
// verktygets ordlista. Nyckeln är den svenska texten, som i övriga i18n.
export const CHROME: Record<Locale, Record<string, string>> = {
  sv: {},
  en: en as Record<string, string>,
};
