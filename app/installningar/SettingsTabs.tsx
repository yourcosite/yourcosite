"use client";

import { useState } from "react";
import AccountTab from "./AccountTab";
import NotificationsTab from "./NotificationsTab";
import PasswordTab from "./PasswordTab";
import DeleteAccountTab from "./DeleteAccountTab";

type Tab = "konto" | "losenord" | "notiser" | "radera";

const TABS: { id: Tab; label: string; danger?: boolean }[] = [
  { id: "konto", label: "Konto" },
  { id: "losenord", label: "Lösenord" },
  { id: "notiser", label: "Notiser" },
  { id: "radera", label: "Ta bort konto", danger: true },
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
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  billingEmail: string;
  language: "sv" | "en";
  notifyChangesPublished: boolean;
  notifyBilling: boolean;
  notifyTips: boolean;
  siteCount: number;
}) {
  const [active, setActive] = useState<Tab>("konto");

  return (
    <>
      <div className="w-[170px] flex-shrink-0 hidden md:flex flex-col gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`text-left px-3 py-2 rounded-lg text-[13.5px] font-semibold ${t.danger ? "mt-3.5" : ""} ${
              active === t.id
                ? t.danger
                  ? "bg-warm/10 text-warm"
                  : "bg-accent-soft text-ink"
                : t.danger
                ? "text-warm"
                : "text-ink-dim"
            }`}
          >
            {t.label}
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
