import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stilexempel: Minimalistisk" };

export default function StyleMinimalPage() {
  return (
    <div style={{ background: "#fff", color: "#17171A", fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/onboarding/4"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-1.5 bg-ink text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
      >
        ← Till stilval
      </Link>

      <header className="flex items-center justify-between px-10 md:px-16 py-7" style={{ borderBottom: "1px solid #F0EEEA" }}>
        <div className="font-serif font-semibold text-[20px]">Nordby</div>
        <nav className="hidden md:flex items-center gap-10 text-[14px]" style={{ color: "#6B6A66" }}>
          <span>Tjänster</span>
          <span>Om oss</span>
          <span>Arbete</span>
          <span>Kontakt</span>
        </nav>
        <div className="text-[13.5px] font-semibold border border-ink px-5 py-2 rounded-full">
          Boka möte
        </div>
      </header>

      <section className="px-10 md:px-16 py-24 text-center max-w-3xl mx-auto">
        <div className="text-[13px] tracking-[0.08em] mb-5" style={{ color: "#6B6A66" }}>
          RÅDGIVNING MED FOKUS PÅ RESULTAT
        </div>
        <h1 className="font-serif text-[42px] md:text-[58px] leading-[1.1] font-medium">
          Vi hjälper er
          <br />
          tänka klart.
        </h1>
        <p className="text-[17px] leading-relaxed mt-6 max-w-[480px] mx-auto" style={{ color: "#6B6A66" }}>
          Nordby är en liten, fokuserad byrå. Vi tar ett uppdrag i taget —
          och gör det ordentligt.
        </p>
        <div className="mt-9 flex gap-3.5 justify-center">
          <div className="bg-ink text-white font-semibold text-[14.5px] px-7.5 py-3.5 rounded-full">
            Boka ett samtal
          </div>
          <div className="font-semibold text-[14.5px] py-3.5 px-2.5" style={{ color: "#6B6A66" }}>
            Se vårt arbete →
          </div>
        </div>
      </section>

      <div className="px-10 md:px-16 pb-20">
        <div className="h-[280px] md:h-[460px] rounded" style={{ background: "#F2F0EC" }} />
      </div>

      <section className="px-10 md:px-16 py-20 grid md:grid-cols-3 gap-14" style={{ borderTop: "1px solid #F0EEEA" }}>
        {[
          { n: "01", title: "Strategi", body: "Vi börjar alltid med frågan: vad vill ni egentligen uppnå?" },
          { n: "02", title: "Design", body: "Enkla lösningar är nästan alltid de som håller längst." },
          { n: "03", title: "Leverans", body: "Vi stannar kvar tills det faktiskt fungerar i verkligheten." },
        ].map((f) => (
          <div key={f.n}>
            <div className="text-[13px] mb-2.5" style={{ color: "#6B6A66" }}>{f.n}</div>
            <div className="font-semibold text-[18px] mb-2.5">{f.title}</div>
            <div className="text-[14.5px] leading-relaxed" style={{ color: "#6B6A66" }}>{f.body}</div>
          </div>
        ))}
      </section>

      <section className="px-10 md:px-16 py-20 text-center" style={{ borderTop: "1px solid #F0EEEA" }}>
        <div className="font-serif italic text-[26px] max-w-xl mx-auto leading-relaxed">
          &ldquo;Nordby gjorde om hela vårt sätt att tänka kring
          varumärket — utan att krångla till det.&rdquo;
        </div>
        <div className="text-[13.5px] mt-5" style={{ color: "#6B6A66" }}>
          Maria Lindqvist, VD
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-10 md:px-16 py-9 text-[13.5px]"
        style={{ borderTop: "1px solid #F0EEEA", color: "#6B6A66" }}
      >
        <span>© Nordby 2026</span>
        <div className="flex gap-7">
          <span>Tjänster</span>
          <span>Om oss</span>
          <span>Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
