"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT, useLocale } from "@/components/I18nProvider";
import { msg } from "@/lib/i18n/config";
import type { SiteContent } from "@/lib/contentModel";

type Version = { id: string; reason: string | null; createdAt: string; pages: number; sections: number; words: number };
type Counts = { pages: number; sections: number; words: number };

const REASONS: Record<string, string> = {
  edit: msg("Före en ändring av Millie"),
  restore: msg("Före en återställning"),
  "replace-image": msg("Före ett bildbyte"),
  "edit-text": msg("Före en textändring"),
  "edit-layout": msg("Före en layoutändring"),
  "edit-gallery": msg("Före en galleriändring"),
  "edit-team": msg("Före en ändring av personer"),
  "edit-menu": msg("Före en ändring av menyn"),
  "edit-icon": msg("Före en ikonändring"),
  "edit-theme": msg("Före en designändring"),
  "edit-button-style": msg("Före en knappstilsändring"),
  "edit-embed": msg("Före en ändring av inbäddad kod"),
};
const DEFAULT_REASON = msg("Före en ändring");

// Tidigare versioner av sajten (sparas på servern före varje ändring, se
// lib/siteVersions.ts). Kunden väljer en och sajten återställs till den.
export default function VersionsModal({
  siteId,
  onClose,
  onRestored,
}: {
  siteId?: string;
  onClose: () => void;
  onRestored: (content: SiteContent, when: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [current, setCurrent] = useState<Counts | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/versions${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        setVersions(d.versions || []);
        setCurrent(d.current || null);
        setUnavailable(!!d.unavailable);
      })
      .catch(() => !cancelled && setError(t("Det gick inte att läsa versionerna.")));
    return () => { cancelled = true; };
  }, [siteId, t]);

  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  const restore = async (v: Version) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sites/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, versionId: v.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      onRestored(data.content, fmt(v.createdAt));
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const body = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <div className="text-[17px] font-bold">{t("Tidigare versioner")}</div>
            <div className="text-[12.5px] text-ink-dim mt-1 leading-snug">
              {t("Innan varje ändring sparas en kopia av sajten. Välj en version för att gå tillbaka till hur sajten såg ut då. Din nuvarande sajt sparas också, så du kan ångra återställningen.")}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-ink-dim text-[18px] leading-none px-1">×</button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 flex flex-col gap-2">
          {error && <p className="text-[12.5px] text-red-600">{error}</p>}
          {versions === null && !error && <p className="text-[13px] text-ink-dim">{t("Hämtar …")}</p>}
          {unavailable && <p className="text-[13px] text-ink-dim">{t("Versionshistoriken är inte aktiverad än.")}</p>}
          {versions && versions.length === 0 && !unavailable && <p className="text-[13px] text-ink-dim">{t("Inga sparade versioner än. De dyker upp efter nästa ändring.")}</p>}
          {current && versions && versions.length > 0 && (
            <div className="text-[12px] text-ink-dim px-1">
              {t("Nu: {pages} sidor, {sections} sektioner, ca {words} ord", { pages: current.pages, sections: current.sections, words: current.words })}
            </div>
          )}
          {(versions || []).map((v) => (
            <div key={v.id} className="border border-line rounded-xl px-3.5 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">{fmt(v.createdAt)}</div>
                <div className="text-[12px] text-ink-dim">{t(REASONS[v.reason || ""] || DEFAULT_REASON)}</div>
                <div className="text-[12px] text-ink-dim">{t("{pages} sidor, {sections} sektioner, ca {words} ord", { pages: v.pages, sections: v.sections, words: v.words })}</div>
              </div>
              {confirmId === v.id ? (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button type="button" disabled={busy} onClick={() => restore(v)} className="text-[12px] font-semibold rounded-full px-3 py-1.5 bg-accent text-accent-ink disabled:opacity-60">
                    {busy ? t("Återställer …") : t("Ja, återställ")}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirmId(null)} className="text-[12px] text-ink-dim">{t("Avbryt")}</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmId(v.id)} className="text-[12px] font-semibold rounded-full px-3 py-1.5 bg-bg border border-line flex-shrink-0">
                  {t("Återställ")}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
