// Länder, valutor och företagsuppgifter per land. Underlag för kontoformulär,
// fakturering, integritetspolicy och sajtens juridiska uppgifter. Allt här är
// ren data och ren kod (inga React- eller serverberoenden), så det kan
// användas överallt.

import type { Locale } from "./config";

export const CURRENCIES = ["SEK", "EUR", "DKK"] as const;
export type Currency = (typeof CURRENCIES)[number];
export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}

// Språkkod som Intl förstår, per gränssnittsspråk.
export const BCP47: Record<string, string> = {
  sv: "sv-SE",
  en: "en-GB",
  da: "da-DK",
  fi: "fi-FI",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

export const COUNTRY_CODES = ["SE", "DK", "FI", "DE", "FR", "ES", "OTHER"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];
export function isCountry(v: unknown): v is CountryCode {
  return typeof v === "string" && (COUNTRY_CODES as readonly string[]).includes(v);
}

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  SE: "Sverige",
  DK: "Danmark",
  FI: "Suomi / Finland",
  DE: "Deutschland",
  FR: "France",
  ES: "España",
  OTHER: "Other",
};

// Vilket land ett gränssnittsspråk oftast hör till — används bara som
// förval i formulär, kunden kan alltid ändra.
export function defaultCountryFor(locale: Locale | string): CountryCode {
  switch (locale) {
    case "sv": return "SE";
    case "da": return "DK";
    case "fi": return "FI";
    case "de": return "DE";
    case "fr": return "FR";
    case "es": return "ES";
    default: return "OTHER";
  }
}

// Vi fakturerar i kronor i Sverige och i euro i alla andra länder.
export function billingCurrencyFor(country: string | null | undefined): Currency {
  return country === "SE" || !country ? "SEK" : "EUR";
}
// Kundens EGNA priser på sin sajt (bokningar m.m.) i landets egen valuta.
export function siteCurrencyFor(country: string | null | undefined): Currency {
  if (country === "DK") return "DKK";
  if (country === "SE" || !country) return "SEK";
  return "EUR";
}

export type CompanyIdKind = "orgNumber" | "vatNumber" | "register" | "legalForm" | "capital" | "representative";

// Fälten företaget kan behöva lämna. "label" är den lokala benämningen,
// "hint" visas som exempel. "pattern" är en lös kontroll (inte en riktig
// registerkontroll) som fångar uppenbara felskrivningar.
export type CompanyField = {
  key: CompanyIdKind;
  // Svensk grundtext (nyckel till översättning) + landets egen benämning.
  label: string;
  local?: string;
  hint: string;
  pattern?: RegExp;
  required: boolean;
};

export type CountryRules = {
  code: CountryCode;
  fields: CompanyField[];
};

const VAT = "Momsregistreringsnummer";
const REG_NO = "Registreringsnummer";

export const COUNTRY_RULES: Record<CountryCode, CountryRules> = {
  SE: {
    code: "SE",
    fields: [
      { key: "orgNumber", label: "Organisationsnummer", hint: "556677-8899", pattern: /^\d{6}-?\d{4}$/, required: true },
      { key: "vatNumber", label: VAT, hint: "SE556677889901", pattern: /^SE\d{10}01$/i, required: false },
    ],
  },
  DK: {
    code: "DK",
    fields: [
      { key: "orgNumber", label: REG_NO, local: "CVR-nummer", hint: "12345678", pattern: /^\d{8}$/, required: true },
      { key: "vatNumber", label: VAT, local: "SE-nummer", hint: "DK12345678", pattern: /^DK\d{8}$/i, required: false },
    ],
  },
  FI: {
    code: "FI",
    fields: [
      { key: "orgNumber", label: REG_NO, local: "Y-tunnus", hint: "1234567-8", pattern: /^\d{7}-?\d$/, required: true },
      { key: "vatNumber", label: VAT, local: "ALV-tunnus", hint: "FI12345678", pattern: /^FI\d{8}$/i, required: false },
    ],
  },
  DE: {
    code: "DE",
    fields: [
      { key: "legalForm", label: "Bolagsform", local: "Rechtsform", hint: "GmbH, UG, e.K., Einzelunternehmen", required: true },
      { key: "representative", label: "Firmatecknare / behörig företrädare", local: "Vertretungsberechtigte(r)", hint: "Geschäftsführer: Max Mustermann", required: false },
      { key: "register", label: "Bolagsregister och registernummer", local: "Handelsregister", hint: "Amtsgericht München, HRB 123456", required: false },
      { key: "vatNumber", label: VAT, local: "USt-IdNr.", hint: "DE123456789", pattern: /^DE\d{9}$/i, required: false },
    ],
  },
  FR: {
    code: "FR",
    fields: [
      { key: "legalForm", label: "Bolagsform", local: "Forme juridique", hint: "SAS, SARL, entrepreneur individuel", required: true },
      { key: "orgNumber", label: REG_NO, local: "SIREN", hint: "123 456 789", pattern: /^(\d{3} ?\d{3} ?\d{3}|\d{3} ?\d{3} ?\d{3} ?\d{5})$/, required: true },
      { key: "register", label: "Bolagsregister", local: "RCS", hint: "RCS Paris", required: false },
      { key: "capital", label: "Aktiekapital", local: "Capital social", hint: "10 000 EUR", required: false },
      { key: "vatNumber", label: VAT, local: "N° TVA intracommunautaire", hint: "FR12345678901", pattern: /^FR[0-9A-Z]{2}\d{9}$/i, required: false },
    ],
  },
  ES: {
    code: "ES",
    fields: [
      { key: "orgNumber", label: "Skatte-/bolagsnummer", local: "NIF / CIF", hint: "B12345678", pattern: /^[A-Z]\d{7}[0-9A-J]$|^\d{8}[A-Z]$|^[XYZ]\d{7}[A-Z]$/i, required: true },
      { key: "register", label: "Bolagsregister", local: "Registro Mercantil", hint: "Registro Mercantil de Madrid, tomo …, folio …", required: false },
      { key: "vatNumber", label: VAT, local: "IVA intracomunitario", hint: "ESB12345678", pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/i, required: false },
    ],
  },
  OTHER: {
    code: "OTHER",
    fields: [
      { key: "orgNumber", label: REG_NO, hint: "", required: true },
      { key: "vatNumber", label: VAT, hint: "", required: false },
    ],
  },
};

export function validateCompanyField(country: CountryCode, key: CompanyIdKind, value: string): boolean {
  const f = COUNTRY_RULES[country].fields.find((x) => x.key === key);
  const v = value.trim();
  if (!f) return true;
  if (!v) return !f.required;
  return f.pattern ? f.pattern.test(v.replace(/ /g, " ")) : true;
}
