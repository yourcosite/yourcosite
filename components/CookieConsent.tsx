"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

// Frågar om statistik- och marknadsföringscookies (Google Tag Manager / Analytics, Meta Pixel) på de publika
// sidorna. Svaret sparas i webbläsaren; tills besökaren sagt ja skickas inga
// analys- eller marknadsföringscookies (Consent Mode i app/layout.tsx).
const KEY = "ycs-consent";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void }
}

export default function CookieConsent() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const answer = (granted: boolean) => {
    try { localStorage.setItem(KEY, granted ? "granted" : "denied"); } catch { /* tyst */ }
    window.gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
    window.fbq?.("consent", granted ? "grant" : "revoke");
    setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label={t("Cookies")} className="fixed bottom-3 left-3 right-3 md:left-auto md:right-5 md:bottom-5 md:max-w-[380px] z-[80] bg-surface border border-line rounded-2xl p-4 shadow-xl">
      <p className="text-[13px] text-ink leading-relaxed mb-3">
        {t("Vi använder cookies för besöksstatistik och för att mäta vår marknadsföring (Google och Meta). Du väljer själv.")}{" "}
        <a href="/integritetspolicy" className="underline font-semibold">{t("Läs mer")}</a>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => answer(true)} className="flex-1 text-[13px] font-semibold bg-accent text-accent-ink rounded-lg px-3 py-2">{t("Godkänn")}</button>
        <button type="button" onClick={() => answer(false)} className="flex-1 text-[13px] font-semibold border border-line rounded-lg px-3 py-2">{t("Avböj")}</button>
      </div>
    </div>
  );
}
