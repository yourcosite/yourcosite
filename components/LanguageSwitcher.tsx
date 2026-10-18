"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/I18nProvider";

// Språkväljare för hela verktyget. Valet sparas i en kaka i ett år och gäller
// nästa gång också. Tre lägen:
//  - standard: knapp med jordglob + språknamn som öppnar en lista (öppnas uppåt
//    om det inte finns plats nedanför, t.ex. i sidfoten)
//  - inline: alla språk som små knappar direkt i en meny (kontomenyn)
const GLOBE = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9z" />
  </svg>
);
const CHEVRON = (open: boolean) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const CHECK = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export default function LanguageSwitcher({
  tone = "light",
  className = "",
  inline = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  inline?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const dark = tone === "dark";

  const change = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    if (next !== locale) router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    if (!open && root.current) {
      const r = root.current.getBoundingClientRect();
      setUp(window.innerHeight - r.bottom < 340 && r.top > 340);
      setActive(Math.max(0, LOCALES.indexOf(locale)));
    }
    setOpen((v) => !v);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); if (!open) toggle(); else setActive((i) => (i + 1) % LOCALES.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) toggle(); else setActive((i) => (i - 1 + LOCALES.length) % LOCALES.length); }
    else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); change(LOCALES[active]); }
  };

  if (inline) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label="Language">
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => change(l)}
            aria-pressed={l === locale}
            className={`px-2.5 py-1 rounded-full text-[12.5px] font-semibold border ${
              l === locale ? "bg-accent text-accent-ink border-accent" : "border-line text-ink-dim hover:text-ink"
            }`}
          >
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
    );
  }

  const btn = dark
    ? "border-accent/50 text-accent hover:border-accent hover:bg-accent/10"
    : "border-accent bg-accent text-accent-ink hover:brightness-95";
  const panel = dark
    ? "bg-[#1F1F23] border-[#3A3A3E] text-[#E5E3DE]"
    : "bg-surface border-line text-ink";

  return (
    <div ref={root} className={`relative inline-block ${className}`} onKeyDown={onKey}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${btn}`}
      >
        {GLOBE}
        <span>{LOCALE_NAMES[locale]}</span>
        {CHEVRON(open)}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className={`absolute z-50 right-0 min-w-[190px] rounded-2xl border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.16)] ${panel} ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {LOCALES.map((l, i) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => change(l)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-6 rounded-xl px-3 py-2 text-left text-[13.5px] ${
                  i === active ? (dark ? "bg-white/10" : "bg-accent-soft") : ""
                } ${l === locale ? "font-semibold" : ""}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`w-7 text-[11px] font-bold uppercase tracking-wide ${dark ? "text-[#9A9892]" : "text-ink-dim"}`}>{l}</span>
                  {LOCALE_NAMES[l]}
                </span>
                {l === locale && <span className={dark ? "text-accent" : "text-ink"}>{CHECK}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
