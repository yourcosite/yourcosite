"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile (robotskydd). Visas bara om NEXT_PUBLIC_TURNSTILE_SITE_KEY
// är satt, annars gör den ingenting och inloggning/registrering fungerar som förut.
// Varje token går bara att använda en gång: öka `resetSignal` efter varje försök
// så hämtas en ny.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export default function TurnstileWidget({ onToken, resetSignal = 0 }: { onToken: (token: string | null) => void; resetSignal?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | undefined>(undefined);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile || idRef.current) return;
      idRef.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => cb.current(token),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    });
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (resetSignal && idRef.current && window.turnstile) {
      cb.current(null);
      window.turnstile.reset(idRef.current);
    }
  }, [resetSignal]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="my-1" />;
}
