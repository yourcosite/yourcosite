import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exempel: Ekfast Snickeri",
  description: "Ekfast Snickeri — exempel byggt med YourCoSite.",
};

const colors = {
  bg: "#14201A",
  surface: "#1B2921",
  ink: "#F2EFE6",
  inkDim: "#9FAE9E",
  line: "rgba(242,239,230,0.12)",
  accent: "#C9B27C",
  accentInk: "#1B2921",
};

export default function SnickeriExamplePage() {
  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
      >
        ← Alla exempel
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-6" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <div className="font-serif text-[21px] font-medium">Ekfast Snickeri</div>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <span style={{ color: "#fff" }}>Hem</span>
          <Link href="/exempel/snickeri/vad-vi-gor">Vad vi gör</Link>
          <Link href="/exempel/snickeri/referensprojekt">Referensprojekt</Link>
          <Link href="/exempel/snickeri/kontakt">Kontakt</Link>
        </nav>
        <Link
          href="/exempel/snickeri/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-md"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Begär offert
        </Link>
      </header>

      <section className="relative">
        <div className="relative h-[420px] md:h-[520px]">
          <Image src="/images/snickeri-hero.jpg" alt="Ekfast Snickeri" fill className="object-cover opacity-80" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(0deg, ${colors.bg} 10%, rgba(20,32,26,0.2) 55%, rgba(20,32,26,0.55) 100%)` }}
          />
        </div>
        <div className="max-w-2xl mx-auto text-center px-6 -mt-32 relative">
          <div className="text-[12.5px] tracking-[0.1em] mb-4" style={{ color: colors.inkDim }}>
            SNICKERI SEDAN 1991
          </div>
          <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.15] mb-5">
            Hantverk som håller i generationer
          </h1>
          <p className="text-[15.5px] leading-relaxed mb-8" style={{ color: colors.inkDim }}>
            Kök, möbler och renoveringar — byggda för hand, i eget verkstad
            utanför Motala.
          </p>
          <div
            className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-md"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            Begär offert →
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20 grid md:grid-cols-3 gap-10">
        {[
          { title: "Skräddarsydda kök", body: "Ritade efter ert utrymme, inte tvärtom.", img: "/images/snickeri-feature-1.jpg" },
          { title: "Möbelsnickeri", body: "Bord, bänkar och förvaring i massivt trä.", img: "/images/snickeri-feature-2.jpg" },
          { title: "Renovering", body: "Från gamla golv till hela tillbyggnader.", img: "/images/snickeri-feature-3.jpg" },
        ].map((f) => (
          <div key={f.title}>
            <div className="relative h-[130px] rounded-lg overflow-hidden mb-4">
              <Image src={f.img} alt={f.title} fill className="object-cover" />
            </div>
            <div className="font-serif text-[19px] mb-2.5">{f.title}</div>
            <p className="text-[14px] leading-relaxed" style={{ color: colors.inkDim }}>
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <section
        className="relative text-center px-6 py-20"
        style={{ borderTop: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}` }}
      >
        <Image src="/images/snickeri-quote-bg.jpg" alt="" fill className="object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(20,32,26,0.7) 0%, rgba(20,32,26,0.1) 55%)" }}
        />
        <div className="font-serif italic text-[26px] max-w-xl mx-auto leading-relaxed relative">
          &ldquo;Vi bygger sånt som ska hålla i generationer, inte
          säsonger.&rdquo;
        </div>
        <div className="text-[13.5px] mt-5 relative" style={{ color: colors.inkDim }}>
          — Hantverksfilosofin bakom Ekfast
        </div>
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="font-serif text-[26px] mb-6">Nyfiken på vad vi byggt förut?</h2>
        <Link
          href="/exempel/snickeri/referensprojekt"
          className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-md"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Se referensprojekt →
        </Link>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>Ekfast Snickeri · Exempelsajt byggd med YourCoSite</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          ← Fler exempel
        </Link>
      </footer>
    </div>
  );
}
