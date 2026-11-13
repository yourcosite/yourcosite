import { BCP47, type Currency } from "@/lib/i18n/country";

// Prisnivåer — måste hållas i synk med priserna som visas på /priser.
// Kronor i Sverige, euro i alla andra länder (utkast på euro-nivåerna:
// ungefär kronpriset omräknat och avrundat).
// Från november 2026 säljs ETT paket ("bas" i databasen, visas som "Paket")
// plus tillägg. "standard" och "premium" finns kvar bara för äldre
// kunder/testdata och går inte längre att välja vid registrering.
export const PLAN_PRICES: Record<string, number> = {
  bas: 200,
  standard: 249,
  premium: 399,
};
export const PLAN_PRICES_EUR: Record<string, number> = {
  bas: 19,
  standard: 24,
  premium: 39,
};

export const PLAN_LABELS: Record<string, string> = {
  bas: "Paket",
  standard: "Standard (äldre)",
  premium: "Premium (äldre)",
};

// Tillägg per månad (kr och euro). Faktureras manuellt tills vidare.
export const ADDON_PRICES = {
  changes50: { SEK: 99, EUR: 9 },
  language1: { SEK: 39, EUR: 4 },
  language2: { SEK: 59, EUR: 6 },
  site: { SEK: 150, EUR: 14 },
} as const;

export function planPrice(plan: string | null | undefined, currency: Currency = "SEK"): number {
  if (!plan) return 0;
  const table = currency === "EUR" ? PLAN_PRICES_EUR : PLAN_PRICES;
  return table[plan] ?? 0;
}

// Beloppet i valutans vanliga skrivsätt för språket: "149 kr", "€24", "24,00 €".
export function formatMoney(amount: number, currency: Currency, locale = "sv"): string {
  return new Intl.NumberFormat(BCP47[locale] ?? locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

// Valutan vi visar på marknadssidorna: kronor på svenska, annars euro.
export function currencyForLocale(locale: string): Currency {
  return locale === "sv" ? "SEK" : "EUR";
}

export function formatKr(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}
