"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocale } from "@/components/I18nProvider";
import { makeT, isLocale, type Locale, type TFunction } from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";
import { BCP47, isCurrency, type Currency } from "@/lib/i18n/country";

// Språket PÅ KUNDENS SAJT (cookiebanner, bokning, formulär …). Det är inte
// samma sak som språket i vårt eget gränssnitt: en svensk kund kan ha en
// tysk sajt. Providern läggs runt SitePreview; saknas den används
// gränssnittets språk.
type SiteI18n = { lang: Locale; t: TFunction; bcp47: string; currency: Currency };
const Ctx = createContext<SiteI18n | null>(null);

export function SiteLangProvider({
  lang,
  currency,
  children,
}: {
  lang?: string | null;
  currency?: string | null;
  children: React.ReactNode;
}) {
  const uiLocale = useLocale();
  const l: Locale = isLocale(lang) ? lang : uiLocale;
  const cur: Currency = isCurrency(currency) ? currency : l === "sv" ? "SEK" : "EUR";
  const value = useMemo<SiteI18n>(
    () => ({ lang: l, t: makeT(CHROME[l]), bcp47: BCP47[l], currency: cur }),
    [l, cur]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useSite(): SiteI18n {
  const ctx = useContext(Ctx);
  const uiLocale = useLocale();
  return useMemo(
    () => ctx ?? { lang: uiLocale, t: makeT(CHROME[uiLocale]), bcp47: BCP47[uiLocale], currency: uiLocale === "sv" ? "SEK" : "EUR" },
    [ctx, uiLocale]
  );
}

// I sajtens chrome: const t = useSiteT(); t("Acceptera alla")
export function useSiteT(): TFunction {
  return useSite().t;
}
export function useSiteLocale(): { lang: Locale; bcp47: string; currency: Currency } {
  const s = useSite();
  return { lang: s.lang, bcp47: s.bcp47, currency: s.currency };
}
