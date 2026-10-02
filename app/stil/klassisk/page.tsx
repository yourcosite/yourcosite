import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stilexempel: Klassisk" };

export default function StyleClassicPage() {
  const ink = "#1C2623";
  const inkDim = "#5E6A65";
  const green = "#2F5D50";
  const bg2 = "#F3F6F4";
  const line = "#D6E0DB";

  return (
    <div style={{ background: "#fff", color: ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/onboarding/4"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-1.5 text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-md"
        style={{ background: green }}
      >
        ← Till stilval
      </Link>

      <div className="text-center text-white text-[12.5px] py-2.5 tracking-wide" style={{ background: green }}>
        Rådgivning inom ekonomi, juridik och strategi — sedan grundandet
      </div>

      <header className="flex items-center justify-between px-10 md:px-16 py-6.5" style={{ borderBottom: `1px solid ${line}` }}>
        <div className="font-serif font-semibold text-[21px]" style={{ color: green }}>
          Nordby &amp; Partners
        </div>
        <nav className="hidden md:flex items-center gap-9 text-[14px]" style={{ color: inkDim }}>
          <span className="font-semibold pb-1" style={{ color: green, borderBottom: `2px solid ${green}` }}>
            Hem
          </span>
          <span>Tjänster</span>
          <span>Om oss</span>
          <span>Nyheter</span>
          <span>Kontakt</span>
        </nav>
        <div className="text-[13.5px] font-semibold px-5.5 py-2.5 rounded" style={{ border: `1.5px solid ${green}`, color: green }}>
          Boka möte
        </div>
      </header>

      <section className="flex flex-col md:flex-row items-stretch">
        <div className="flex-1 px-10 md:px-16 py-20 flex flex-col justify-center">
          <div className="text-[13px] font-bold tracking-[0.06em] mb-4.5" style={{ color: green }}>
            SEDAN GRUNDANDET
          </div>
          <h1 className="text-[36px] md:text-[44px] leading-[1.2] font-medium max-w-[480px]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Pålitlig rådgivning, byggd på lång erfarenhet.
          </h1>
          <p className="text-[15.5px] leading-relaxed mt-5 max-w-[440px]" style={{ color: inkDim }}>
            Nordby &amp; Partners hjälper företag och privatpersoner att
            fatta välgrundade beslut — tydligt, strukturerat och utan
            överraskningar.
          </p>
          <div className="mt-7">
            <div className="inline-block text-white font-semibold text-[14.5px] px-7 py-3.5 rounded" style={{ background: green }}>
              Kontakta oss
            </div>
          </div>
        </div>
        <div className="w-full md:w-[380px] h-[220px] md:h-auto flex-shrink-0" style={{ background: bg2 }} />
      </section>

      <div
        className="px-10 md:px-16 py-10 flex items-center justify-between"
        style={{ borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}
      >
        {[
          ["30+", "ÅRS ERFARENHET"],
          ["450", "AKTIVA KUNDER"],
          ["12", "KONTOR I SVERIGE"],
          ["4.9/5", "KUNDBETYG"],
        ].map(([n, l]) => (
          <div key={l} className="flex-1 text-center">
            <div className="text-[26px] font-semibold" style={{ color: green }}>{n}</div>
            <div className="text-[12px] mt-1" style={{ color: inkDim }}>{l}</div>
          </div>
        ))}
      </div>

      <section className="px-10 md:px-16 py-20">
        <div className="text-center mb-11">
          <div className="text-[13px] font-bold tracking-[0.06em] mb-3.5" style={{ color: green }}>
            VÅRA TJÄNSTEOMRÅDEN
          </div>
          <h2 className="text-[26px] font-medium">Helhetslösningar för er verksamhet</h2>
        </div>
        <div className="grid md:grid-cols-3" style={{ gap: "1px", background: line, border: `1px solid ${line}` }}>
          {[
            { title: "Ekonomisk rådgivning", body: "Budget, prognoser och långsiktig planering." },
            { title: "Juridisk rådgivning", body: "Avtal, tvister och regelverk — tydligt förklarat." },
            { title: "Strategisk rådgivning", body: "Vägval för tillväxt, omställning och ägarskifte." },
          ].map((s) => (
            <div key={s.title} className="bg-white p-8">
              <div className="font-semibold text-[17px] mb-2.5" style={{ color: green }}>{s.title}</div>
              <div className="text-[13.5px] leading-relaxed" style={{ color: inkDim }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-10 md:px-16 py-9 text-[13.5px]"
        style={{ background: bg2, color: inkDim }}
      >
        <span>© Nordby &amp; Partners 2026</span>
        <div className="flex gap-7">
          <span>Tjänster</span>
          <span>Om oss</span>
          <span>Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
