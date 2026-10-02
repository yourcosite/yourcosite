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
          <span>KOLLEKTION</span>
          <span>VAD VI GÖR</span>
          <span>KONTAKT</span>
        </nav>
        <div
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka besök
        </div>
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
          { title: "Egen kollektion", body: "Formgiven i studion, tillverkad i Europa." },
          { title: "Inredningsrådgivning", body: "Boka en stund med vår stylist, i butik eller hemma hos er." },
          { title: "Hem hos butiken", body: "Storgatan 12, Motala — öppet alla vardagar." },
        ].map((f) => (
          <div key={f.title}>
            <div className="font-serif text-[18px] mb-2.5">{f.title}</div>
            <p className="text-[14px] leading-relaxed" style={{ color: colors.inkDim }}>
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="font-serif text-[26px] mb-6">Se hela vårkollektionen</h2>
        <div
          className="inline-block font-semibold text-[13px] tracking-wide px-7 py-3.5"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          SE KOLLEKTIONEN
        </div>
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
