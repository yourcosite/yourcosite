"use client";

import { useT } from "@/components/I18nProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import type { SiteContent } from "@/lib/contentModel";
import { analyzeSeo, type SeoNewsInput } from "@/lib/seoAnalysis";

type Site = { id: string; name?: string; content: SiteContent; translations?: Record<string, unknown> | null };

// "Det här behöver du utveckla": sökmotoranalys av kundens sajt. Reglerna körs
// i webbläsaren mot sajtens innehåll (lib/seoAnalysis.ts), utan AI-anrop.
//
// Körs både som egen sida (/forbattra) och som panel i redigeraren (embedded).
// I panelen får den sajtens innehåll direkt från redigeraren, så betyget alltid
// följer det som syns, och "Fixa med Millie" fyller i meddelanderutan i stället
// för att byta sida.
export default function ImproveManager({
  siteId,
  embedded = false,
  content,
  news: newsProp,
  extraLanguages,
  onAsk,
}: {
  siteId?: string;
  embedded?: boolean;
  content?: SiteContent;
  news?: SeoNewsInput;
  extraLanguages?: number;
  onAsk?: (ask: string) => void;
} = {}) {
  const t = useT();
  const [site, setSite] = useState<Site | null>(null);
  const [news, setNews] = useState<SeoNewsInput>([]);
  const [loadError, setLoadError] = useState("");
  const [siteIdParam, setSiteIdParam] = useState("");
  const [scanning, setScanning] = useState(false);

  const load = (requested: string) => {
    return Promise.all([
      fetch(`/api/sites/mine${requested ? `?id=${encodeURIComponent(requested)}` : ""}`).then((r) => r.json()),
      fetch(`/api/news${requested ? `?siteId=${encodeURIComponent(requested)}` : ""}`).then((r) => r.json()).catch(() => ({ articles: [] })),
    ]).then(([s, n]) => {
      if (!s.site) {
        setLoadError(t("Hittade ingen genererad sajt ännu."));
        return;
      }
      setSite(s.site);
      setNews(Array.isArray(n.articles) ? n.articles : []);
    });
  };

  useEffect(() => {
    if (content) return; // innehållet kommer redan från redigeraren
    let requested = siteId || "";
    try {
      if (!requested) requested = new URLSearchParams(window.location.search).get("site") || "";
    } catch {
      // Faller tillbaka på senaste sajten.
    }
    setSiteIdParam(requested);
    load(requested).catch(() => setLoadError(t("Kunde inte hämta sajten.")));
  }, []);

  const rerun = () => {
    setScanning(true);
    if (content) { setTimeout(() => setScanning(false), 500); return; }
    load(siteIdParam).catch(() => {}).finally(() => setTimeout(() => setScanning(false), 500));
  };

  const redigeraHref = (ask?: string) => {
    const params = new URLSearchParams();
    if (siteIdParam) params.set("site", siteIdParam);
    if (ask) params.set("fraga", ask);
    const qs = params.toString();
    return `/redigera${qs ? `?${qs}` : ""}`;
  };

  const seoContent = content ?? site?.content;
  const res = seoContent ? analyzeSeo(seoContent, newsProp ?? news, new Date(), extraLanguages ?? Object.keys(site?.translations || {}).length) : null;
  const label = !res ? "" : res.score >= 90 ? t("Mycket bra") : res.score >= 70 ? t("Bra") : res.score >= 50 ? t("Bra start") : t("Behöver arbete");

  return (
    <div className={embedded ? "font-sans" : "min-h-screen bg-bg font-sans flex flex-col"}>
      {!embedded && <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5 bg-line" />
          <div className="text-[14px] font-semibold">{site?.name || t("Din sajt")}</div>
        </div>
        <Link href={redigeraHref()} className="text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full">
          {t("← Till redigeraren")}
        </Link>
      </div>}

      <div className={embedded ? "" : "flex-1 px-6 md:px-12 py-8 flex justify-center"}>
        <div className={embedded ? "w-full" : "w-full max-w-[680px]"}>
          {!embedded && <h1 className="text-[27px] font-medium mb-1.5">{t("Det här behöver du utveckla")}</h1>}
          {!embedded && <p className="text-[13.5px] text-ink-dim mb-5">{t("Tips för att synas bättre på Google, baserat på din sajt.")}</p>}

          {loadError && <div className="text-[14px] text-ink-dim">{loadError}</div>}
          {!res && !loadError && <div className="text-[14px] text-ink-dim">…</div>}

          {res && (
            <>
              <div className="bg-surface border border-line rounded-2xl p-5 flex items-center gap-5 mb-4">
                <div className="text-[44px] font-extrabold leading-none">
                  {res.score}
                  <span className="text-[16px] font-semibold text-ink-dim">/100</span>
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold">{label}</div>
                  <div className="h-2 rounded bg-[#EEECE7] mt-2 overflow-hidden">
                    <div className="h-2 rounded bg-accent" style={{ width: `${res.score}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-[12.5px] text-ink-dim leading-snug">
                  {t("{n} punkter sköter YourCoSite åt dig automatiskt. De räknas in i betyget.", { n: res.auto })}
                </div>
                <button
                  type="button"
                  onClick={rerun}
                  disabled={scanning}
                  className="text-[12.5px] font-semibold border border-line bg-surface rounded-full px-3.5 py-2 flex-shrink-0"
                >
                  {scanning ? t("Analyserar …") : t("Analysera igen")}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {res.groups.map((g) => (
                  <div key={g.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between">
                      <b className="text-[14px]">{t(g.title)}</b>
                      <span className="text-[12px] text-ink-dim">{t("{a} av {b} p", { a: g.earned, b: g.total })}</span>
                    </div>
                    <div className="h-1.5 rounded bg-[#EEECE7] overflow-hidden">
                      <div className="h-1.5 bg-accent" style={{ width: `${g.total ? Math.round((g.earned / g.total) * 100) : 0}%` }} />
                    </div>
                    {g.items.map((it) => {
                      if (it.kind === "na") {
                        return (
                          <div key={it.id} className="text-[13px] flex items-center gap-2.5 text-ink-dim">
                            <span className="w-[18px] h-[18px] rounded-full border-[1.5px] border-dashed border-[#C9C6BE] flex-shrink-0" />
                            <span className="flex-1">{t(it.title)}</span>
                            <span className="text-[11px]">{t("Gäller när du lägger till språk")}</span>
                          </div>
                        );
                      }
                      if (it.done) {
                        return (
                          <div key={it.id} className="text-[13px] flex items-center gap-2.5">
                            <span className={`w-[18px] h-[18px] rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${it.kind === "auto" ? "bg-accent text-accent-ink" : "bg-accent-soft text-[#3B5300]"}`}>✓</span>
                            <span className="flex-1">{t(it.title)}</span>
                            {it.kind === "auto" && (
                              <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 bg-accent-soft text-[#3B5300]">{t("Automatiskt")}</span>
                            )}
                            <span className="text-[11.5px] text-ink-dim">{it.pts} p</span>
                          </div>
                        );
                      }
                      return (
                        <div key={it.id} className="pl-2.5 py-0.5 flex flex-col gap-1.5" style={{ borderLeft: `3px solid ${it.tone === "red" ? "#E5484D" : "#E0A526"}` }}>
                          <div className="flex justify-between gap-2 text-[13px]">
                            <b>{t(it.title)}</b>
                            <span className="text-[11.5px] text-ink-dim flex-shrink-0">+{it.pts} p</span>
                          </div>
                          {it.why && <div className="text-[12px] text-ink-dim leading-snug">{t(it.why, { n: it.n ?? 0 })}</div>}
                          {it.ask && (embedded ? (
                            <button
                              type="button"
                              onClick={() => onAsk?.(it.ask!)}
                              className="self-start text-[12px] font-semibold rounded-full px-3 py-1.5 bg-accent text-accent-ink"
                            >
                              {t("Fixa med Millie")}
                            </button>
                          ) : (
                            <Link
                              href={redigeraHref(it.ask)}
                              className="self-start text-[12px] font-semibold rounded-full px-3 py-1.5 bg-accent text-accent-ink"
                            >
                              {t("Fixa med Millie")}
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="text-[11.5px] text-ink-dim leading-snug mt-4">
                {t("Betyget bygger på god praxis för sökmotorer och är ingen garanti för placering på Google.")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
