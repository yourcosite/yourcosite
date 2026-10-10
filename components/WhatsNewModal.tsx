"use client";

import { WHATS_NEW } from "@/lib/whatsNew";

export const WHATS_NEW_SEEN_KEY = "yourcosite-whatsnew-seen";
// De senaste posterna finns kvar i rutan även efter att de lästs.
const VISIBLE_ENTRIES = 10;

// "Nytt i YourCoSite" — en lista över nya funktioner (lib/whatsNew.ts). Knappen
// i redigeraren visar en prick tills kunden öppnat rutan efter senaste nyheten.
export default function WhatsNewModal({
  open,
  onClose,
  onTry,
  onWish,
}: {
  open: boolean;
  onClose: () => void;
  onTry: (text: string) => void;
  onWish: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Nytt i YourCoSite"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[560px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-[19px] font-medium">Nytt i YourCoSite ✨</h2>
            <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">Det här kan du göra nu som du inte kunde förut.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng" className="text-[22px] leading-none text-ink-dim px-1">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {WHATS_NEW.slice(0, VISIBLE_ENTRIES).map((e) => (
            <div key={e.id} className="border border-line rounded-xl p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-semibold text-[14px]">
                  {e.icon} {e.title}
                </div>
                <div className="text-[11.5px] text-ink-dim flex-shrink-0">{e.date}</div>
              </div>
              <p className="text-[13px] text-ink-dim mt-1.5 leading-relaxed">{e.text}</p>
              {e.try && (
                <button
                  type="button"
                  onClick={() => {
                    onTry(e.try!);
                    onClose();
                  }}
                  className="mt-2.5 text-[12px] font-semibold bg-bg border border-line rounded-full px-3 py-1 text-ink hover:border-ink"
                >
                  Prova: ”{e.try}”
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-line bg-bg flex items-center justify-between gap-4">
          <p className="text-[13px] leading-snug">
            <span className="font-semibold">Saknar du något?</span>
            <span className="text-ink-dim"> Berätta vilken funktion du önskar dig – vi läser alla förslag.</span>
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onWish();
            }}
            className="flex-shrink-0 text-[12.5px] font-bold bg-accent text-accent-ink rounded-full px-4 py-2"
          >
            💡 Önska en funktion
          </button>
        </div>
      </div>
    </div>
  );
}
