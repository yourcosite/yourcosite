import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt — Ekfast Snickeri",
  description: "Begär offert — Ekfast Snickeri, exempel byggt med YourCoSite.",
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

export default function SnickeriKontaktPage() {
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
        <Link href="/exempel/snickeri" className="font-serif text-[21px] font-medium">
          Ekfast Snickeri
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <Link href="/exempel/snickeri">Hem</Link>
          <Link href="/exempel/snickeri/vad-vi-gor">Vad vi gör</Link>
          <Link href="/exempel/snickeri/referensprojekt">Referensprojekt</Link>
          <span style={{ color: "#fff" }}>Kontakt</span>
        </nav>
        <span
          className="text-[13px] font-semibold px-5 py-2.5 rounded-md"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Begär offert
        </span>
      </header>

      <div className="relative h-[200px]">
        <Image src="/images/snickeri-kontakt-banner.jpg" alt="" fill className="object-cover opacity-70" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "rgba(20,32,26,0.5)" }}
        >
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            VERKSTADEN
          </div>
          <h1 className="font-serif text-[30px] md:text-[36px]">Kom förbi och se hur vi jobbar</h1>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-16 grid md:grid-cols-[1.3fr_1fr] gap-12">
        <div className="rounded-2xl p-7" style={{ background: colors.surface }}>
          <div className="text-[12.5px] tracking-[0.1em] mb-2" style={{ color: colors.accent }}>
            BEGÄR OFFERT
          </div>
          <h2 className="font-serif text-[23px] mb-6">Berätta om ert projekt</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Namn"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder="Telefon"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <textarea
            placeholder="Vad vill ni bygga?"
            rows={4}
            className="w-full box-border px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none mb-5 resize-none"
            style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
          />
          <button
            type="button"
            className="font-semibold text-[14px] px-6 py-3 rounded-md"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            Skicka förfrågan
          </button>
          <p className="text-[12.5px] mt-3" style={{ color: colors.inkDim }}>
            Vi svarar vanligtvis inom två arbetsdagar.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative h-[140px] rounded-2xl overflow-hidden">
            <Image src="/images/snickeri-kontakt-side.jpg" alt="" fill className="object-cover" />
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              VERKSTAD
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              Industrivägen 8<br />591 44 Motala
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              ÖPPETTIDER
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              Mån–fre 7–16, besök efter bokning
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              KONTAKT
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              0141 – 300 22<br />info@ekfastsnickeri.se
            </div>
          </div>
        </div>
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
