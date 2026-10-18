"use client";

import { useT } from "@/components/I18nProvider";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CompanyFields, { type CompanyValues } from "@/components/CompanyFields";
import { isCountry, type CountryCode } from "@/lib/i18n/country";

// Kontouppgifterna — namn, kontaktväg, företag/faktureringsadress. Bröts ut
// ur den gamla SettingsForm.tsx (som bakade ihop allt på en enda sida) när
// /installningar blev en riktig flik-struktur, se SettingsTabs.tsx.
export default function AccountTab({
  fullName,
  email,
  phone,
  companyName,
  orgNumber,
  country,
  extras,
  addressStreet,
  addressPostalCode,
  addressCity,
  billingEmail,
}: {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  orgNumber: string;
  country: string;
  extras: Record<string, string>;
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  billingEmail: string;
}) {
  const t = useT();
  const [name, setName] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [companyNameValue, setCompanyNameValue] = useState(companyName);
  const [countryValue, setCountryValue] = useState<CountryCode>(isCountry(country) ? country : "SE");
  const [company, setCompany] = useState<CompanyValues>({ ...extras, orgNumber });
  const [addressStreetValue, setAddressStreetValue] = useState(addressStreet);
  const [addressPostalCodeValue, setAddressPostalCodeValue] = useState(addressPostalCode);
  const [addressCityValue, setAddressCityValue] = useState(addressCity);
  const [billingEmailValue, setBillingEmailValue] = useState(billingEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t("Du är inte inloggad."));
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: phoneValue,
        company_name: companyNameValue,
        org_number: company.orgNumber ?? "",
        country: countryValue,
        vat_number: company.vatNumber ?? "",
        legal_form: company.legalForm ?? "",
        company_register: company.register ?? "",
        company_capital: company.capital ?? "",
        company_representative: company.representative ?? "",
        address_street: addressStreetValue,
        address_postal_code: addressPostalCodeValue,
        address_city: addressCityValue,
        billing_email: billingEmailValue,
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">{t("Kontouppgifter")}</h1>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">{t("Namn")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">{t("E-post")}</label>
          <input
            value={email}
            disabled
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px] bg-bg text-ink-dim"
          />
          <div className="text-[11.5px] text-ink-dim mt-1.5">
            {t("Kontakta support för att byta e-postadress.")}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">{t("Telefon")}</label>
          <input
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder={t("07X – XXX XX XX")}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
        <div className="font-semibold text-[15px] mb-4">{t("Företag och fakturering")}</div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">{t("Företagsnamn")}</label>
          <input
            value={companyNameValue}
            onChange={(e) => setCompanyNameValue(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4 flex flex-col gap-4">
          <CompanyFields
            country={countryValue}
            onCountry={setCountryValue}
            values={company}
            onChange={(k, v) => setCompany((x) => ({ ...x, [k]: v }))}
            labelClass="block text-[13px] font-semibold mb-1.5"
            inputClass="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">{t("Adress")}</label>
          <input
            value={addressStreetValue}
            onChange={(e) => setAddressStreetValue(e.target.value)}
            placeholder={t("Gatuadress")}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="flex gap-3 mb-4">
          <div className="w-[120px] flex-shrink-0">
            <label className="block text-[13px] font-semibold mb-1.5">{t("Postnr")}</label>
            <input
              value={addressPostalCodeValue}
              onChange={(e) => setAddressPostalCodeValue(e.target.value)}
              placeholder={t("XXX XX")}
              className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-semibold mb-1.5">{t("Ort")}</label>
            <input
              value={addressCityValue}
              onChange={(e) => setAddressCityValue(e.target.value)}
              className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">{t("Fakturerings-e-post")}</label>
          <input
            type="email"
            value={billingEmailValue}
            onChange={(e) => setBillingEmailValue(e.target.value)}
            placeholder={t("Lämna tomt för att använda kontots e-post")}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>

      {error && <div className="text-[13.5px] text-warm font-medium mb-3">{error}</div>}
      {saved && (
        <div className="text-[13.5px] text-ink font-medium mb-3 bg-accent-soft inline-block px-3 py-1.5 rounded-lg">
          {t("Sparat!")}
        </div>
      )}

      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px] disabled:opacity-60"
        >
          {saving ? t("Sparar …") : t("Spara ändringar")}
        </button>
      </div>
    </div>
  );
}
