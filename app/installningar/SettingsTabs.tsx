"use client";

import { useT } from "@/components/I18nProvider";
import { msg, type Locale } from "@/lib/i18n/config";
import { useState } from "react";
import AccountTab from "./AccountTab";
import NotificationsTab from "./NotificationsTab";
import PasswordTab from "./PasswordTab";
import DeleteAccountTab from "./DeleteAccountTab";

type Tab = "konto" | "losenord" | "notiser" | "radera";

const TABS: { id: Tab; label: string; danger?: boolean }[] = [
  { id: "konto", label: msg("Konto") },
  { id: "losenord", label: msg("Lösenord") },
  { id: "notiser", label: msg("Notiser") },
  { id: "radera", label: msg("Ta bort konto"), danger: true },
];

// Sidomenyns flikar var tidigare statiska <a>-taggar utan href/onClick —
// bara "Konto" gick faktiskt att se, de andra tre gjorde ingenting alls.
// Nu en riktig klient-sida flik-växlare, samma sida (inga separata routes
// behövs, ingen av flikarna är tung nog att motivera det).
export default function SettingsTabs({
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
  language,
  notifyChangesPublished,
  notifyBilling,
  notifyTips,
  siteCount,
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
  language: Locale;
  notifyChangesPublished: boolean;
  notifyBilling: boolean;
  notifyTips: boolean;
  siteCount: number;
}) {
  const t = useT();
  const [active, setActive] = useState<Tab>("konto");

  return (
    <>
      <div className="w-[170px] flex-shrink-0 hidden md:flex flex-col gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`text-left px-3 py-2 rounded-lg text-[13.5px] font-semibold ${tab.danger ? "mt-3.5" : ""} ${
              active === tab.id
                ? tab.danger
                  ? "bg-warm/10 text-warm"
                  : "bg-accent-soft text-ink"
                : tab.danger
                ? "text-warm"
                : "text-ink-dim"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {active === "konto" && (
        <AccountTab
          fullName={fullName}
          email={email}
          phone={phone}
          companyName={companyName}
          orgNumber={orgNumber}
          country={country}
          extras={extras}
          addressStreet={addressStreet}
          addressPostalCode={addressPostalCode}
          addressCity={addressCity}
          billingEmail={billingEmail}
        />
      )}
      {active === "losenord" && <PasswordTab />}
      {active === "notiser" && (
        <NotificationsTab
          language={language}
          notifyChangesPublished={notifyChangesPublished}
          notifyBilling={notifyBilling}
          notifyTips={notifyTips}
        />
      )}
      {active === "radera" && <DeleteAccountTab siteCount={siteCount} />}
    </>
  );
}
