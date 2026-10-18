"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, DEFAULT_LOCALE, type Locale, type TFunction } from "@/lib/i18n/config";

const Ctx = createContext<{ locale: Locale; t: TFunction }>({ locale: DEFAULT_LOCALE, t: makeT(undefined) });

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: makeT(dict) }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// I klientkomponenter: const t = useT(); t("Skapa konto")
export function useT(): TFunction {
  return useContext(Ctx).t;
}
export function useLocale(): Locale {
  return useContext(Ctx).locale;
}
