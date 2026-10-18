import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale, makeT, matchLocale, type Locale, type TFunction } from "./config";
import { DICTIONARIES } from "./dictionaries";

// Språket för det här anropet: först det middleware bestämt (gäller även
// första besöket, innan någon kaka hunnit sättas), sedan kakan, sedan
// webbläsarens språk, sist svenska.
export function getLocale(): Locale {
  try {
    const h = headers().get(LOCALE_HEADER);
    if (isLocale(h)) return h;
    const c = cookies().get(LOCALE_COOKIE)?.value;
    if (isLocale(c)) return c;
    return matchLocale(headers().get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

// För serverkomponenter och rutter: const t = getT(); t("Skapa konto")
export function getT(locale: Locale = getLocale()): TFunction {
  return makeT(DICTIONARIES[locale]);
}
