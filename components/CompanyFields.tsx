"use client";

import { useT } from "@/components/I18nProvider";
import { COUNTRY_CODES, COUNTRY_NAMES, COUNTRY_RULES, validateCompanyField, type CompanyIdKind, type CountryCode } from "@/lib/i18n/country";

export type CompanyValues = Partial<Record<CompanyIdKind, string>>;

// Land + de företagsuppgifter landet kräver. Används vid kontoskapande och i
// kontoinställningarna så att varje land får sina egna rätta fält
// (CVR i Danmark, Y-tunnus i Finland, Handelsregister i Tyskland osv.).
export default function CompanyFields({
  country,
  onCountry,
  values,
  onChange,
  inputClass,
  labelClass,
}: {
  country: CountryCode;
  onCountry: (c: CountryCode) => void;
  values: CompanyValues;
  onChange: (key: CompanyIdKind, value: string) => void;
  inputClass: string;
  labelClass: string;
}) {
  const t = useT();
  const rules = COUNTRY_RULES[country];
  return (
    <>
      <div>
        <label htmlFor="country" className={labelClass}>{t("Land")}</label>
        <select id="country" value={country} onChange={(e) => onCountry(e.target.value as CountryCode)} className={inputClass}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>{c === "OTHER" ? t("Annat land") : COUNTRY_NAMES[c]}</option>
          ))}
        </select>
      </div>
      {rules.fields.map((f) => {
        const v = values[f.key] ?? "";
        const bad = v.trim() !== "" && !validateCompanyField(country, f.key, v);
        return (
          <div key={f.key}>
            <label htmlFor={`cf-${f.key}`} className={labelClass}>
              {t(f.label)}
              {f.local ? ` (${f.local})` : ""}
              {f.required ? "" : ` – ${t("valfritt")}`}
            </label>
            <input
              id={`cf-${f.key}`}
              type="text"
              value={v}
              placeholder={f.hint}
              onChange={(e) => onChange(f.key, e.target.value)}
              className={inputClass}
              aria-invalid={bad || undefined}
            />
            {bad && <p className="text-[12px] text-red-600 mt-1">{t("Det här ser inte ut som rätt format.")}</p>}
          </div>
        );
      })}
    </>
  );
}
