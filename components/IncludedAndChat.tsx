import { rich } from "@/lib/i18n/rich";
import { msg } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
// Två sektioner för startsidan, under "Så här enkelt är det":
//  1) "Allt ingår" — en bock-lista på vad som följer med. Bara saker som
//     faktiskt finns (se app/priser och SitePreview/edit-routen) — lägg inte
//     till något här som produkten inte kan.
//  2) "Säg det — så görs det" — en uppradning (rullande band) av korta
//     önskemål man kan skriva till Millie i samtalet. Varje rad ska vara
//     något /api/sites/edit faktiskt klarar av.

const included = [
  msg("Egen domän"),
  msg("SSL och hosting"),
  msg("Anpassad för mobil, surfplatta och dator"),
  msg("Cookiebanner där besökaren väljer själv"),
  msg("Integritetspolicy — uppladdad eller genererad"),
  msg("Kontaktformulär där svaren samlas hos er"),
  msg("Besöksstatistik utan cookies"),
  msg("Nyhetsmodul med egna artiklar"),
  msg("Karta, galleri, vanliga frågor och video"),
  msg("Länkar till era sociala medier"),
  msg("Google Analytics och Meta Pixel"),
  msg("Förhandsvisning innan allt går live"),
];

const requestsRowA = [
  msg("Byt rubriken på startsidan"),
  msg("Korta ner texten i Om oss"),
  msg("Skriv om allt på ett vänligare sätt"),
  msg("Lägg till en sida om våra tjänster"),
  msg("Byt bild i första sektionen"),
  msg("Lägg till en sektion med våra omdömen"),
  msg("Gör bara den här rutan orange"),
  msg("Gör knappen grön"),
  msg("Lägg till en vanliga frågor-sektion"),
  msg("Ta bort sidan Priser"),
  msg("Flytta kontakt längst ner"),
  msg("Lägg till ett bildgalleri"),
];

const requestsRowB = [
  msg("Gör Om oss-sidan mörk"),
  msg("Byt till ett serif-typsnitt"),
  msg("Lägg in en karta till butiken"),
  msg("Bädda in vår YouTube-film"),
  msg("Lägg till ett kontaktformulär"),
  msg("Skriv en nyhet om våra nya öppettider"),
  msg("Låt Läs mer länka till kontaktsidan"),
  msg("Koppla på Google Analytics"),
  msg("Byt accentfärg till blå"),
  msg("Lägg till tre rutor med våra tjänster"),
  msg("Gör sidan lite lugnare i tonen"),
  msg("Lägg en knapp som leder till Boka tid"),
];

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="#0C1004"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Ticker({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const t = getT();
  // Listan dubbleras så bandet loopar utan hack; kopian göms för skärmläsare.
  const row = (hidden: boolean) => (
    <ul
      className="flex shrink-0 gap-3 pr-3"
      aria-hidden={hidden || undefined}
    >
      {items.map((line) => (
        <li
          key={line}
          className="whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] text-ink shadow-[0_2px_8px_rgba(23,23,26,0.04)]"
        >
          <span className="text-ink-dim mr-1.5">”</span>
          {t(line)}
          <span className="text-ink-dim ml-0.5">”</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group overflow-hidden">
      <div
        className={`flex w-max motion-reduce:animate-none ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        } group-hover:[animation-play-state:paused]`}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export default function IncludedAndChat() {
  const t = getT();
  return (
    <>
      {/* Allt ingår */}
      <section className="bg-bg">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="text-center mb-10">
            <div className="text-[13px] text-ink-dim tracking-wide font-semibold mb-3">
              {t("ALLT INGÅR")}
            </div>
            <h2 className="text-[28px] md:text-[32px] font-medium">
              {t("Ni behöver inte tänka på något annat")}
            </h2>
            <p className="text-[15.5px] text-ink-dim mt-3 max-w-[48ch] mx-auto">
              {t("Det tekniska och det juridiska är redan löst. Ni berättar bara vad sajten ska säga.")}
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {included.map((line) => (
              <li key={line} className="flex items-start gap-3 text-[15px]">
                <span className="mt-[2px] flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                  <Check />
                </span>
                {t(line)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Säg det — så görs det */}
      <section className="bg-surface border-t border-line">
        <div className="py-16 md:py-20">
          <div className="text-center px-6 mb-10">
            <div className="text-[13px] text-ink-dim tracking-wide font-semibold mb-3">
              {t("ALLT GÅR ATT BE OM")}
            </div>
            <h2 className="text-[28px] md:text-[32px] font-medium">{rich(t, "Säg det — <span>så görs det</span>", { span: (c) => <span className="italic">{c}</span> })}
            </h2>
            <p className="text-[15.5px] text-ink-dim mt-3 max-w-[50ch] mx-auto">
              {t("Texter, bilder, färger, sidor, formulär, nyheter, karta, video… Skriv som ni skulle säga det till en kollega, så ändras sajten direkt.")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Ticker items={requestsRowA} />
            <Ticker items={requestsRowB} reverse />
          </div>
          <p className="text-center text-[14px] text-ink-dim mt-8 px-6">
            {t("…och det är bara början. Ni kan fortsätta be om ändringar hur länge ni vill.")}
          </p>
        </div>
      </section>
    </>
  );
}
