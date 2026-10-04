"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Kontouppgifterna — namn, kontaktväg, företag/faktureringsadress. Bröts ut
// ur den gamla SettingsForm.tsx (som bakade ihop allt på en enda sida) när
// /installningar blev en riktig flik-struktur, se SettingsTabs.tsx.
export default function AccountTab({
  fullName,
  email,
  phone,
  companyName,
  orgNumber,
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
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  billingEmail: string;
}) {
  const [name, setName] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [companyNameValue, setCompanyNameValue] = useState(companyName);
  const [orgNumberValue, setOrgNumberValue] = useState(orgNumber);
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
      setError("Du är inte inloggad.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: phoneValue,
        company_name: companyNameValue,
        org_number: orgNumberValue,
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
      <h1 className="text-[28px] font-medium mb-6.5">Kontouppgifter</h1>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">Namn</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">E-post</label>
          <input
            value={email}
            disabled
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px] bg-bg text-ink-dim"
          />
          <div className="text-[11.5px] text-ink-dim mt-1.5">
            Kontakta support för att byta e-postadress.
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Telefon</label>
          <input
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder="07X – XXX XX XX"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
        <div className="font-semibold text-[15px] mb-4">Företag och fakturering</div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">Företagsnamn</label>
          <input
            value={companyNameValue}
            onChange={(e) => setCompanyNameValue(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">Organisationsnummer</label>
          <input
            value={orgNumberValue}
            onChange={(e) => setOrgNumberValue(e.target.value)}
            placeholder="XXXXXX-XXXX"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">Adress</label>
          <input
            value={addressStreetValue}
            onChange={(e) => setAddressStreetValue(e.target.value)}
            placeholder="Gatuadress"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="flex gap-3 mb-4">
          <div className="w-[120px] flex-shrink-0">
            <label className="block text-[13px] font-semibold mb-1.5">Postnr</label>
            <input
              value={addressPostalCodeValue}
              onChange={(e) => setAddressPostalCodeValue(e.target.value)}
              placeholder="XXX XX"
              className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-semibold mb-1.5">Ort</label>
            <input
              value={addressCityValue}
              onChange={(e) => setAddressCityValue(e.target.value)}
              className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Fakturerings-e-post</label>
          <input
            type="email"
            value={billingEmailValue}
            onChange={(e) => setBillingEmailValue(e.target.value)}
            placeholder="Lämna tomt för att använda kontots e-post"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>

      {error && <div className="text-[13.5px] text-warm font-medium mb-3">{error}</div>}
      {saved && (
        <div className="text-[13.5px] text-ink font-medium mb-3 bg-accent-soft inline-block px-3 py-1.5 rounded-lg">
          Sparat!
        </div>
      )}

      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px] disabled:opacity-60"
        >
          {saving ? "Sparar …" : "Spara ändringar"}
        </button>
      </div>
    </div>
  );
}
