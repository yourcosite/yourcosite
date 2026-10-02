"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Page = { id: string; label: string; path: string; status: "live" | "utkast"; locked: boolean };

const initialPages: Page[] = [
  { id: "start", label: "Startsida", path: "/", status: "live", locked: true },
  { id: "om", label: "Om oss", path: "/om-oss", status: "live", locked: false },
  { id: "tjanster", label: "Vad vi gör", path: "/vad-vi-gor", status: "live", locked: false },
  { id: "nyheter", label: "Nyheter", path: "/nyheter", status: "live", locked: false },
  { id: "kontakt", label: "Kontakt", path: "/kontakt", status: "live", locked: false },
];

const statusLabels = { live: "Publicerad", utkast: "Utkast" };

export default function PagesManagePage() {
  const [pages, setPages] = useState(initialPages);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [justRemoved, setJustRemoved] = useState<string | null>(null);
  const [customCount, setCustomCount] = useState(0);

  const confirmRemove = (p: Page) => {
    setPages((ps) => ps.filter((x) => x.id !== p.id));
    setPendingRemoveId(null);
    setJustRemoved(p.label);
  };

  const addPage = () => {
    const n = customCount + 1;
    setPages((ps) => [
      ...ps,
      { id: `custom-${n}`, label: `Ny sida ${n}`, path: `/ny-sida-${n}`, status: "utkast", locked: false },
    ]);
    setCustomCount(n);
  };

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">Brunneby Musteri</div>
            <div className="text-[11.5px] text-ink-dim">Live · brunnebymusteri.se</div>
          </div>
        </div>
        <Link
          href="/redigera"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
        >
          ← Till redigeraren
        </Link>
      </div>

      <div className="flex-1 px-6 md:px-12 py-8 flex justify-center">
        <div className="w-full max-w-[680px]">
          <h1 className="text-[27px] font-medium mb-1.5">Sidor</h1>
          <p className="text-[13.5px] text-ink-dim mb-5.5">
            Hantera sidorna på er live-sajt. En borttagen sida slutar genast
            visas för besökare.
          </p>

          <div className="flex flex-col gap-2.5 mb-4.5">
            {pages.map((p) => {
              const confirming = pendingRemoveId === p.id;
              return (
                <div key={p.id} className="border border-line rounded-xl px-4 py-3.5 bg-surface">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                      <line x1="8" y1="8" x2="16" y2="8" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-semibold text-[14.5px]">{p.label}</div>
                      <div className="text-[12px] text-ink-dim mt-0.5">
                        {p.path} · {statusLabels[p.status]}
                      </div>
                    </div>
                    {p.locked && (
                      <span className="text-[11px] text-ink-dim font-semibold">Krävs av sajten</span>
                    )}
                    {!p.locked && !confirming && (
                      <button
                        onClick={() => setPendingRemoveId(p.id)}
                        aria-label={`Ta bort ${p.label}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-dim flex-shrink-0"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    )}
                    {confirming && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setPendingRemoveId(null)}
                          className="text-[12.5px] font-semibold text-ink-dim px-3 py-1.5 border border-line rounded-lg"
                        >
                          Avbryt
                        </button>
                        <button
                          onClick={() => confirmRemove(p)}
                          className="text-[12.5px] font-bold text-white bg-warm px-3 py-1.5 rounded-lg"
                        >
                          Ta bort permanent
                        </button>
                      </div>
                    )}
                  </div>
                  {confirming && (
                    <div className="mt-2.5 pt-2.5 border-t border-line text-[12.5px] text-warm font-semibold">
                      Detta tar bort sidan permanent från den publicerade sajten. Går inte att ångra.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {justRemoved && (
            <div className="flex items-center gap-2.5 bg-accent-soft rounded-lg px-4 py-3 mb-4.5 text-[13px] text-ink font-semibold">
              &ldquo;{justRemoved}&rdquo; har tagits bort och syns inte längre på sajten.
            </div>
          )}

          <button onClick={addPage} className="flex items-center gap-2 text-ink font-semibold text-[13.5px] py-1.5">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Lägg till ny sida
          </button>
        </div>
      </div>
    </div>
  );
}
