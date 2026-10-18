import type { Locale } from "./config";
import en from "./en.json";

// Ordlistor per språk. Svenska behöver ingen (texten i koden är svenskan).
export const DICTIONARIES: Record<Locale, Record<string, string>> = {
  sv: {},
  en: en as Record<string, string>,
};
