"use client";

import { useState } from "react";

// Sajtinställningar för spårning — öppnas från ett kugghjul i
// chattredigerarens header (app/redigera/page.tsx). Samma fält kan också
// sättas genom att be Millie om det i chatten (se gaMeasurementId/
// metaPixelId i /api/sites/edit) — den här rutan är bara en snabbare väg
// in när kunden redan har ID:t till hands.
export default function TrackingSettingsModal({
  open,
  onClose,
  gaMeasurementId,
  metaPixelId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  gaMeasurementId?: string;
  metaPixelId?: string;
  onSaved: (values: { gaMeasurementId?: string; metaPixelId?: string }) => void;
}) {
  const [ga, setGa] = useState(gaMeasurementId || "");
  const [pixel, setPixel] = useState(metaPixelId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/sites/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaMeasurementId: ga, metaPixelId: pixel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kunde inte spara.");
      onSaved({ gaMeasurementId: data.content?.gaMeasurementId, metaPixelId: data.content?.metaPixelId });
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold">Analys och marknadsföring</h2>
          <button onClick={onClose} aria-label="Stäng" className="text-ink-dim">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-[12.5px] text-ink-dim mb-4 leading-relaxed">
          Koppla er egen Google Analytics och/eller Meta (Facebook) Pixel —
          läggs in på sajten automatiskt. Laddas bara in hos besökare som
          godkänt &rdquo;Alla cookies&rdquo; i cookiebannern.
        </p>

        <div className="mb-3.5">
          <label htmlFor="ga" className="block text-[12.5px] font-semibold mb-1.5">
            Google Analytics-ID
          </label>
          <input
            id="ga"
            type="text"
            value={ga}
            onChange={(e) => setGa(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px]"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="pixel" className="block text-[12.5px] font-semibold mb-1.5">
            Meta Pixel-ID
          </label>
          <input
            id="pixel"
            type="text"
            value={pixel}
            onChange={(e) => setPixel(e.target.value)}
            placeholder="Bara siffror"
            className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px]"
          />
        </div>

        {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}
        {saved && !error && <p className="text-[12.5px] text-ink-dim mb-3">Sparat.</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg disabled:opacity-60"
        >
          {saving ? "Sparar …" : "Spara"}
        </button>
      </div>
    </div>
  );
}
