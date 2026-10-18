import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LOCALE, isLocale, makeT, type Locale, type TFunction } from "./config";
import { DICTIONARIES } from "./dictionaries";
import { BCP47, isCurrency, siteCurrencyFor, type Currency } from "./country";

// Språk och valuta för en kunds sajt (sites.language / sites.currency),
// samt ägarens eget språk (profiles.language). Kolumnerna tillkom i
// supabase/sprak.sql — saknas de faller allt tillbaka på svenska/kronor så
// inget går sönder innan SQL-filen körts.
export type SiteLocale = {
  lang: Locale;
  currency: Currency;
  bcp47: string;
  t: TFunction;
  ownerLang: Locale;
  ownerT: TFunction;
};

export const tFor = (lang: Locale): TFunction => makeT(DICTIONARIES[lang]);

export async function siteLocale(db: SupabaseClient, siteId: string): Promise<SiteLocale> {
  let lang: Locale = DEFAULT_LOCALE;
  let currency: Currency = "SEK";
  let ownerLang: Locale = DEFAULT_LOCALE;
  try {
    const { data: site } = await db.from("sites").select("language, currency, owner_id").eq("id", siteId).maybeSingle();
    if (site) {
      if (isLocale((site as any).language)) lang = (site as any).language;
      if (isCurrency((site as any).currency)) currency = (site as any).currency;
      const { data: owner } = await db.from("profiles").select("language, country").eq("id", (site as any).owner_id).maybeSingle();
      if (isLocale((owner as any)?.language)) ownerLang = (owner as any).language;
      if (!isCurrency((site as any).currency) && (owner as any)?.country) currency = siteCurrencyFor((owner as any).country);
    }
  } catch {
    /* kolumnerna saknas ännu */
  }
  return { lang, currency, bcp47: BCP47[lang] ?? "sv-SE", t: tFor(lang), ownerLang, ownerT: tFor(ownerLang) };
}
