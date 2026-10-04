import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exempel: Studio Lind",
  description: "Studio Lind — exempel byggt med YourCoSite, i stilvarianten \"Redaktionell och bildrik\".",
};

const colors = {
  bg: "#FBF4ED",
  surface: "#FFFFFF",
  ink: "#3A2E22",
  inkDim: "#8A7A68",
  line: "rgba(58,46,34,0.12)",
  accent: "#8A6F57",
  dark: "#231B14",
  darkInkDim: "rgba(245,239,230,0.72)",
};

export default function StudioLindExamplePage() {
  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-20 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        ← Alla exempel
      </Link>

      {/* Hero — fullbredsbild med meny flytande ovanpå, stor rubrik i
          blandad stil (rak rad + kursiv rad) och en nyckeltalsrad nertill,
          precis mönstret från referensskärmdumpen. */}
      <section className="relative">
        <div className="relative h-[640px] md:h-[760px]">
          <Image src="/images/inredning-hero.jpg" alt="Studio Lind" fill priority className="object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(23,17,10,0.55) 0%, rgba(23,17,10,0.15) 32%, rgba(23,17,10,0.35) 75%, rgba(23,17,10,0.75) 100%)" }}
          />

          <header className="relative flex items-center justify-between px-8 md:px-16 py-7 text-white">
            {/* ml-28: lämnar plats för den flytande "← Alla exempel"-knappen
                (fixed top-5 left-5) som annars skär genom loggan här, eftersom
                headern (till skillnad från de andra exempelsidorna) ligger
                ovanpå själva herobilden istället för en egen rad under. */}
            <div className="text-[15px] font-semibold tracking-[0.18em] ml-28">STUDIO LIND</div>
            <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>
              <span style={{ color: "#fff" }}>Hem</span>
              <span>Om oss</span>
              <span>Tjänster</span>
              <span>Projekt</span>
              <span>Kontakt</span>
            </nav>
            <div
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
              style={{ background: "#fff", color: colors.ink }}
            >
              Boka möte →
            </div>
          </header>

          <div className="relative px-8 md:px-16 mt-20 md:mt-28 text-white max-w-xl">
            <div className="text-[12px] tracking-[0.14em] font-semibold mb-5" style={{ color: "rgba(255,255,255,0.85)" }}>
              EN VACKRARE VARDAG
            </div>
            <h1 className="font-serif leading-[1.08] text-[44px] md:text-[62px] mb-6">
              Ditt hem,
              <br />
              <span className="italic">format med omsorg</span>
            </h1>
            <p className="text-[16px] leading-relaxed mb-9" style={{ color: "rgba(255,255,255,0.85)" }}>
              Studio Lind är inredningsarkitekten för dig som vill ha ett hem som
              känns lika bra som det ser ut — ritat efter ditt liv, inte efter
              en trend.
            </p>
            <div className="flex items-center gap-5">
              <div
                className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
                style={{ background: "#fff", color: colors.ink }}
              >
                Boka konsultation
              </div>
              <span className="text-[13.5px] font-semibold border-b border-white/50 pb-0.5">
                Se vårt arbete
              </span>
            </div>
          </div>

          <div className="relative px-8 md:px-16 mt-16 md:mt-20 pb-10 flex flex-wrap items-center gap-6 md:gap-10 text-white">
            {[
              { value: "Sedan 2011", label: "i Linköping" },
              { value: "120+", label: "genomförda projekt" },
              { value: "Familjeägt", label: "två generationer" },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? "pl-6 md:pl-10 border-l border-white/25" : ""}>
                <div className="text-[18px] font-serif font-semibold">{s.value}</div>
                <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bildkollage-sektion — text + tre överlappande bilder, samma
          komposition som hero-layouten "collage" i själva produkten. */}
      <section className="max-w-6xl mx-auto px-8 md:px-16 py-24 md:py-28 grid md:grid-cols-2 gap-14 md:gap-20 items-center">
        <div className="relative h-[420px] md:h-[480px] order-2 md:order-1">
          <div className="absolute left-0 top-0 w-[42%] h-[48%] rounded-2xl overflow-hidden shadow-[0_18px_36px_rgba(58,46,34,0.18)]">
            <Image src="/images/inredning-product-soffbord-nava.jpg" alt="" fill className="object-cover" />
          </div>
          <div className="absolute right-0 top-[8%] w-[58%] h-[76%] rounded-2xl overflow-hidden shadow-[0_26px_50px_rgba(58,46,34,0.22)] z-10">
            <Image src="/images/inredning-vadvigor-1.jpg" alt="" fill className="object-cover" />
          </div>
          <div className="absolute left-[10%] bottom-0 w-[34%] h-[34%] rounded-xl overflow-hidden shadow-[0_14px_28px_rgba(58,46,34,0.18)] border-4 border-white z-20">
            <Image src="/images/inredning-vadvigor-3.jpg" alt="" fill className="object-cover" />
          </div>
          <div
            className="absolute -right-2 -bottom-6 md:right-4 md:-bottom-8 text-[13px] italic z-30 rotate-[-3deg]"
            style={{ color: colors.inkDim }}
          >
            Varje rum, ritat för hand
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px" style={{ background: colors.accent }} />
            <span className="text-[11.5px] tracking-[0.14em] font-semibold" style={{ color: colors.inkDim }}>
              SÅ ARBETAR VI
            </span>
          </div>
          <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.12] mb-5">
            Design utan
            <br />
            <span className="italic">genvägar</span>
          </h2>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: colors.inkDim, maxWidth: 420 }}>
            Från första skiss till sista textil — vi tar hela ansvaret för
            helheten, så du slipper hålla ihop hantverkare, leverantörer och
            tidsplaner själv.
          </p>
          <div
            className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
            style={{ background: colors.ink, color: "#fff" }}
          >
            Utforska tjänster →
          </div>
        </div>
      </section>

      {/* Mörk sektion — tre bildkort med text ovanpå, samma känsla som
          referensens "Create. Customize. Grow."-sektion. */}
      <section className="px-8 md:px-16 py-24 md:py-28" style={{ background: colors.dark, color: "#fff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px" style={{ background: "#C9A77C" }} />
            <span className="text-[11.5px] tracking-[0.14em] font-semibold" style={{ color: colors.darkInkDim }}>
              ALLT DU BEHÖVER
            </span>
          </div>
          <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.15] mb-3 max-w-lg">
            Rita. Möblera. Flytta in.
          </h2>
          <p className="text-[15px] mb-12 max-w-md" style={{ color: colors.darkInkDim }}>
            Tre steg, en kontaktperson genom hela resan.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: "Rumsritningar", body: "Skalenliga ritningar anpassade efter hur du faktiskt lever.", img: "/images/inredning-feature-1.jpg" },
              { title: "Personlig stilguidning", body: "Vi sätter en palett och en riktning du känner igen dig i.", img: "/images/inredning-feature-2.jpg" },
              { title: "Installation på plats", body: "Vi monterar och styler — du kommer hem till ett färdigt rum.", img: "/images/inredning-feature-3.jpg" },
            ].map((f) => (
              <div key={f.title} className="relative h-[280px] rounded-2xl overflow-hidden">
                <Image src={f.img} alt={f.title} fill className="object-cover" />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.05) 55%)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="font-serif text-[19px] mb-1.5">{f.title}</div>
                  <p className="text-[13px] leading-relaxed opacity-85">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="font-serif text-[26px] mb-6">Redo att börja rita på ditt rum?</h2>
        <div
          className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
          style={{ background: colors.ink, color: "#fff" }}
        >
          Boka kostnadsfri konsultation →
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>Studio Lind · Exempelsajt byggd med YourCoSite</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          ← Fler exempel
        </Link>
      </footer>
    </div>
  );
}
