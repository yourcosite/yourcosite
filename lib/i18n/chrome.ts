import type { Locale } from "./config";
import en from "./chrome/en.json";
import da from "./chrome/da.json";
import fi from "./chrome/fi.json";
import de from "./chrome/de.json";
import fr from "./chrome/fr.json";
import es from "./chrome/es.json";

// Texter på kundens SAJT (cookiebanner, bokning, formulär). Egen, liten
// ordlista per språk så att den publika sajten inte behöver ladda hela
// verktygets ordlista. Nyckeln är den svenska texten, som i övriga i18n.
export const CHROME: Record<Locale, Record<string, string>> = {
  sv: {},
  en: en as Record<string, string>,
  da: da as Record<string, string>,
  fi: fi as Record<string, string>,
  de: de as Record<string, string>,
  fr: fr as Record<string, string>,
  es: es as Record<string, string>,
};
