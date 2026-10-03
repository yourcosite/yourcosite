"use client";

import { useState } from "react";

// Webbläsarramen runt den riktiga sajt-förhandsvisningen på /webbplats.
// Visar själva sajten i en <iframe> (mot /webbplats-innehall) istället för
// att rendera den direkt i sidan som tidigare — det ger två saker på
// samma gång:
//  1) Ett fast 16:9-fönster (som de flesta skärmar), med skroll inuti
//     fönstret för långa sidor — istället för att hela förhandsvisningen
//     (och webbläsarramen runt den) blev hur hög som helst.
//  2) En riktig mobilförhandsvisning — iframens egen bredd avgör vilka
//     "md:"-brytpunkter som slår till i sajtens kod, så "Mobil"-läget
//     visar faktiskt den smala layouten, inte bara en nedskalad bild av
//     den breda.
export default function WebsitePreviewFrame({
  siteName,
  domainLabel,
  contentPath,
}: {
  siteName?: string;
  domainLabel: string;
  contentPath: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center gap-1.5 bg-white/70 rounded-full p-1 mb-4 border border-black/5">
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
            device === "desktop" ? "bg-ink text-white" : "text-ink-dim"
          }`}
        >
          Dator
        </button>
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
            device === "mobile" ? "bg-ink text-white" : "text-ink-dim"
          }`}
        >
          Mobil
        </button>
      </div>

      <div
        className={
          device === "desktop"
            ? "w-full max-w-[900px] aspect-[16/9] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            : "w-[380px] max-w-full h-[720px] bg-white rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col border-[6px] border-ink"
        }
      >
        <div className="h-[38px] flex-shrink-0 bg-[#F1EFE9] flex items-center gap-1.5 px-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
          <div className="flex-1 text-center text-[11.5px] text-ink-dim truncate px-2">
            {domainLabel}
          </div>
        </div>
        <iframe
          src={contentPath}
          title={siteName ? `Förhandsvisning av ${siteName}` : "Förhandsvisning"}
          className="flex-1 w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
