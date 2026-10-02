import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt — Nordlys Inredning",
  description: "Hitta till butiken — Nordlys Inredning, exempel byggt med YourCoSite.",
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

export default function InredningKontaktPage() {
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
        <Link href="/exempel/inredning" className="font-serif text-[20px] font-medium">
          Nordlys Inredning
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13px] font-semibold tracking-wide" style={{ color: colors.inkDim }}>
          <Link href="/exempel/inredning">HEM</Link>
          <Link href="/exempel/inredning/kollektion">KOLLEKTION</Link>
          <Link href="/exempel/inredning/vad-vi-gor">VAD VI GÖR</Link>
          <span style={{ color: colors.ink }}>KONTAKT</span>
        </nav>
        <span
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka besök
        </span>
      </header>

      <section className="grid md:grid-cols-2">
        <div className="relative h-[280px] md:h-auto">
          <Image src="/images/inredning-kontakt-banner.jpg" alt="Nordlys Inredning, butiken" fill className="object-cover" />
        </div>
        <div className="px-8 md:px-16 py-16">
          <div className="text-[12.5px] tracking-[0.08em] mb-3" style={{ color: colors.accent }}>
            BESÖK OSS
          </div>
          <h1 className="font-serif text-[30px] md:text-[34px] font-medium mb-7">
            Hitta till butiken
          </h1>

          <div className="flex flex-col gap-5 mb-8">
            <div>
              <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
                ADRESS
              </div>
              <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
                Storgatan 12<br />591 22 Motala
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
                ÖPPETTIDER
              </div>
              <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
                Mån–fre 10–18, lör 10–15
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
                KONTAKT
              </div>
              <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
                0141 – 200 00<br />hej@nordlysinredning.se
              </div>
            </div>
          </div>

          <div className="text-[12.5px] font-bold tracking-[0.08em] mb-3" style={{ color: colors.ink }}>
            PRENUMERERA PÅ NYHETSBREVET
          </div>
          <div className="flex gap-2 max-w-sm">
            <input
              placeholder="E-postadress"
              className="flex-1 px-3.5 py-3 text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}` }}
            />
            <button
              type="button"
              className="px-5 py-3 text-[13px] font-semibold"
              style={{ background: colors.accent, color: colors.accentInk }}
            >
              Skicka
            </button>
          </div>
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
