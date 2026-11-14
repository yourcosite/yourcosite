"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

// Kalenderlänk: bokningar och bokningsbara tider i samma flöde, som kunden
// lägger in i sin egen kalender. Med en steg-för-steg-guide per kalenderapp.
const stepCls = "list-decimal pl-5 flex flex-col gap-1.5 text-[13px] text-ink-dim leading-relaxed";

export default function CalendarSync({ siteId }: { siteId: string }) {
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setToken(null);
    setError("");
    fetch(`/api/booking/calendar-feed?site=${siteId}`)
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (j.token) setToken(j.token); else setError(j.error || t("Kunde inte hämta kalenderlänken.")); })
      .catch(() => alive && setError(t("Kunde inte hämta kalenderlänken.")));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.yourcosite.com";
  const url = token ? `${origin}/api/kalender/${token}` : "";
  const webcal = url.replace(/^https?:/, "webcal:");

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* markera texten själv */ }
  };
  const renew = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/booking/calendar-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId }) });
      const j = await r.json();
      if (j.token) { setToken(j.token); setConfirming(false); } else setError(j.error || t("Kunde inte skapa kalenderlänken."));
    } finally { setBusy(false); }
  };

  return (
    <>
    <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-semibold border border-line rounded-lg px-3.5 py-1.5 bg-surface ml-auto inline-flex items-center gap-1.5">
      <span aria-hidden="true">📅</span>{t("Koppla till din kalender")}
    </button>
    {open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
    <div className="bg-surface rounded-2xl p-5 w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-[16px]">{t("Se bokningarna i din egen kalender")}</div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("Stäng")} className="text-ink-dim text-[20px] leading-none px-1">×</button>
      </div>
      <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
        {t("Lägg in länken nedan i Google Kalender, Apple Kalender eller Outlook. Då syns dina bokningar som vanliga poster, och dina bokningsbara tider syns som lediga tider som inte blockerar kalendern. Nya bokningar dyker upp av sig själva, ibland med några timmars fördröjning.")}
      </p>

      {error && <div className="text-[13px] text-warm mt-3">{error}</div>}
      {token && (
        <>
          <div className="flex items-center gap-2 mt-3">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 border border-line rounded-lg px-3 py-2 text-[12.5px] bg-bg" aria-label={t("Kalenderlänk")} />
            <button type="button" onClick={copy} className="text-[12.5px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-lg flex-shrink-0">
              {copied ? t("Kopierad ✓") : t("Kopiera")}
            </button>
          </div>
          <p className="text-[12px] text-ink-dim mt-2">{t("Länken är hemlig och bara för dig. Dela den inte med andra.")}</p>

          <div className="mt-4 flex flex-col gap-2">
            <details open className="border border-line rounded-lg px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13.5px] font-semibold">{t("Guide: Google Kalender")}</summary>
              <ol className={`${stepCls} mt-2.5`}>
                <li>{t("Kopiera länken ovan.")}</li>
                <li>{t("Öppna Google Kalender på en dator (calendar.google.com). Det går inte att göra i mobilappen.")}</li>
                <li>{t("Klicka på plustecknet bredvid \"Andra kalendrar\" i vänstermenyn och välj \"Från webbadress\".")}</li>
                <li>{t("Klistra in länken och klicka på \"Lägg till kalender\".")}</li>
                <li>{t("Kalendern dyker upp under \"Andra kalendrar\" och följer med till mobilen. Där kan du byta namn och färg på den.")}</li>
              </ol>
            </details>
            <details className="border border-line rounded-lg px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13.5px] font-semibold">{t("Guide: Apple Kalender (iPhone, iPad, Mac)")}</summary>
              <ol className={`${stepCls} mt-2.5`}>
                <li>{t("På iPhone eller iPad: öppna Inställningar, välj Kalender, Konton, Lägg till konto, Annat och sedan \"Lägg till prenumererad kalender\".")}</li>
                <li>{t("Klistra in länken som server och tryck på Nästa, sedan Spara.")}</li>
                <li>{t("På Mac: öppna Kalender, välj Arkiv och sedan \"Ny kalenderprenumeration\", klistra in länken och klicka på Prenumerera.")}</li>
                <li>{t("Du kan också trycka här för att öppna den direkt i Apple Kalender:")} <a href={webcal} className="underline font-semibold">{t("Prenumerera")}</a></li>
              </ol>
            </details>
            <details className="border border-line rounded-lg px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13.5px] font-semibold">{t("Guide: Outlook")}</summary>
              <ol className={`${stepCls} mt-2.5`}>
                <li>{t("Öppna Outlook på webben (outlook.com) och gå till Kalender.")}</li>
                <li>{t("Välj \"Lägg till kalender\" och sedan \"Prenumerera från webben\".")}</li>
                <li>{t("Klistra in länken, ge kalendern ett namn och klicka på Importera.")}</li>
              </ol>
            </details>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[12.5px] text-ink-dim">
            {confirming ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span>{t("Den gamla länken slutar fungera. Du måste lägga in den nya i din kalender igen.")}</span>
                <button type="button" onClick={() => setConfirming(false)} className="font-semibold px-3 py-1.5 border border-line rounded-lg">{t("Avbryt")}</button>
                <button type="button" disabled={busy} onClick={renew} className="font-bold text-white bg-warm px-3 py-1.5 rounded-lg disabled:opacity-60">{t("Skapa ny länk")}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="underline">{t("Har länken kommit i orätta händer? Skapa en ny")}</button>
            )}
          </div>
        </>
      )}
    </div>
    </div>
    )}
    </>
  );
}
