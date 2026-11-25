"use client";

import { useRef } from "react";
import { useT } from "@/components/I18nProvider";

// Flytande panel för att välja var i bilden det viktiga ligger. Sektionen i
// förhandsvisningen uppdateras medan man drar (förhandsvisningen sköts av
// föräldern), och inget sparas förrän man trycker Spara. Gäller bara den här
// bilden på den här ytan.
export default function ImageFocusPanel({
  src, pos, hadSaved, saving, onChange, onCancel, onSave, onReset,
}: {
  src: string;
  pos: { x: number; y: number };
  hadSaved: boolean;
  saving?: boolean;
  onChange: (p: { x: number; y: number }) => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const setFrom = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    onChange({
      x: Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 100))),
      y: Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 100))),
    });
  };
  return (
    <div className="fixed z-[90] bottom-4 right-4 w-[280px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-xl p-3.5">
      <div className="text-[14px] font-semibold mb-0.5">{t("Justera beskärning")}</div>
      <p className="text-[12px] text-ink-dim mb-2.5">{t("Klicka eller dra där det viktigaste finns. Sektionen till vänster visar hur det blir. Gäller bara den här bilden på den här ytan.")}</p>
      <div
        ref={box}
        className="relative select-none touch-none cursor-crosshair rounded-lg overflow-hidden mb-3"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFrom(e); }}
        onPointerMove={(e) => { if (e.buttons) setFrom(e); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className="block w-full h-auto max-h-[200px] object-contain mx-auto" />
        <div className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, background: "rgba(198,255,94,0.55)" }} />
      </div>
      <div className="flex items-center gap-2">
        {hadSaved && <button type="button" disabled={saving} onClick={onReset} className="text-[12px] text-ink-dim mr-auto underline">{t("Återställ")}</button>}
        <button type="button" onClick={onCancel} className="text-[12.5px] px-3 py-1.5 rounded-full border border-line ml-auto">{t("Avbryt")}</button>
        <button type="button" disabled={saving} onClick={onSave} className="text-[12.5px] font-bold px-4 py-1.5 rounded-full bg-accent text-accent-ink disabled:opacity-60">{saving ? t("Sparar …") : t("Spara")}</button>
      </div>
    </div>
  );
}
