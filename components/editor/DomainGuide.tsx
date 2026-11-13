"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { COUNTRIES, HOSTS, hostsFor, type CountryCode } from "@/lib/domainGuides";

// Steg-för-steg per webbhotell, direkt i Publicera-fönstret under domänen.
export default function DomainGuide({
  domain,
  records,
  locale,
}: {
  domain: string;
  records: { type: string; name: string; value: string }[];
  locale: string;
}) {
  const t = useT();
  const defaults: Record<string, CountryCode> = { sv: "SE", da: "DK", fi: "FI", de: "DE", fr: "FR", es: "ES" };
  const [country, setCountry] = useState<CountryCode>(defaults[locale] ?? "OTHER");
  const [hostId, setHostId] = useState("");
  const hosts = hostsFor(country);
  const host = HOSTS.find((h) => h.id === hostId && h.countries.includes(country)) ?? null;
  const names: Record<CountryCode, string> = {
    SE: t("Sverige"), DK: t("Danmark"), FI: t("Finland"), DE: t("Tyskland"), FR: t("Frankrike"), ES: t("Spanien"), OTHER: t("Andra länder"),
  };
  const pill = (on: boolean) =>
    `text-[12.5px] font-semibold px-3 py-1 rounded-full border ${on ? "bg-ink text-white border-ink" : "border-line text-ink"}`;

  return (
    <div className="border border-line rounded-xl p-4 mb-3 bg-bg">
      <div className="font-semibold text-[14px] mb-2">{t("Så här gör du hos ditt webbhotell")}</div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {COUNTRIES.map((c) => (
          <button key={c} type="button" onClick={() => { setCountry(c); setHostId(""); }} className={pill(c === country)}>{names[c]}</button>
        ))}
      </div>
      <div className="text-[12px] text-ink-dim mb-1.5">{t("Webbhotell eller domänleverantör")}</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {hosts.map((h) => (
          <button key={h.id} type="button" onClick={() => setHostId(h.id)} className={pill(h.id === hostId)}>{h.name}</button>
        ))}
      </div>
      {host && (
        <ol className="list-decimal pl-5 flex flex-col gap-2 text-[13px] leading-relaxed">
          <li>{t("Logga in hos {host} och öppna domänen {domain}.", { host: host.name, domain })}</li>
          <li>
            {host.path
              ? t("Gå till DNS-inställningarna för domänen: {path}.", { path: host.path })
              : t("Öppna DNS-inställningarna (DNS-zonen) för domänen. Hittar du dem inte, sök efter DNS i hjälpen hos {host}.", { host: host.name })}
          </li>
          <li>{t("Ta bort gamla poster för samma namn som pekar någon annanstans, till exempel en gammal A-post för @ eller en CNAME-post för www. Rör inte MX-poster, de styr din e-post.")}</li>
          {records.map((r) => (
            <li key={r.type + r.name}>
              {r.type === "A"
                ? t("Lägg till en A-post med namn {name} och värde {value}.", { name: r.name, value: r.value })
                : t("Lägg till en CNAME-post med namn {name} och värde {value}.", { name: r.name, value: r.value })}
            </li>
          ))}
          <li>{t("Spara. Det kan ta från några minuter upp till ett dygn innan ändringen slår igenom.")}</li>
          <li className="font-semibold">{t("Klicka sedan på Kontrollera igen här nedanför, så ser du direkt om kopplingen fungerar.")}</li>
        </ol>
      )}
      {host?.noteKey === "loopia" && (
        <p className="text-[12.5px] text-ink-dim mt-3">{t("Hos Loopia kan en CNAME-post inte läggas på själva domänen. Det behövs inte här: använd A-posten för domänen och CNAME-posten bara för www.")}</p>
      )}
      {host?.helpUrl && (
        <p className="text-[12.5px] mt-2"><a href={host.helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{t("Hjälp från {host}", { host: host.name })}</a></p>
      )}
    </div>
  );
}
