import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kollektion — Nordlys Inredning",
  description: "Kollektion — Nordlys Inredning, exempel byggt med YourCoSite.",
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

const products = [
  { name: "Fåtölj Ask", price: "6 495 kr", img: "/images/inredning-product-faatolj-ask.jpg" },
  { name: "Lampa Duva", price: "1 895 kr", img: "/images/inredning-product-lampa-duva.jpg" },
  { name: "Matta Lin", price: "2 995 kr", img: "/images/inredning-product-matta-lin.jpg" },
  { name: "Vas Alv", price: "695 kr", img: "/images/inredning-product-vas-alv.jpg" },
  { name: "Soffbord Näva", price: "4 295 kr", img: "/images/inredning-product-soffbord-nava.jpg" },
  { name: "Kudde Frost", price: "495 kr", img: "/images/inredning-product-kudde-frost.jpg" },
  { name: "Bokhylla Gren", price: "7 995 kr", img: "/images/inredning-product-bokhylla-gren.jpg" },
  { name: "Ljusstake Bris", price: "345 kr", img: "/images/inredning-product-ljusstake-bris.jpg" },
];

export default function InredningKollektionPage() {
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
          <span style={{ color: colors.ink }}>KOLLEKTION</span>
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

      <section className="px-8 md:px-16 py-14 text-center">
        <div className="text-[12.5px] tracking-[0.08em] mb-3" style={{ color: colors.accent }}>
          HELA SORTIMENTET
        </div>
        <h1 className="font-serif text-[34px] md:text-[40px] font-medium">Kollektionen</h1>
      </section>

      <section className="px-8 md:px-16 pb-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {products.map((p) => (
          <div key={p.name}>
            <div className="relative h-[180px] rounded-md overflow-hidden mb-3" style={{ background: colors.surface }}>
              <Image src={p.img} alt={p.name} fill className="object-cover" />
            </div>
            <div className="text-[14px] font-semibold">{p.name}</div>
            <div className="text-[12.5px] mt-1" style={{ color: colors.inkDim }}>
              {p.price}
            </div>
          </div>
        ))}
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
