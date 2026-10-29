"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { MAX_EXTRA_LANGUAGES, languageStatus, type SiteTranslations } from "@/lib/siteTranslateCore";
import type { SiteContent } from "@/lib/contentModel";
import Flag from "./Flag";

// "Språk för kundsajter" i Inställningar: huvudspråket plus upp till tre extra
// språk. Översättningen görs av Millie och gäller hela sajten. Den översatta
// versionen går att titta på men inte redigera; ändrar man något på
// huvudspråket blir språket "Behöver uppdateras" och uppdateras med ett klick.
export default function LanguageSection({
  siteId,
  baseLang,
  content,
  translations,
  onChanged,
  onView,
}: {
  siteId?: string;
  baseLang: string;
  content: SiteContent;
  translations: SiteTranslations;
  onChanged: (t: SiteTranslations) => void;
  onView: (lang: string | null) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const extra = Object.keys(translations);
  const available = LOCALES.filter((l) => l !== baseLang && !extra.includes(l));

  const run = async (action: "add" | "update" | "remove", language: string) => {
    setBusy(language);
    setError("");
    try {
      const res = await fetch("/api/sites/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, language, siteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("Något gick fel. Försök igen."));
      onChanged(data.translations || {});
      if (action === "remove") onView(null);
      else onView(language);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{t("Språk på sajten")}</div>
      <p className="text-[12px] text-ink-dim leading-relaxed">
        {t("Millie översätter hela sajten åt dig. Besökarna väljer språk med flaggorna. Du redigerar på huvudspråket, sedan uppdaterar du de andra med ett klick.")}
      </p>
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5">
        <Flag lang={baseLang} />
        <div className="flex-1 text-[13.5px] font-semibold">{LOCALE_NAMES[baseLang as Locale] ?? baseLang}</div>
        <span className="text-[11px] font-semibold text-ink-dim">{t("Huvudspråk")}</span>
      </div>
      {extra.map((l) => {
        const status = languageStatus(content, translations[l]);
        const working = busy === l;
        return (
          <div key={l} className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Flag lang={l} />
              <div className="flex-1 text-[13.5px] font-semibold">{LOCALE_NAMES[l as Locale] ?? l}</div>
              <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${working ? "bg-bg text-ink-dim" : status === "done" ? "bg-[#E4F5E8] text-[#1E6B34]" : "bg-[#FFF1D6] text-[#8A5A00]"}`}>
                {working ? t("Översätter …") : status === "done" ? t("Klar") : t("Behöver uppdateras")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button type="button" disabled={!!busy} onClick={() => onView(l)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 disabled:opacity-60">{t("Visa")}</button>
              {status === "stale" && (
                <button type="button" disabled={!!busy} onClick={() => run("update", l)} className="text-[12px] font-semibold bg-ink text-white rounded-lg px-3 py-1.5 disabled:opacity-60">{t("Uppdatera")}</button>
              )}
              <button type="button" disabled={!!busy} onClick={() => run("remove", l)} className="text-[12px] font-semibold text-ink-dim rounded-lg px-3 py-1.5 disabled:opacity-60">{t("Ta bort")}</button>
            </div>
          </div>
        );
      })}
      {extra.length < MAX_EXTRA_LANGUAGES ? (
        <div className="flex flex-col gap-2">
          <div className="text-[12.5px] font-semibold">{t("Lägg till språk")}</div>
          <div className="flex flex-wrap gap-2">
            {available.map((l) => (
              <button key={l} type="button" disabled={!!busy} onClick={() => run("add", l)} className="flex items-center gap-1.5 text-[12.5px] font-semibold border border-line bg-white rounded-full pl-1.5 pr-3 py-1.5 disabled:opacity-60">
                <Flag lang={l} size={18} />
                {busy === l ? t("Översätter …") : LOCALE_NAMES[l]}
              </button>
            ))}
          </div>
          {busy && <p className="text-[11.5px] text-ink-dim">{t("Det här tar upp till en minut. Stäng inte sidan.")}</p>}
        </div>
      ) : (
        <p className="text-[11.5px] text-ink-dim">{t("Du har {n} extra språk, det är max.", { n: MAX_EXTRA_LANGUAGES })}</p>
      )}
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
