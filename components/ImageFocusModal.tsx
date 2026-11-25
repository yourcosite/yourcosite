"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

// Välj var i bilden det viktiga ligger. Bilden beskärs sedan runt den punkten
// på alla ytor där den visas (bred, kvadratisk, stående). Klicka eller dra.
export default function ImageFocusModal({
  open, src, initial, saving, onClose, onSave,
}: {
  open: boolean;
  src: string;
  initial?: { x: number; y: number };
  saving?: boolean;
  onClose: () => void;
  onSave: (pos: { x: number; y: number } | null) => void;
}) {
  const t = useT();
  const [pos, setPos] = useState(initial || { x: 50, y: 50 });
  const box = useRef<HTMLDivElement>(null);
  if (!open) return null;

  const setFrom = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 100))), y: Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 100))) });
  };
  const frames: { label: string; cls: string }[] = [
    { label: t("Bred"), cls: "aspect-[16/9] w-[150px]" },
    { label: t("Kvadrat"), cls: "aspect-square w-[84px]" },
    { label: t("Stående"), cls: "aspect-[3/4] w-[72px]" },
  ];
  return (
    <div className="fixed inset-0 z-[100] bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold mb-1">{t("Justera beskärning")}</h2>
        <p className="text-[13px] text-ink-dim mb-3">{t("Klicka eller dra där det viktigaste i bilden finns, till exempel ett ansikte. Bilden beskärs sedan runt den punkten på alla ytor.")}</p>
        <div
          ref={box}
          className="relative select-none touch-none cursor-crosshair rounded-lg overflow-hidden mb-4"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFrom(e); }}
          onPointerMove={(e) => { if (e.buttons) setFrom(e); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className="block w-full h-auto max-h-[46vh] object-contain mx-auto" />
          <div className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, background: "rgba(198,255,94,0.55)" }} />
        </div>
        <div className="flex items-end gap-4 mb-4">
          {frames.map((f) => (
            <div key={f.label}>
              <div className={`${f.cls} rounded-md overflow-hidden bg-bg border border-line`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${pos.x}% ${pos.y}%` }} />
              </div>
              <div className="text-[11px] text-ink-dim mt-1">{f.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {initial && <button type="button" disabled={saving} onClick={() => onSave(null)} className="text-[13px] px-3 py-2 text-ink-dim mr-auto">{t("Återställ")}</button>}
          <button type="button" onClick={onClose} className="text-[13px] px-4 py-2 rounded-full border border-line">{t("Avbryt")}</button>
          <button type="button" disabled={saving} onClick={() => onSave(pos)} className="text-[13px] font-bold px-5 py-2 rounded-full bg-accent text-accent-ink disabled:opacity-60">{saving ? t("Sparar …") : t("Spara")}</button>
        </div>
      </div>
    </div>
  );
}
