import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt — Björkängens Kök",
  description: "Boka bord — Björkängens Kök, exempel byggt med YourCoSite.",
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

export default function RestaurantContactPage() {
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
        <Link href="/exempel/restaurang" className="font-serif italic text-[21px]">
          Björkängens Kök
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <Link href="/exempel/restaurang">Hem</Link>
          <Link href="/exempel/restaurang/meny">Meny</Link>
          <Link href="/exempel/restaurang/om-oss">Om oss</Link>
          <span style={{ color: "#fff" }}>Kontakt</span>
        </nav>
        <span
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka bord
        </span>
      </header>

      <div className="relative h-[200px]">
        <Image src="/images/restaurant-kontakt-banner.jpg" alt="" fill className="object-cover opacity-70" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "rgba(27,18,13,0.45)" }}
        >
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            KVÄLLENS KÄLLARE
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px]">Boka ett bord hos oss</h1>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-16 grid md:grid-cols-[1.3fr_1fr] gap-12">
        <div className="rounded-2xl p-7" style={{ background: colors.surface }}>
          <div className="text-[12.5px] tracking-[0.1em] mb-2" style={{ color: colors.accent }}>
            BOKA BORD
          </div>
          <h2 className="font-serif text-[23px] mb-6">Vi ses för middag</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Namn"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder="Antal gäster"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <input
              placeholder="Datum"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder="Klockslag"
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <button
            type="button"
            className="font-semibold text-[14px] px-6 py-3 rounded-lg"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            Skicka bokningsförfrågan
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative h-[140px] rounded-2xl overflow-hidden">
            <Image src="/images/restaurant-kontakt-side.jpg" alt="" fill className="object-cover" />
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              ADRESS
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              Björkängsvägen 4<br />591 33 Motala
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              ÖPPETTIDER
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              Torsdag–lördag, 17–23
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              KONTAKT
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              013 – 123 45 67<br />hej@bjorkangenskok.se
            </div>
          </div>
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
