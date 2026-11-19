"use client";

import { useEffect } from "react";

// Skickar fel som händer i besökarens webbläsare till /api/log-error.
// Samma fel rapporteras högst en gång per sidvisning, och högst fem totalt.
const seen = new Set<string>();

// Fel som kommer från appars inbyggda webbläsare (Instagram, Facebook och
// liknande) och deras egen kod, inte från vår sajt. Rapporteras inte.
const IGNORED = [
  /Java object is gone/i,
  /Error invoking postMessage/i,
  /window\.webkit\.messageHandlers/i,
  /ResizeObserver/i,
  /\["@context"\]\.toLowerCase/i, // JSON-LD-läsare i appars webbläsare och tillägg
];

export function reportClientError(message: string, stack?: string | null, context?: string) {
  try {
    const key = message.slice(0, 120);
    if (!message || IGNORED.some((re) => re.test(message)) || seen.has(key) || seen.size >= 5) return;
    seen.add(key);
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stack: stack ?? null, url: location.pathname + location.search, context: context ?? null }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      reportClientError(e.message, e.error?.stack, "window.onerror");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason;
      reportClientError(r?.message || String(r), r?.stack, "unhandledrejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
