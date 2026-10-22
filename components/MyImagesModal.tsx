"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

export type MyImage = { name: string; url: string };

// Kundens tidigare uppladdade bilder. Markera en eller flera och bifoga dem
// till chatt-meddelandet, så slipper man ladda upp samma bild igen.
export default function MyImagesModal({
  open,
  onClose,
  onPick,
  maxPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (images: MyImage[]) => void;
  maxPick: number;
}) {
  const t = useT();
  const [images, setImages] = useState<MyImage[] | null>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setError("");
    fetch("/api/sites/my-images")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || t("Något gick fel."));
        setImages(d.images || []);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const toggle = (url: string) =>
    setChosen((c) => (c.includes(url) ? c.filter((u) => u !== url) : c.length >= maxPick ? c : [...c, url]));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("Mina bilder")}>
      <div className="bg-surface rounded-2xl w-full max-w-[760px] max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="text-[15px] font-semibold">{t("Mina bilder")}</div>
            <div className="text-[12px] text-ink-dim">{t("Bilder du redan har laddat upp. Välj en eller flera att bifoga i chatten.")}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-[20px] text-ink-dim px-2">×</button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          {!error && images === null && <p className="text-[13px] text-ink-dim">{t("Hämtar dina bilder …")}</p>}
          {!error && images && images.length === 0 && <p className="text-[13.5px] text-ink-dim">{t("Du har inte laddat upp några bilder än.")}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {(images ?? []).map((im) => {
              const on = chosen.includes(im.url);
              return (
                <button
                  key={im.url}
                  type="button"
                  onClick={() => toggle(im.url)}
                  aria-pressed={on}
                  className="relative aspect-square rounded-lg overflow-hidden bg-bg"
                  style={{ outline: on ? "3px solid #C6FF5E" : undefined, outlineOffset: on ? "-3px" : undefined }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {on && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-accent-ink text-[12px] font-bold flex items-center justify-center">
                      {chosen.indexOf(im.url) + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-line flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-dim">{t("Valda: {n} av högst {max}", { n: chosen.length, max: maxPick })}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-[13px] px-3 py-1.5 rounded-full border border-line">{t("Avbryt")}</button>
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => {
                onPick((images ?? []).filter((im) => chosen.includes(im.url)));
                onClose();
              }}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-ink disabled:opacity-50"
            >
              {t("Bifoga")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
