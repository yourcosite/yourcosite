import type { Metadata } from "next";
import Link from "next/link";
import { getT, getLocale } from "@/lib/i18n/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COUNTRIES, HOSTS, hostsFor, type CountryCode } from "@/lib/domainGuides";
import { cleanDomain, requiredRecords } from "@/lib/customDomain";

export function generateMetadata(): Metadata {
  const t = getT();
  return { title: t("Koppla din egen domän"), robots: { index: false } };
}

const DEFAULT_COUNTRY: Record<string, CountryCode> = { sv: "SE", da: "DK", fi: "FI", de: "DE", fr: "FR", es: "ES" };

export default function DomainGuidePage({ searchParams }: { searchParams: { land?: string; host?: string; domain?: string } }) {
  const t = getT();
  const locale = getLocale();
  const country: CountryCode = (COUNTRIES as readonly string[]).includes(searchParams.land || "")
    ? (searchParams.land as CountryCode)
    : DEFAULT_COUNTRY[locale] ?? "OTHER";
  const hosts = hostsFor(country);
  const host = HOSTS.find((h) => h.id === searchParams.host && h.countries.includes(country)) ?? null;
  const domain = cleanDomain(searchParams.domain || "") ?? "dittforetag.se";
  const records = requiredRecords(domain);
  const countryNames: Record<CountryCode, string> = {
    SE: t("Sverige"), DK: t("Danmark"), FI: t("Finland"), DE: t("Tyskland"), FR: t("Frankrike"), ES: t("Spanien"), OTHER: t("Andra länder"),
  };
  const q = (land: string, hostId?: string) =>
    `/guide/egen-doman?land=${land}${hostId ? `&host=${hostId}` : ""}${searchParams.domain ? `&domain=${encodeURIComponent(searchParams.domain)}` : ""}`;

  return (
    <div>
      <Header />
      <section className="bg-surface">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-14">
          <h1 className="text-[32px] font-medium font-serif mb-2">{t("Koppla din egen domän")}</h1>
          <p className="text-[15px] text-ink-dim mb-8">{t("Välj land och ditt webbhotell, så får du stegen för just ditt.")}</p>

          <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-2">{t("Land")}</div>
          <div className="flex flex-wrap gap-2 mb-7">
            {COUNTRIES.map((c) => (
              <Link key={c} href={q(c)} className={`text-[13.5px] font-semibold px-3.5 py-1.5 rounded-full border ${c === country ? "bg-ink text-white border-ink" : "border-line text-ink"}`}>
                {countryNames[c]}
              </Link>
            ))}
          </div>

          <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-2">{t("Webbhotell eller domänleverantör")}</div>
          <div className="flex flex-wrap gap-2 mb-9">
            {hosts.map((h) => (
              <Link key={h.id} href={q(country, h.id)} className={`text-[13.5px] font-semibold px-3.5 py-1.5 rounded-full border ${host?.id === h.id ? "bg-accent text-accent-ink border-accent" : "border-line text-ink"}`}>
                {h.name}
              </Link>
            ))}
          </div>

          {host && (
            <div className="border border-line rounded-2xl p-6">
              <h2 className="text-[20px] font-semibold mb-4">{host.name}</h2>
              <ol className="list-decimal pl-5 flex flex-col gap-3 text-[14.5px] leading-relaxed">
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
                <li>{t("Gå tillbaka till redigeraren, öppna Publicera och klicka Kontrollera igen. När domänen är kopplad får den automatiskt ett säkerhetscertifikat (https).")}</li>
              </ol>
              {host.noteKey === "loopia" && (
                <p className="text-[13px] text-ink-dim mt-4">{t("Hos Loopia kan en CNAME-post inte läggas på själva domänen. Det behövs inte här: använd A-posten för domänen och CNAME-posten bara för www.")}</p>
              )}
              <p className="text-[13px] text-ink-dim mt-4">{t("Har du redan en hemsida på domänen försvinner den när du ändrar posterna. Menynamnen kan se lite annorlunda ut, de ändras ibland hos webbhotellen.")}</p>
              {host.helpUrl && (
                <p className="text-[13px] mt-3">
                  <a href={host.helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{t("Hjälp från {host}", { host: host.name })}</a>
                </p>
              )}
            </div>
          )}

          <p className="text-[14px] text-ink-dim mt-9">
            {t("Kör du fast? Hör av dig så hjälper vi dig.")}{" "}
            <Link href="/kontakt" className="font-semibold underline text-ink">{t("Kontakta oss")}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
