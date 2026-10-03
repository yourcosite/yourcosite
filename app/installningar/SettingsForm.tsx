"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const initialToggles = [
  { id: "changes", label: "Ändringar publicerade", desc: "Mejl varje gång en ändring går live", on: true },
  { id: "billing", label: "Fakturering", desc: "Kvitton och betalpåminnelser", on: true },
  { id: "tips", label: "Tips och nyheter", desc: "Då och då, inget skräppost", on: false },
];

export default function SettingsForm({
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
  const [toggles, setToggles] = useState(initialToggles);
  const [lang, setLang] = useState<"sv" | "en">("sv");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setToggles((ts) => ts.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));

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

      <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
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

      <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
        <div className="font-semibold text-[15px] mb-4">Språk</div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setLang("sv")}
            className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold ${
              lang === "sv" ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"
            }`}
          >
            Svenska
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold ${
              lang === "en" ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"
            }`}
          >
            English
          </button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
        <div className="font-semibold text-[15px] mb-4">E-postnotiser</div>
        {toggles.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-b-0">
            <div>
              <div className="text-[13.5px] font-semibold">{t.label}</div>
              <div className="text-[12px] text-ink-dim mt-0.5">{t.desc}</div>
            </div>
            <button
              onClick={() => toggle(t.id)}
              aria-label={t.label}
              className="w-[42px] h-6 rounded-full relative flex-shrink-0"
              style={{ background: t.on ? "#C6FF5E" : "#D9D6CE" }}
            >
              <div
                className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all"
                style={{ left: t.on ? "21px" : "3px" }}
              />
            </button>
          </div>
        ))}
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
