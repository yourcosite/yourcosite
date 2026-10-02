import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exempel: Björkängens Kök",
  description: "Björkängens Kök — exempel byggt med YourCoSite.",
};

const colors = {
  bg: "#1B120D",
  surface: "#241812",
  ink: "#F5EFE6",
  inkDim: "#BBA88F",
  line: "rgba(245,239,230,0.12)",
  accent: "#E8B14A",
  accentInk: "#241808",
};

export default function RestaurantExamplePage() {
  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        ← Alla exempel
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-6" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <div className="font-serif italic text-[21px]">Björkängens Kök</div>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <span style={{ color: "#fff" }}>Hem</span>
          <span>Meny</span>
          <span>Om oss</span>
          <span>Kontakt</span>
        </nav>
        <div
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka bord
        </div>
      </header>

      <section className="relative">
        <div className="relative h-[420px] md:h-[520px]">
          <Image src="/images/restaurant-hero.jpg" alt="Björkängens Kök" fill className="object-cover opacity-70" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(0deg, ${colors.bg} 0%, rgba(27,18,13,0.3) 60%, rgba(27,18,13,0.6) 100%)` }}
          />
        </div>
        <div className="max-w-2xl mx-auto text-center px-6 -mt-32 relative">
          <div className="text-[12.5px] tracking-[0.1em] mb-4" style={{ color: colors.inkDim }}>
            SEDAN 2014 · ÖSTERGÖTLAND
          </div>
          <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.15] mb-5">
            Säsongens råvaror, enkelt tillagade
          </h1>
          <p className="text-[15.5px] leading-relaxed mb-8" style={{ color: colors.inkDim }}>
            En liten meny som ändras med årstiderna. Lokala leverantörer,
            öppen köksyta, plats för trettio gäster.
          </p>
          <div
            className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            Boka bord →
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20 grid md:grid-cols-3 gap-10">
        {[
          { title: "Lokalt och säsongsbaserat", body: "Råvaror från gårdar vi känner, menyn byts när säsongen gör det." },
          { title: "Öppen köksyta", body: "Se hela tillagningen från ert bord — plats för trettio gäster." },
          { title: "Enkel bordsbokning", body: "Boka online på under en minut, ingen app krävs." },
        ].map((f) => (
          <div key={f.title}>
            <div className="font-serif text-[19px] mb-2.5">{f.title}</div>
            <p className="text-[14px] leading-relaxed" style={{ color: colors.inkDim }}>
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <section
        className="text-center px-6 py-20"
        style={{ borderTop: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}` }}
      >
        <div className="font-serif italic text-[26px] max-w-xl mx-auto leading-relaxed">
          &ldquo;En meny som andas den plats den kommer ifrån.&rdquo;
        </div>
        <div className="text-[13.5px] mt-5" style={{ color: colors.inkDim }}>
          — Köksfilosofin bakom Björkängens Kök
        </div>
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="font-serif text-[26px] mb-6">Nyfiken på kvällens meny?</h2>
        <div
          className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Se hela menyn →
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>Björkängens Kök · Exempelsajt byggd med YourCoSite</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          ← Fler exempel
        </Link>
      </footer>
    </div>
  );
}
