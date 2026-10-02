import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stilexempel: Djärv" };

export default function StyleBoldPage() {
  const red = "#DC2626";
  const dark = "#17171A";

  return (
    <div style={{ background: dark, color: "#fff", fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/onboarding/4"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-1.5 bg-white text-ink text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
      >
        ← Till stilval
      </Link>

      <header className="flex items-center justify-between px-10 md:px-16 py-7" style={{ borderBottom: "1px solid #2A2A2E" }}>
        <div className="font-serif font-semibold text-[21px]">NORDBY</div>
        <nav className="hidden md:flex items-center gap-10 text-[14px]" style={{ color: "#B8B6B1" }}>
          <span>Tjänster</span>
          <span>Projekt</span>
          <span>Om oss</span>
          <span>Kontakt</span>
        </nav>
        <div
          className="text-[13.5px] font-bold uppercase tracking-wide px-5.5 py-2.5 rounded-md"
          style={{ background: red }}
        >
          Kom igång
        </div>
      </header>

      <section className="px-10 md:px-16 py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <div className="text-[13px] font-bold tracking-[0.1em] mb-5" style={{ color: red }}>
            NY SÄSONG. NYA REGLER.
          </div>
          <h1 className="font-serif text-[48px] md:text-[64px] leading-[1.02] font-semibold uppercase">
            Gör
            <br />
            <span style={{ color: red }}>skillnad.</span>
            <br />
            Nu.
          </h1>
          <p className="text-[17px] leading-relaxed mt-7 max-w-[420px]" style={{ color: "#B8B6B1" }}>
            Vi bygger varumärken som sticker ut och syns — inte sådana som
            smälter in i mängden.
          </p>
          <div className="mt-9 flex gap-3.5">
            <div className="font-bold text-[15px] uppercase px-8 py-4 rounded-md" style={{ background: red }}>
              Starta projektet
            </div>
            <div className="font-semibold text-[15px] px-2.5 py-4" style={{ borderBottom: `2px solid ${red}` }}>
              Se våra case →
            </div>
          </div>
        </div>
        <div className="w-full md:w-[380px] h-[280px] md:h-[380px] rounded-lg flex-shrink-0" style={{ background: red }} />
      </section>

      <div className="px-10 md:px-16 py-10 flex" style={{ borderTop: "1px solid #2A2A2E", borderBottom: "1px solid #2A2A2E" }}>
        {[
          ["120+", "LANSERADE PROJEKT"],
          ["98%", "NÖJDA KUNDER"],
          ["24/7", "SUPPORT"],
        ].map(([n, l], i) => (
          <div key={l} className="flex-1 text-center py-4" style={{ borderRight: i < 2 ? "1px solid #2A2A2E" : "none" }}>
            <div className="text-[36px] font-bold" style={{ color: red }}>{n}</div>
            <div className="text-[13px] mt-1.5" style={{ color: "#B8B6B1" }}>{l}</div>
          </div>
        ))}
      </div>

      <section className="px-10 md:px-16 py-20 grid md:grid-cols-3 gap-7">
        {[
          { title: "Varumärke", body: "Identitet som fastnar — på riktigt, inte bara på pappret." },
          { title: "Kampanj", body: "Lanseringar som skapar snack innan de är live." },
          { title: "Digitalt", body: "Sajter och appar byggda för att faktiskt konvertera." },
        ].map((c) => (
          <div key={c.title} className="rounded-xl p-7" style={{ background: "#1F1F23", borderLeft: `3px solid ${red}` }}>
            <div className="font-bold text-[18px] mb-2.5 uppercase">{c.title}</div>
            <div className="text-[14px] leading-relaxed" style={{ color: "#B8B6B1" }}>{c.body}</div>
          </div>
        ))}
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-10 md:px-16 py-9 text-[13.5px]"
        style={{ borderTop: "1px solid #2A2A2E", color: "#8C8A86" }}
      >
        <span>© NORDBY 2026</span>
        <div className="flex gap-7">
          <span>Tjänster</span>
          <span>Projekt</span>
          <span>Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
