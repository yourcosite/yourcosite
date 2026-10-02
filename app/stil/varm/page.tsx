import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stilexempel: Varm" };

export default function StyleWarmPage() {
  const ink = "#3A2E26";
  const inkDim = "#8A7A6E";
  const orange = "#E8714A";
  const cream = "#FBF2EC";

  return (
    <div style={{ background: cream, color: ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/onboarding/4"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-1.5 text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: ink }}
      >
        ← Till stilval
      </Link>

      <header className="flex items-center justify-between px-10 md:px-16 py-7">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-full" style={{ background: orange }} />
          <span className="font-serif font-semibold text-[20px]">Nordby</span>
        </div>
        <nav className="hidden md:flex items-center gap-9 text-[14px]" style={{ color: inkDim }}>
          <span>Tjänster</span>
          <span>Om oss</span>
          <span>Galleri</span>
          <span>Kontakt</span>
        </nav>
        <div className="text-white font-semibold text-[13.5px] px-5.5 py-2.5 rounded-full" style={{ background: orange }}>
          Säg hej 👋
        </div>
      </header>

      <section className="px-10 md:px-16 py-14 flex flex-col md:flex-row items-center gap-14">
        <div className="flex-1">
          <h1 className="font-serif text-[40px] md:text-[52px] leading-[1.12] font-medium">
            Vi gör det
            <br />
            <span className="italic" style={{ color: orange }}>personligt.</span>
          </h1>
          <p className="text-[16.5px] leading-relaxed mt-6 max-w-[420px]" style={{ color: inkDim }}>
            Nordby är studion som tar sig tid att lära känna er innan vi
            ritar ett enda streck. Varmt, mänskligt, genomtänkt.
          </p>
          <div className="mt-8">
            <div className="inline-block text-white font-semibold text-[14.5px] px-7.5 py-4 rounded-full" style={{ background: orange }}>
              Boka ett kostnadsfritt möte
            </div>
          </div>
        </div>
        <div className="w-full md:w-[440px] h-[300px] md:h-[380px] rounded-[28px] flex-shrink-0" style={{ background: "#F0DCCB" }} />
      </section>

      <section className="px-10 md:px-16 py-16 grid md:grid-cols-3 gap-6" style={{ background: "#F4E4D8" }}>
        {[
          { title: "Varumärke", body: "En identitet som känns som er — från logga till ton i texten." },
          { title: "Webbdesign", body: "Sajter som känns inbjudande istället för kalla och säljiga." },
          { title: "Innehåll", body: "Texter och bilder som berättar er historia på riktigt." },
        ].map((c) => (
          <div key={c.title} className="bg-white rounded-2xl p-7">
            <div className="w-[42px] h-[42px] rounded-full mb-4" style={{ background: orange }} />
            <div className="font-semibold text-[17px] mb-2">{c.title}</div>
            <div className="text-[13.5px] leading-relaxed" style={{ color: inkDim }}>{c.body}</div>
          </div>
        ))}
      </section>

      <section className="px-10 md:px-16 py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="w-full md:w-[280px] h-[220px] md:h-[280px] rounded-[28px] flex-shrink-0" style={{ background: "#F0DCCB" }} />
        <div className="flex-1">
          <div className="font-serif italic text-[22px] leading-relaxed">
            &ldquo;Vi kände oss aldrig som &apos;ett case&apos; hos
            Nordby. De lyssnade, och resultatet blev precis oss.&rdquo;
          </div>
          <div className="text-[13.5px] mt-4" style={{ color: inkDim }}>
            Johanna Ek, grundare av Sol &amp; Jord
          </div>
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-10 md:px-16 py-9 text-[13.5px]"
        style={{ borderTop: "1px solid #F0E3DA", color: inkDim }}
      >
        <span>© Nordby 2026</span>
        <div className="flex gap-7">
          <span>Tjänster</span>
          <span>Galleri</span>
          <span>Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
