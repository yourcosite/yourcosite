// Två sektioner för startsidan, under "Så här enkelt är det":
//  1) "Allt ingår" — en bock-lista på vad som följer med. Bara saker som
//     faktiskt finns (se app/priser och SitePreview/edit-routen) — lägg inte
//     till något här som produkten inte kan.
//  2) "Säg det — så görs det" — en uppradning (rullande band) av korta
//     önskemål man kan skriva till Millie i samtalet. Varje rad ska vara
//     något /api/sites/edit faktiskt klarar av.

const included = [
  "Egen domän",
  "SSL och hosting",
  "Anpassad för mobil, surfplatta och dator",
  "Cookiebanner där besökaren väljer själv",
  "Integritetspolicy — uppladdad eller genererad",
  "Kontaktformulär där svaren samlas hos er",
  "Besöksstatistik utan cookies",
  "Nyhetsmodul med egna artiklar",
  "Karta, galleri, vanliga frågor och video",
  "Länkar till era sociala medier",
  "Google Analytics och Meta Pixel",
  "Förhandsvisning innan allt går live",
];

const requestsRowA = [
  "Byt rubriken på startsidan",
  "Korta ner texten i Om oss",
  "Skriv om allt på ett vänligare sätt",
  "Lägg till en sida om våra tjänster",
  "Byt bild i första sektionen",
  "Lägg till en sektion med våra omdömen",
  "Gör bara den här rutan orange",
  "Gör knappen grön",
  "Lägg till en vanliga frågor-sektion",
  "Ta bort sidan Priser",
  "Flytta kontakt längst ner",
  "Lägg till ett bildgalleri",
];

const requestsRowB = [
  "Gör Om oss-sidan mörk",
  "Byt till ett serif-typsnitt",
  "Lägg in en karta till butiken",
  "Bädda in vår YouTube-film",
  "Lägg till ett kontaktformulär",
  "Skriv en nyhet om våra nya öppettider",
  "Låt Läs mer länka till kontaktsidan",
  "Koppla på Google Analytics",
  "Byt accentfärg till blå",
  "Lägg till tre rutor med våra tjänster",
  "Gör sidan lite lugnare i tonen",
  "Lägg en knapp som leder till Boka tid",
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
  // Listan dubbleras så bandet loopar utan hack; kopian göms för skärmläsare.
  const row = (hidden: boolean) => (
    <ul
      className="flex shrink-0 gap-3 pr-3"
      aria-hidden={hidden || undefined}
    >
      {items.map((t) => (
        <li
          key={t}
          className="whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] text-ink shadow-[0_2px_8px_rgba(23,23,26,0.04)]"
        >
          <span className="text-ink-dim mr-1.5">”</span>
          {t}
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
  return (
    <>
      {/* Allt ingår */}
      <section className="bg-bg">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="text-center mb-10">
            <div className="text-[13px] text-ink-dim tracking-wide font-semibold mb-3">
              ALLT INGÅR
            </div>
            <h2 className="text-[28px] md:text-[32px] font-medium">
              Ni behöver inte tänka på något annat
            </h2>
            <p className="text-[15.5px] text-ink-dim mt-3 max-w-[48ch] mx-auto">
              Det tekniska och det juridiska är redan löst. Ni berättar bara
              vad sajten ska säga.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {included.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[15px]">
                <span className="mt-[2px] flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                  <Check />
                </span>
                {t}
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
              ALLT GÅR ATT BE OM
            </div>
            <h2 className="text-[28px] md:text-[32px] font-medium">
              Säg det —{" "}
              <span className="italic">så görs det</span>
            </h2>
            <p className="text-[15.5px] text-ink-dim mt-3 max-w-[50ch] mx-auto">
              Texter, bilder, färger, sidor, formulär, nyheter, karta, video…
              Skriv som ni skulle säga det till en kollega, så ändras sajten
              direkt.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Ticker items={requestsRowA} />
            <Ticker items={requestsRowB} reverse />
          </div>
          <p className="text-center text-[14px] text-ink-dim mt-8 px-6">
            …och det är bara början. Ni kan fortsätta be om ändringar hur länge
            ni vill.
          </p>
        </div>
      </section>
    </>
  );
}
