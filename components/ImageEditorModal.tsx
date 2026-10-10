"use client";

import { useEffect, useRef, useState } from "react";

// Enkel bildredigerare: beskär (med bildförhållande, zoom och dra för att
// flytta), vrid, spegla och justera ljus/kontrast/färg. Allt sker i
// webbläsaren — resultatet lämnas som en JPEG-fil till föräldern, som laddar
// upp den och byter bilden (se app/api/sites/replace-image).

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "orig", label: "Som bilden", ratio: null },
  { id: "1:1", label: "Kvadrat", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "Bred 16:9", ratio: 16 / 9 },
  { id: "3:4", label: "Stående", ratio: 3 / 4 },
];

const MAX_OUTPUT = 2000; // längsta sidan i pixlar på den sparade bilden
const PREVIEW_MAX_W = 560;
const PREVIEW_MAX_H = 380;

type Pos = { x: number; y: number };

function cropRect(baseW: number, baseH: number, ratio: number | null, zoom: number, pos: Pos) {
  const r = ratio ?? baseW / baseH;
  let w: number;
  let h: number;
  if (baseW / baseH > r) {
    h = baseH;
    w = h * r;
  } else {
    w = baseW;
    h = w / r;
  }
  w /= zoom;
  h /= zoom;
  return { x: (baseW - w) * pos.x, y: (baseH - h) * pos.y, w, h };
}

function adjustPixels(ctx: CanvasRenderingContext2D, w: number, h: number, bright: number, contrast: number, sat: number) {
  if (!bright && !contrast && !sat) return;
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const c = (100 + contrast) / 100;
  const s = (100 + sat) / 100;
  const add = bright * 1.8;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * c + 128 + add;
    let g = (d[i + 1] - 128) * c + 128 + add;
    let b = (d[i + 2] - 128) * c + 128 + add;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * s;
    g = gray + (g - gray) * s;
    b = gray + (b - gray) * s;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(data, 0, 0);
}

export default function ImageEditorModal({
  open,
  src,
  saving,
  onClose,
  onSave,
  onSkip,
  saveLabel,
  title,
}: {
  open: boolean;
  src: string;
  saving: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  // Visas som en extra knapp, t.ex. "Använd utan ändringar" vid uppladdning.
  onSkip?: { label: string; run: () => void };
  saveLabel?: string;
  title?: string;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rot, setRot] = useState(0); // antal kvarts varv medurs
  const [flip, setFlip] = useState(false);
  const [aspect, setAspect] = useState("orig");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0.5, y: 0.5 });
  const [bright, setBright] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sat, setSat] = useState(0);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const dragRef = useRef<{ x: number; y: number; pos: Pos } | null>(null);

  const reset = () => {
    setRot(0);
    setFlip(false);
    setAspect("orig");
    setZoom(1);
    setPos({ x: 0.5, y: 0.5 });
    setBright(0);
    setContrast(0);
    setSat(0);
  };

  // Läs in bilden varje gång dialogen öppnas.
  useEffect(() => {
    if (!open) return;
    reset();
    setImg(null);
    setError(null);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setImg(im);
    im.onerror = () => setError("Det gick inte att öppna bilden för redigering. Prova att ladda upp bilden igen.");
    const [base] = src.split("#");
    // En ny parameter gör att webbläsaren inte återanvänder en tidigare
    // cachad kopia utan rätt tillåtelse (CORS) för redigering.
    const local = base.startsWith("blob:") || base.startsWith("data:");
    im.src = local ? base : base + (base.includes("?") ? "&" : "?") + "ycs=edit";
  }, [open, src]);

  // Bygg basbilden (vriden/speglad) när något av det ändras.
  useEffect(() => {
    if (!img) return;
    const swap = rot % 2 === 1;
    const w = swap ? img.naturalHeight : img.naturalWidth;
    const h = swap ? img.naturalWidth : img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 2);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    baseRef.current = c;
    setBaseVersion((v) => v + 1);
  }, [img, rot, flip]);

  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  const draw = (target: HTMLCanvasElement, outW: number) => {
    const base = baseRef.current;
    if (!base) return;
    const r = cropRect(base.width, base.height, ratio, zoom, pos);
    const outH = Math.max(1, Math.round((outW * r.h) / r.w));
    target.width = Math.max(1, Math.round(outW));
    target.height = outH;
    const ctx = target.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(base, r.x, r.y, r.w, r.h, 0, 0, target.width, target.height);
    adjustPixels(ctx, target.width, target.height, bright, contrast, sat);
  };

  // Rita förhandsvisningen.
  useEffect(() => {
    const base = baseRef.current;
    const canvas = previewRef.current;
    if (!base || !canvas) return;
    const r = cropRect(base.width, base.height, ratio, zoom, pos);
    const w = Math.min(PREVIEW_MAX_W, (PREVIEW_MAX_H * r.w) / r.h);
    draw(canvas, w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseVersion, ratio, zoom, pos, bright, contrast, sat]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, pos };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const base = baseRef.current;
    const canvas = previewRef.current;
    if (!drag || !base || !canvas) return;
    const r = cropRect(base.width, base.height, ratio, zoom, drag.pos);
    const scale = r.w / canvas.getBoundingClientRect().width; // källpixlar per skärmpixel
    const rangeX = base.width - r.w;
    const rangeY = base.height - r.h;
    const nx = rangeX > 0 ? drag.pos.x - ((e.clientX - drag.x) * scale) / rangeX : drag.pos.x;
    const ny = rangeY > 0 ? drag.pos.y - ((e.clientY - drag.y) * scale) / rangeY : drag.pos.y;
    setPos({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const save = () => {
    const base = baseRef.current;
    if (!base) return;
    const r = cropRect(base.width, base.height, ratio, zoom, pos);
    const outW = Math.min(r.w, r.w >= r.h ? MAX_OUTPUT : (MAX_OUTPUT * r.w) / r.h);
    const out = document.createElement("canvas");
    draw(out, outW);
    out.toBlob(
      (blob) => {
        if (blob) onSave(blob);
        else setError("Det gick inte att spara bilden. Försök igen.");
      },
      "image/jpeg",
      0.9
    );
  };

  const slider = (label: string, value: number, set: (n: number) => void, min = -50, max = 50) => (
    <label className="flex items-center gap-3 text-[12.5px]">
      <span className="w-20 flex-shrink-0 text-ink-dim">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="flex-1 accent-[#0C1004]"
      />
    </label>
  );

  const btn = "text-[12.5px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-surface text-ink hover:border-ink disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Redigera bild"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[640px] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-[17px] font-medium">{title ?? "Redigera bild"}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Stäng" className="text-[22px] leading-none text-ink-dim px-1">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {error ? (
            <p className="text-[13px] text-red-600">{error}</p>
          ) : !img ? (
            <p className="text-[13px] text-ink-dim">Öppnar bilden …</p>
          ) : (
            <>
              <div className="flex justify-center bg-bg rounded-xl p-2">
                <canvas
                  ref={previewRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="max-w-full rounded-lg cursor-grab active:cursor-grabbing touch-none"
                  style={{ touchAction: "none" }}
                />
              </div>
              <p className="text-[12px] text-ink-dim -mt-2">Zooma med reglaget och dra i bilden för att välja vilken del som ska synas.</p>

              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAspect(a.id);
                      setPos({ x: 0.5, y: 0.5 });
                    }}
                    className={`text-[12px] font-semibold rounded-full px-3 py-1 border ${
                      aspect === a.id ? "bg-accent text-accent-ink border-accent" : "bg-surface border-line text-ink"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                {slider("Zoom", Math.round((zoom - 1) * 50), (n) => setZoom(1 + n / 50), 0, 100)}
                {slider("Ljusstyrka", bright, setBright)}
                {slider("Kontrast", contrast, setContrast)}
                {slider("Färgstyrka", sat, setSat)}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => setRot((r) => (r + 3) % 4)}>
                  ⟲ Vrid vänster
                </button>
                <button type="button" className={btn} onClick={() => setRot((r) => (r + 1) % 4)}>
                  ⟳ Vrid höger
                </button>
                <button type="button" className={btn} onClick={() => setFlip((f) => !f)}>
                  ⇋ Spegla
                </button>
                <button type="button" className={btn} onClick={reset}>
                  Återställ
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">
          <button type="button" className={btn} onClick={onClose} disabled={saving}>
            Avbryt
          </button>
          {onSkip && (
            <button type="button" className={btn} onClick={onSkip.run} disabled={saving}>
              {onSkip.label}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !img}
            className="text-[13px] font-bold rounded-lg px-4 py-1.5 bg-accent text-accent-ink disabled:opacity-60"
          >
            {saving ? "Sparar …" : saveLabel ?? "Spara bilden"}
          </button>
        </div>
      </div>
    </div>
  );
}
