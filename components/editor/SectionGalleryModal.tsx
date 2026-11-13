"use client";

import { useEffect, useRef, useState } from "react";
import { useT, useLocale } from "@/components/I18nProvider";
import SitePreview from "@/components/SitePreview";
import { SECTION_CATALOG, sampleContent } from "@/lib/sectionCatalog";

// "Mallar": alla sektionstyper och deras layouter med namn och ett riktigt
// exempel, så man vet vad man ska skriva till Millie. "Använd" lägger en
// färdig fråga i Millies fält.
const PREVIEW_W = 1100; // sektionen renderas i bred skärm och förminskas
const CARD_W = 300;

// Förminskar ett riktigt exempel så att det fyller kortets bredd.
function ScaledPreview({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(CARD_W / PREVIEW_W);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PREVIEW_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height: 200, background: "#241B15" }} aria-hidden="true">
      <div style={{ width: PREVIEW_W, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>{children}</div>
    </div>
  );
}

export default function SectionGalleryModal({
  onUse,
  onClose,
}: {
  onUse: (pick: { type: string; layout: string; noun: string }) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [typeIdx, setTypeIdx] = useState(0);
  const cur = SECTION_CATALOG[typeIdx];
  const noun = t(cur.name).replace(/\s*\(.*\)\s*$/, "");

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-[1080px] max-h-[92vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b border-line flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-[17px]">{t("Mallar och layouter")}</div>
              <p className="text-[12.5px] text-ink-dim mt-0.5">
                {t("Så ser sektionerna ut och vad de heter. Klicka på Använd så hamnar en färdig fråga i Millies fält, eller skriv namnet själv.")}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-[13px] font-semibold border border-line rounded-lg px-3.5 py-1.5 flex-shrink-0">{t("Stäng")}</button>
          </div>
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {SECTION_CATALOG.map((c, i) => (
              <button
                key={c.type}
                type="button"
                onClick={() => setTypeIdx(i)}
                className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${i === typeIdx ? "bg-ink text-white border-ink" : "border-line text-ink"}`}
              >
                {t(c.name)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_W}px, 1fr))` }}>
            {cur.layouts.map((l) => {
              const content = sampleContent(cur.type, l.id);
              return (
                <div key={l.id} className="border border-line rounded-xl overflow-hidden bg-white flex flex-col">
                  {content ? (
                    <ScaledPreview>
                      <SitePreview content={content} siteName="Mörkvik Barbershop" lang={locale} hideChrome />
                    </ScaledPreview>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-[12px] text-ink-dim bg-bg">{t("Ingen förhandsvisning")}</div>
                  )}
                  <div className="p-3 border-t border-line">
                    <div className="text-[13.5px] font-semibold">{t(l.label)}</div>
                    <div className="text-[12px] text-ink-dim font-mono mt-0.5">{l.id}</div>
                    <button
                      type="button"
                      onClick={() => onUse({ type: cur.type, layout: l.id, noun })}
                      className="mt-2.5 text-[12.5px] font-semibold bg-accent text-accent-ink rounded-lg px-3 py-1.5"
                    >
                      {t("Använd")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
