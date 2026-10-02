import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om oss — Björkängens Kök",
  description: "Om oss — Björkängens Kök, exempel byggt med YourCoSite.",
};

const colors = {
  bg: "#1B120D",
  ink: "#F5EFE6",
  inkDim: "#BBA88F",
  line: "rgba(245,239,230,0.12)",
  accent: "#E8B14A",
  accentInk: "#241808",
};

const stats = [
  { n: "11", label: "År i drift" },
  { n: "30", label: "Platser i matsalen" },
  { n: "14", label: "Lokala leverantörer" },
];

export default function RestaurantAboutPage() {
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
          <span style={{ color: "#fff" }}>Om oss</span>
          <Link href="/exempel/restaurang/kontakt">Kontakt</Link>
        </nav>
        <Link
          href="/exempel/restaurang/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          Boka bord
        </Link>
      </header>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative h-[320px] md:h-[400px] rounded-2xl overflow-hidden">
          <Image src="/images/restaurant-om-interior.jpg" alt="Interiör, Björkängens Kök" fill className="object-cover" />
        </div>
        <div>
          <div className="text-[12.5px] tracking-[0.1em] mb-4" style={{ color: colors.inkDim }}>
            VÅR HISTORIA
          </div>
          <h1 className="font-serif text-[30px] md:text-[34px] leading-[1.2] mb-5">
            Ett kök som lyssnar på säsongen
          </h1>
          <p className="text-[15px] leading-relaxed mb-4" style={{ color: colors.inkDim }}>
            Björkängens Kök öppnade 2014 i en gammal loge strax utanför stan.
            Vi lagar det som finns att få tag på just nu, ofta från gårdar vi
            känner personligen.
          </p>
          <p className="text-[15px] leading-relaxed" style={{ color: colors.inkDim }}>
            Ingen à la carte, bara en meny som byts när säsongen gör det.
            Köket är öppet mot matsalen — ni ser hela tillagningen från ert
            bord, och vi tycker om att prata mat med gästerna som är nyfikna.
          </p>
        </div>
      </section>

      <section
        className="grid grid-cols-3 max-w-3xl mx-auto px-6 py-14 text-center"
        style={{ borderTop: `1px solid ${colors.line}` }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-serif text-[36px]" style={{ color: colors.accent }}>
              {s.n}
            </div>
            <div className="text-[13px] mt-1.5" style={{ color: colors.inkDim }}>
              {s.label}
            </div>
          </div>
        ))}
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
