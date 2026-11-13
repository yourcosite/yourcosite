"use client";

import { prepareImage } from "@/lib/imageUpload";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

// Inställningar i redigeraren: spårning (Google Analytics, Meta Pixel) och,
// via children, sajtens språk. Samma fält kan också sättas genom att be Millie
// om det (se gaMeasurementId/metaPixelId i /api/sites/edit).
export default function SettingsPanel({
  siteId,
  gaMeasurementId,
  metaPixelId,
  shareImageUrl,
  faviconUrl,
  onSaved,
  onMetaSaved,
  onClose,
  children,
}: {
  siteId?: string;
  gaMeasurementId?: string;
  metaPixelId?: string;
  shareImageUrl?: string;
  faviconUrl?: string;
  onSaved: (values: { gaMeasurementId?: string; metaPixelId?: string }) => void;
  onMetaSaved: (values: { shareImageUrl?: string; faviconUrl?: string }) => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  const [ga, setGa] = useState(gaMeasurementId || "");
  const [pixel, setPixel] = useState(metaPixelId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [metaBusy, setMetaBusy] = useState<"share" | "favicon" | null>(null);
  const [metaError, setMetaError] = useState("");
  const sendMeta = async (kind: "share" | "favicon", file: File | null) => {
    setMetaBusy(kind);
    setMetaError("");
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      if (siteId) fd.append("siteId", siteId);
      if (file) fd.append("file", await prepareImage(file, { maxDim: kind === "favicon" ? 512 : 1600 }));
      else fd.append("remove", "1");
      const res = await fetch("/api/sites/site-meta", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("Kunde inte spara."));
      onMetaSaved({ shareImageUrl: data.content?.shareImageUrl, faviconUrl: data.content?.faviconUrl });
    } catch (e: any) {
      setMetaError(e.message);
    } finally {
      setMetaBusy(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/sites/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaMeasurementId: ga, metaPixelId: pixel, siteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("Kunde inte spara."));
      onSaved({ gaMeasurementId: data.content?.gaMeasurementId, metaPixelId: data.content?.metaPixelId });
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <div className="text-[17px] font-bold">{t("Inställningar")}</div>
          <div className="text-[12px] text-ink-dim mt-0.5">{t("Språk, statistik och annonsering för hela sajten.")}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-ink-dim text-[18px] leading-none px-1">×</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-6">
        {children}

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{t("Delning och ikon")}</div>
          <p className="text-[12px] text-ink-dim leading-relaxed">
            {t("Bilden som visas när någon delar din sajt på Facebook, LinkedIn eller i ett meddelande, och ikonen i webbläsarfliken. Laddar du inte upp något skapas båda automatiskt av din toppbild, ditt namn och dina färger.")}
          </p>
          {([
            { kind: "share" as const, label: t("Delningsbild (helst 1200 x 630)"), url: shareImageUrl, wide: true },
            { kind: "favicon" as const, label: t("Ikon i webbläsarfliken (kvadratisk)"), url: faviconUrl, wide: false },
          ]).map((row) => (
            <div key={row.kind} className="flex items-center gap-3">
              {row.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.url} alt="" className={`${row.wide ? "w-24 h-14" : "w-10 h-10"} object-cover rounded-md border border-line bg-white`} />
              ) : (
                <div className={`${row.wide ? "w-24 h-14" : "w-10 h-10"} rounded-md border border-dashed border-line flex items-center justify-center text-[10px] text-ink-dim text-center`}>{t("Automatisk")}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold">{row.label}</div>
                <div className="flex gap-3 mt-1">
                  <label className="text-[12.5px] font-semibold underline cursor-pointer">
                    {metaBusy === row.kind ? t("Sparar …") : t("Ladda upp")}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={metaBusy !== null}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendMeta(row.kind, f); }} />
                  </label>
                  {row.url && (
                    <button type="button" disabled={metaBusy !== null} onClick={() => sendMeta(row.kind, null)} className="text-[12.5px] text-ink-dim underline">{t("Ta bort")}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {metaError && <p className="text-[12.5px] text-red-600">{metaError}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{t("Analys och marknadsföring")}</div>
          <p className="text-[12px] text-ink-dim leading-relaxed">
            {t("Du ser redan besökarna under Statistik. Koppla Google Analytics och Meta Pixel om du också vill följa dem där. De laddas bara hos besökare som godkänt ”Alla cookies” i cookiebannern.")}
          </p>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">{t("Google Analytics-ID")}</span>
            <input value={ga} onChange={(e) => setGa(e.target.value)} placeholder={t("G-XXXXXXXXXX")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">{t("Meta Pixel-ID")}</span>
            <input value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder={t("Bara siffror")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
          </label>
          {error && <p className="text-[12.5px] text-red-600">{error}</p>}
          {saved && !error && <p className="text-[12.5px] text-ink-dim">{t("Sparat.")}</p>}
          <button onClick={save} disabled={saving} className="bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg disabled:opacity-60">
            {saving ? t("Sparar …") : t("Spara")}
          </button>
        </div>
      </div>
    </div>
  );
}
