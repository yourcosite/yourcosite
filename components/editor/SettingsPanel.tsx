"use client";

import { prepareImage } from "@/lib/imageUpload";
import { useEffect, useState } from "react";
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
  shareTitle,
  shareDescription,
  onTextSaved,
  onDirtyChange,
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
  shareTitle?: string;
  shareDescription?: string;
  onTextSaved: (values: { title?: string; description?: string }) => void;
  onSaved: (values: { gaMeasurementId?: string; metaPixelId?: string }) => void;
  onMetaSaved: (values: { shareImageUrl?: string; faviconUrl?: string }) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  const [ga, setGa] = useState(gaMeasurementId || "");
  const [pixel, setPixel] = useState(metaPixelId || "");
  const [shTitle, setShTitle] = useState(shareTitle || "");
  const [shDesc, setShDesc] = useState(shareDescription || "");
  // Bilder väljs här men laddas upp först när man trycker på Spara.
  const [pendingImg, setPendingImg] = useState<{ share?: File | "remove"; favicon?: File | "remove" }>({});
  const [previews, setPreviews] = useState<{ share?: string; favicon?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const pickImage = (kind: "share" | "favicon", f: File | "remove") => {
    setPendingImg((p) => ({ ...p, [kind]: f }));
    setPreviews((p) => ({ ...p, [kind]: f === "remove" ? undefined : URL.createObjectURL(f) }));
    setSaved(false);
  };

  const dirty =
    Object.keys(pendingImg).length > 0 ||
    shTitle !== (shareTitle || "") ||
    shDesc !== (shareDescription || "") ||
    ga !== (gaMeasurementId || "") ||
    pixel !== (metaPixelId || "");

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const close = () => {
    if (dirty && !window.confirm(t("Du har osparade ändringar i Inställningar. Vill du lämna utan att spara?"))) return;
    onDirtyChange?.(false);
    onClose();
  };

  const suggestShareText = async () => {
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch("/api/sites/share-text-assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("Kunde inte hämta ett förslag just nu."));
      setShTitle(data.title || "");
      setShDesc(data.description || "");
      setSaved(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  // En enda Spara: bilder, delningstext och spårning sparas efter varandra.
  const saveAll = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      for (const kind of ["share", "favicon"] as const) {
        const f = pendingImg[kind];
        if (!f) continue;
        const fd = new FormData();
        fd.append("kind", kind);
        if (siteId) fd.append("siteId", siteId);
        if (f === "remove") fd.append("remove", "1");
        else fd.append("file", await prepareImage(f, { maxDim: kind === "favicon" ? 512 : 1600 }));
        const res = await fetch("/api/sites/site-meta", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("Kunde inte spara."));
        onMetaSaved({ shareImageUrl: data.content?.shareImageUrl, faviconUrl: data.content?.faviconUrl });
        setPendingImg((p) => { const n = { ...p }; delete n[kind]; return n; });
        setPreviews((p) => ({ ...p, [kind]: undefined }));
      }
      if (shTitle !== (shareTitle || "") || shDesc !== (shareDescription || "")) {
        const fd = new FormData();
        fd.append("kind", "text");
        if (siteId) fd.append("siteId", siteId);
        fd.append("title", shTitle);
        fd.append("description", shDesc);
        const res = await fetch("/api/sites/site-meta", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("Kunde inte spara."));
        const home = (data.content?.pages || []).find((p: any) => p.path === "/") || data.content?.pages?.[0];
        onTextSaved({ title: home?.seoTitle, description: home?.seoDescription });
        setShTitle(home?.seoTitle || "");
        setShDesc(home?.seoDescription || "");
      }
      if (ga !== (gaMeasurementId || "") || pixel !== (metaPixelId || "")) {
        const res = await fetch("/api/sites/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gaMeasurementId: ga, metaPixelId: pixel, siteId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("Kunde inte spara."));
        onSaved({ gaMeasurementId: data.content?.gaMeasurementId, metaPixelId: data.content?.metaPixelId });
        setGa(data.content?.gaMeasurementId || "");
        setPixel(data.content?.metaPixelId || "");
      }
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
        <button type="button" onClick={close} aria-label={t("Stäng")} className="text-ink-dim text-[18px] leading-none px-1">×</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-10 md:pb-6 flex flex-col gap-6">
        {children}

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{t("Delning och ikon")}</div>
          <p className="text-[12px] text-ink-dim leading-relaxed">
            {t("Bilden som visas när någon delar din sajt på Facebook, LinkedIn eller i ett meddelande, och ikonen i webbläsarfliken. Laddar du inte upp något skapas båda automatiskt av din toppbild, ditt namn och dina färger.")}
          </p>
          {([
            { kind: "share" as const, label: t("Delningsbild (helst 1200 x 630)"), url: pendingImg.share === "remove" ? undefined : previews.share || shareImageUrl, wide: true },
            { kind: "favicon" as const, label: t("Ikon i webbläsarfliken (kvadratisk)"), url: pendingImg.favicon === "remove" ? undefined : previews.favicon || faviconUrl, wide: false },
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
                    {t("Ladda upp")}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={saving}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickImage(row.kind, f); }} />
                  </label>
                  {row.url && (
                    <button type="button" disabled={saving} onClick={() => pickImage(row.kind, "remove")} className="text-[12.5px] text-ink-dim underline">{t("Ta bort")}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2.5 pt-1">
            <label className="block">
              <span className="block text-[12.5px] font-semibold mb-1">{t("Rubrik vid delning")}</span>
              <input value={shTitle} maxLength={90} onChange={(e) => { setShTitle(e.target.value); setSaved(false); }} placeholder={t("Till exempel namnet på din verksamhet")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold mb-1">{t("Text vid delning")}</span>
              <textarea value={shDesc} maxLength={220} rows={3} onChange={(e) => { setShDesc(e.target.value); setSaved(false); }} placeholder={t("En kort mening som beskriver din sajt")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
            </label>
            <p className="text-[12px] text-ink-dim leading-relaxed">{t("Gäller startsidan och visas också som rubrik och beskrivning i Google. Lämnar du fälten tomma används ditt sajtnamn. Facebook och andra kan spara en gammal förhandsvisning i några dagar efter att du ändrat.")}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={suggestShareText} disabled={suggesting || saving} className="text-[13px] font-semibold border border-line px-4 py-2 rounded-lg bg-white disabled:opacity-60">{suggesting ? t("Millie funderar …") : t("Få förslag från Millie")}</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{t("Analys och marknadsföring")}</div>
          <p className="text-[12px] text-ink-dim leading-relaxed">
            {t("Du ser redan besökarna under Statistik. Koppla Google Analytics och Meta Pixel om du också vill följa dem där. De laddas bara hos besökare som godkänt ”Alla cookies” i cookiebannern.")}
          </p>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">{t("Google Analytics-ID")}</span>
            <input value={ga} onChange={(e) => { setGa(e.target.value); setSaved(false); }} placeholder={t("G-XXXXXXXXXX")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">{t("Meta Pixel-ID")}</span>
            <input value={pixel} onChange={(e) => { setPixel(e.target.value); setSaved(false); }} placeholder={t("Bara siffror")} className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] bg-white" />
          </label>
        </div>
      </div>
      <div className="border-t border-line bg-[#F7F5F2] px-5 py-3 flex items-center gap-3 flex-wrap">
        <button type="button" onClick={saveAll} disabled={saving || !dirty} className="bg-ink text-white font-semibold text-[13.5px] px-6 py-2.5 rounded-lg disabled:opacity-50">
          {saving ? t("Sparar …") : t("Spara")}
        </button>
        {error && <span className="text-[12.5px] text-red-600">{error}</span>}
        {!error && saved && !dirty && <span className="text-[12.5px] text-[#166534] font-semibold">{t("Dina ändringar är sparade ✓")}</span>}
        {!error && dirty && !saving && <span className="text-[12.5px] text-ink-dim">{t("Du har osparade ändringar.")}</span>}
      </div>
    </div>
  );
}
