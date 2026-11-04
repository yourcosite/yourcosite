"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Låter innehåll glida in när det kommer i bild (se .yc-reveal i globals.css).
// Innehållet är synligt från början (även utan JavaScript) — först när
// komponenten startat i webbläsaren och elementet ligger utanför bild döljs
// det för att sedan glida in, så inget blinkar för det som redan syns.
// Respekterar "minska rörelse" i systemet.
export default function Reveal({
  children,
  from = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  from?: "up" | "left" | "right" | "zoom";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "hidden" | "shown">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return; // syns redan — ingen animation
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`yc-reveal ${className}`}
      data-from={from}
      data-state={state}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
