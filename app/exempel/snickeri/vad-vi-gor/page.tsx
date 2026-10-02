import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vad vi gör — Ekfast Snickeri",
  description: "Vad vi gör — Ekfast Snickeri, exempel byggt med YourCoSite.",
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

const areas = [
  {
    n: "01 — KÖK",
    title: "Skräddarsydda kök",
    body: "Vi börjar alltid med ett hembesök — vi mäter, pratar om hur ni faktiskt lagar mat och lever i köket, och ritar därefter. Inget standardmått, inga IKEA-skal. Massiv ek, ask eller furu, tappade fronter och synliga träförband tillverkade i vår egen verkstad, från första skiss till uppsatt lucka.",
    img: "/images/snickeri-vadvigor-kok.jpg",
  },
  {
    n: "02 — MÖBLER",
    title: "Möbelsnickeri",
    body: "Matbord som blir familjens samlingsplats i tjugo år, bänkar, garderober och förvaring skräddarsydd efter nischer och krokiga väggar. Vi jobbar oftast i ek, ask och furu — och hjälper er gärna välja det träslag som passar hemmet, slitaget och budgeten bäst.",
    img: "/images/snickeri-vadvigor-mobler.jpg",
  },
  {
    n: "03 — RENOVERING",
    title: "Renovering och tillbyggnad",
    body: "Från nya golv och innerväggar till hela tillbyggnader och takbyten. Vi samarbetar med el- och VVS-firmor vi känner och litar på sedan tidigare, så ni slipper hålla ihop projektet själva — en kontakt, ett ansvar, från bygglov till sista sopning.",
    img: "/images/snickeri-vadvigor-renovering.jpg",
  },
];

export default function SnickeriVadViGorPage() {
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
          <span style={{ color: "#fff" }}>Vad vi gör</span>
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

      <section className="px-8 md:px-16 py-16 text-center">
        <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.accent }}>
          VAD VI GÖR
        </div>
        <h1 className="font-serif text-[32px] md:text-[38px]">Tre områden, ett hantverk</h1>
      </section>

      <section className="max-w-4xl mx-auto px-6 md:px-0 pb-20 flex flex-col gap-16">
        {areas.map((a, i) => (
          <div
            key={a.n}
            className={`flex flex-col md:flex-row items-center gap-10 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
          >
            <div className="relative w-full md:w-1/2 h-[220px] rounded-xl overflow-hidden flex-shrink-0">
              <Image src={a.img} alt={a.title} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold tracking-[0.08em] mb-2" style={{ color: colors.accent }}>
                {a.n}
              </div>
              <h2 className="font-serif text-[23px] mb-3">{a.title}</h2>
              <p className="text-[14.5px] leading-relaxed" style={{ color: colors.inkDim }}>
                {a.body}
              </p>
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
