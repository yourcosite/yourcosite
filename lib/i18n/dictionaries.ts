import type { Locale } from "./config";
import en from "./en.json";
import da from "./da.json";
import fi from "./fi.json";
import de from "./de.json";
import fr from "./fr.json";
import es from "./es.json";

// Ordlistor per språk. Svenska behöver ingen (texten i koden är svenskan).
export const DICTIONARIES: Record<Locale, Record<string, string>> = {
  sv: {},
  en: en as Record<string, string>,
  da: da as Record<string, string>,
  fi: fi as Record<string, string>,
  de: de as Record<string, string>,
  fr: fr as Record<string, string>,
  es: es as Record<string, string>,
};
