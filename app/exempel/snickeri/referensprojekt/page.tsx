import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referensprojekt — Ekfast Snickeri",
  description: "Referensprojekt — Ekfast Snickeri, exempel byggt med YourCoSite.",
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

const projects = [
  { title: "Kök i massiv ek", meta: "Villa, Vadstena · 2025", img: "/images/snickeri-ref-kok-ek.jpg" },
  { title: "Matbord och bänkar", meta: "Restaurang, Motala · 2024", img: "/images/snickeri-ref-matbord.jpg" },
  { title: "Vindsinredning", meta: "Villa, Linköping · 2024", img: "/images/snickeri-ref-vindsinredning.jpg" },
  { title: "Skjutdörrsgarderob", meta: "Lägenhet, Motala · 2023", img: "/images/snickeri-ref-skjutdorr.jpg" },
  { title: "Uterum i furu", meta: "Villa, Borensberg · 2023", img: "/images/snickeri-ref-uterum.jpg" },
  { title: "Butiksinredning", meta: "Nordlys Inredning, Motala · 2022", img: "/images/snickeri-ref-butiksinredning.jpg" },
];

export default function SnickeriReferensPage() {
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
          <span style={{ color: "#fff" }}>Referensprojekt</span>
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

      <section className="px-8 md:px-16 py-16 text-center">
        <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.accent }}>
          VÅRA PROJEKT
        </div>
        <h1 className="font-serif text-[32px] md:text-[38px]">Ett urval av vad vi byggt</h1>
      </section>

      <section className="px-8 md:px-16 pb-20 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {projects.map((p) => (
          <div key={p.title}>
            <div className="relative h-[190px] rounded-lg overflow-hidden mb-3.5">
              <Image src={p.img} alt={p.title} fill className="object-cover" />
            </div>
            <div className="font-serif text-[17px] mb-1">{p.title}</div>
            <div className="text-[12.5px]" style={{ color: colors.inkDim }}>
              {p.meta}
            </div>
          </div>
        ))}
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
