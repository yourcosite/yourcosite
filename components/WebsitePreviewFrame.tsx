"use client";

import { useState } from "react";

// Webbläsarramen runt den riktiga sajt-förhandsvisningen på /webbplats.
// Visar själva sajten i en <iframe> (mot /webbplats-innehall) istället för
// att rendera den direkt i sidan som tidigare — det ger två saker på
// samma gång:
//  1) Ett 16:9-fönster (som de flesta skärmar), med skroll inuti fönstret
//     för långa sidor — istället för att hela förhandsvisningen (och
//     webbläsarramen runt den) blev hur hög som helst.
//  2) En riktig mobilförhandsvisning — iframens egen bredd avgör vilka
//     "md:"-brytpunkter som slår till i sajtens kod, så "Mobil"-läget
//     visar faktiskt den smala layouten, inte bara en nedskalad bild av
//     den breda.
//
// Dator-rutans bredd var tidigare LÅST till max 1560px oavsett skärm. På en
// bred/högupplöst skärm (1920px+) blev rutan då betydligt smalare än
// besökarens riktiga fönster skulle vara — och eftersom hero-bilder har en
// fast pixelhöjd (se SitePreview.tsx) blev de synligt hårdare beskurna i
// sidled än på den faktiska, publicerade sajten. Bredden är nu
// "min(94vw, 2000px)" istället — den växer med skärmens egen bredd (det
// kundfrågan efterfrågade) och tar bara en liten marginal, men har ändå ett
// tak så rutan inte blir orimligt stor på en jätteskärm.
// Dator-rutan visade sidan i FULL skala inuti sin iframe — med en hero på
// upp emot 720px högt (se heroEmphasis i SitePreview.tsx) fylldes nästan
// hela 16:9-rutan av bara hero:n innan man ens skrollat, vilket gav ett
// tajt, inzoomat intryck av sidan som helhet. DESKTOP_ZOOM skalar ner
// INNEHÅLLET i iframen (inte själva rutan) så man ser åtminstone dubbelt
// så mycket utan att skrolla — iframen görs 1/DESKTOP_ZOOM gånger större
// än rutan och skalas sedan ner med CSS transform, ungefär som
// webbläsarens egen zoom-ut-funktion. Containerfrågorna i SitePreview.tsx
// (@container) mäter fortfarande mot iframens verkliga, större bredd, så
// "dator"-layouten (inte den smala mobillayouten) triggas precis som på
// den riktiga sajten.
const DESKTOP_ZOOM = 0.48;

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
            ? "w-full max-w-[min(94vw,2000px)] aspect-[16/9] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
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
        {device === "desktop" ? (
          // overflow-hidden-rutan är den synliga ytan; iframen är
          // 1/DESKTOP_ZOOM gånger större och skalas ner till att fylla den,
          // se kommentaren vid DESKTOP_ZOOM ovan.
          <div className="flex-1 w-full overflow-hidden relative">
            <iframe
              src={contentPath}
              title={siteName ? `Förhandsvisning av ${siteName}` : "Förhandsvisning"}
              className="absolute top-0 left-0 border-0 bg-white"
              style={{
                width: `${100 / DESKTOP_ZOOM}%`,
                height: `${100 / DESKTOP_ZOOM}%`,
                transform: `scale(${DESKTOP_ZOOM})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        ) : (
          <iframe
            src={contentPath}
            title={siteName ? `Förhandsvisning av ${siteName}` : "Förhandsvisning"}
            className="flex-1 w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
