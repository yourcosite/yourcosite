import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exempel: Nordlys Inredning",
  description: "Nordlys Inredning — exempel byggt med YourCoSite.",
};

const colors = {
  bg: "#FAF8F4",
  surface: "#FFFFFF",
  ink: "#2B2A27",
  inkDim: "#8A8780",
  line: "#E6E2D8",
  accent: "#7C8B6F",
  accentInk: "#FFFFFF",
};

export default function InredningExamplePage() {
  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(43,42,39,0.85)", color: "#fff" }}
      >
        ← Alla exempel
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-7" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <div className="font-serif text-[20px] font-medium">Nordlys Inredning</div>
        <nav className="hidden md:flex items-center gap-9 text-[13px] font-semibold tracking-wide" style={{ color: colors.inkDim }}>
          <span style={{ color: colors.ink }}>HEM</span>
          <Link href="/exempel/inredning/kollektion">KOLLEKTION</Link>
          <Link href="/exempel/inredning/vad-vi-gor">VAD VI GÖR</Link>
          <Link href="/exempel/inredning/kontakt">KONTAKT</Link>
        </nav>
        <Link
          href="/exempel/inredning/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka besök
        </Link>
      </header>

      <section className="grid md:grid-cols-2 items-center">
        <div className="px-8 md:px-16 py-16">
          <div className="text-[12.5px] tracking-[0.08em] mb-5" style={{ color: colors.accent }}>
            VÅRKOLLEKTIONEN 2026
          </div>
          <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.15] font-medium mb-5">
            Enkla former, ärliga material
          </h1>
          <p className="text-[15.5px] leading-relaxed mb-8 max-w-[38ch]" style={{ color: colors.inkDim }}>
            Möbler och textil för hem som ska hålla i decennier, inte
            säsonger.
          </p>
          <div
            className="inline-block font-semibold text-[13px] tracking-wide px-7 py-3.5"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            SE KOLLEKTIONEN
          </div>
        </div>
        <div className="relative h-[340px] md:h-[520px]">
          <Image src="/images/inredning-hero.jpg" alt="Nordlys Inredning" fill className="object-cover" />
        </div>
      </section>

      <section className="px-8 md:px-16 py-20 grid md:grid-cols-3 gap-10" style={{ background: colors.surface }}>
        {[
          { title: "Egen kollektion", body: "Formgiven i studion, tillverkad i Europa.", img: "/images/inredning-feature-1.jpg" },
          { title: "Inredningsrådgivning", body: "Boka en stund med vår stylist, i butik eller hemma hos er.", img: "/images/inredning-feature-2.jpg" },
          { title: "Hem hos butiken", body: "Storgatan 12, Motala — öppet alla vardagar.", img: "/images/inredning-feature-3.jpg" },
        ].map((f) => (
          <div key={f.title}>
            <div className="relative h-[170px] rounded-md overflow-hidden mb-4">
              <Image src={f.img} alt={f.title} fill className="object-cover" />
            </div>
            <div className="font-serif text-[18px] mb-2.5">{f.title}</div>
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
        <Image src="/images/inredning-vadvigor-2.jpg" alt="" fill className="object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(43,42,39,0.72) 0%, rgba(43,42,39,0.18) 55%)" }}
        />
        <div className="font-serif italic text-[26px] max-w-xl mx-auto leading-relaxed relative" style={{ color: "#FFFFFF" }}>
          &ldquo;Möbler vi själva skulle vilja ärva.&rdquo;
        </div>
        <div className="text-[13.5px] mt-5 relative" style={{ color: "rgba(255,255,255,0.75)" }}>
          — Formgivningsfilosofin bakom Nordlys
        </div>
      </section>

      <section className="px-8 md:px-16 py-20 grid md:grid-cols-2 gap-14 items-center" style={{ background: colors.surface }}>
        <div className="relative h-[280px] md:h-[380px] order-2 md:order-1">
          <Image src="/images/inredning-product-soffbord-nava.jpg" alt="Soffbord Näva" fill className="object-cover" />
        </div>
        <div className="order-1 md:order-2">
          <div className="text-[12.5px] tracking-[0.08em] mb-4" style={{ color: colors.accent }}>
            HANTVERK OCH MATERIAL
          </div>
          <h2 className="font-serif text-[28px] leading-[1.2] mb-5">Formgivet i studion, tillverkat för att hålla</h2>
          <p className="text-[15px] leading-relaxed mb-6" style={{ color: colors.inkDim }}>
            Varje möbel i vår egen kollektion ritas i studion i Motala och
            tillverkas sedan i mindre europeiska verkstäder vi besökt
            själva — massivt trä, naturliga textilier och beslag som går
            att laga istället för att slänga.
          </p>
          <Link
            href="/exempel/inredning/kollektion"
            className="inline-block font-semibold text-[13px] tracking-wide px-7 py-3.5"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            UTFORSKA KOLLEKTIONEN
          </Link>
        </div>
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="font-serif text-[26px] mb-6">Se hela vårkollektionen</h2>
        <Link
          href="/exempel/inredning/kollektion"
          className="inline-block font-semibold text-[13px] tracking-wide px-7 py-3.5"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          SE KOLLEKTIONEN
        </Link>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>Nordlys Inredning · Exempelsajt byggd med YourCoSite</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          ← Fler exempel
        </Link>
      </footer>
    </div>
  );
}
