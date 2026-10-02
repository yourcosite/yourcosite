import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Välj en utgångspunkt" };

const options = [
  {
    title: "Luftig & minimal",
    desc: "Centrerad rubrik, gott om vitt utrymme och en tydlig knapp i fokus.",
    recommended: false,
    preview: "bg-white border border-[#ECEAE6]",
  },
  {
    title: "Varm & personlig",
    desc: "Bild i fokus bredvid texten, runda hörn och en inbjudande känsla.",
    recommended: true,
    preview: "bg-[#FBF2EC] border border-[#F0E3DA]",
  },
  {
    title: "Djärv & färgstark",
    desc: "Mörk bakgrund, stor rubrik och hög kontrast för att synas direkt.",
    recommended: false,
    preview: "bg-[#17171A] border border-[#2A2A2E]",
  },
];

export default function SuggestionsPage() {
  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface">
        <Logo light={false} />
        <Link href="/dashboard" className="text-[14px] text-ink-dim font-medium">
          Avbryt
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-10 md:py-11">
        <div className="w-full max-w-[1040px]">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-medium mb-2.5">
              Tre förslag på din startsida
            </h1>
            <p className="text-[15.5px] text-ink-dim max-w-[560px] mx-auto">
              Samma innehåll, tre olika layouter. Välj den du gillar bäst
              som utgångspunkt — du kan ändra precis allt efteråt.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5.5">
            {options.map((o) => (
              <div
                key={o.title}
                className={`relative bg-surface rounded-2xl overflow-hidden flex flex-col ${
                  o.recommended
                    ? "border-[1.5px] border-accent shadow-[0_0_0_3px_var(--tw-shadow-color)]"
                    : "border-[1.5px] border-line"
                }`}
                style={o.recommended ? ({ "--tw-shadow-color": "#F0FADB" } as React.CSSProperties) : undefined}
              >
                {o.recommended && (
                  <div className="absolute top-3 right-3 bg-ink text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide">
                    REKOMMENDERAS
                  </div>
                )}
                <div className={`h-[210px] ${o.preview} flex items-center justify-center text-[12px] text-ink-dim`}>
                  Förhandsvisning
                </div>
                <div className="px-5 py-5">
                  <div className="font-semibold text-[15.5px] mb-1">{o.title}</div>
                  <div className="text-[13px] text-ink-dim mb-4 leading-relaxed">
                    {o.desc}
                  </div>
                  <Link
                    href="/redigera"
                    className="block text-center bg-accent text-accent-ink font-semibold text-[14px] py-2.5 rounded-[9px]"
                  >
                    Välj den här
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6.5">
            <Link href="/bygger" className="text-[13.5px] text-ink-dim font-semibold">
              ← Be YourCoSite ta fram nya förslag
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
