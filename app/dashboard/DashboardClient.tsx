"use client";

import { useState } from "react";
import Link from "next/link";
import SitePreview from "@/components/SitePreview";
import type { SiteContent } from "@/lib/contentModel";

export type SiteRow = {
  id: string;
  name: string;
  domain: string | null;
  status: "draft" | "live";
  // Satt bara för sajter som hunnit till redigeringssteget (se
  // app/dashboard/page.tsx) — då visar kortet en riktig, levande
  // förhandsvisning istället för gradient-platshållaren nedan.
  content?: SiteContent | null;
};

const tabs = [
  { id: "alla", label: "Alla" },
  { id: "live", label: "Live" },
  { id: "utkast", label: "Utkast" },
];

const gradients = [
  "linear-gradient(135deg, #17171A, #2A2A2E)",
  "linear-gradient(135deg, #1E3A5F, #14263F)",
  "linear-gradient(135deg, #E8714A, #C9502B)",
  "linear-gradient(135deg, #2F5D50, #1B3A31)",
];

export default function DashboardClient({ sites: initialSites }: { sites: SiteRow[] }) {
  const [sites, setSites] = useState(initialSites);
  const [tab, setTab] = useState("alla");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const liveCount = sites.filter((s) => s.status === "live").length;

  const deleteSite = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte ta bort sajten.");
      }
      setSites((s) => s.filter((x) => x.id !== id));
      setConfirmId(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = sites.filter((s) => {
    const statusMatch = tab === "alla" || (tab === "live" ? s.status === "live" : s.status === "draft");
    const searchMatch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.domain ?? "").toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 className="text-[32px] font-medium">Dina sajter</h1>
          <p className="text-[15px] text-ink-dim mt-1.5">
            {sites.length} {sites.length === 1 ? "sajt" : "sajter"}, {liveCount} av dem live.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-7 flex-wrap gap-3">
        <div className="flex gap-1.5 bg-surface border border-line rounded-[10px] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-[13.5px] font-semibold ${
                tab === t.id ? "bg-accent text-accent-ink" : "text-ink-dim"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-surface border border-line rounded-[10px] px-3.5 py-2 w-[240px]">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök sajt eller domän"
            className="border-none outline-none text-[13.5px] flex-1 bg-transparent"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5.5 mt-6">
        {filtered.map((s, i) => (
          <div
            key={s.id}
            className="bg-surface border border-line rounded-2xl overflow-hidden relative"
          >
            <button
              type="button"
              aria-label={`Ta bort ${s.name}`}
              onClick={(e) => {
                e.preventDefault();
                setConfirmId(s.id);
              }}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>

            {confirmId === s.id && (
              <div className="absolute inset-0 z-20 bg-black/70 flex flex-col items-center justify-center text-center p-5 gap-3">
                <p className="text-[13.5px] text-white leading-relaxed">
                  Ta bort <span className="font-semibold">{s.name}</span>{" "}
                  permanent? Det här kan inte ångras.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-[12.5px] font-semibold text-white border border-white/40 px-3.5 py-2 rounded-lg"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSite(s.id)}
                    disabled={deletingId === s.id}
                    className="text-[12.5px] font-semibold bg-red-600 text-white px-3.5 py-2 rounded-lg disabled:opacity-60"
                  >
                    {deletingId === s.id ? "Tar bort …" : "Ta bort"}
                  </button>
                </div>
              </div>
            )}

            <Link href="/redigera" className="block">
              <div className="aspect-[4/3] relative overflow-hidden" style={!s.content ? { background: gradients[i % gradients.length] } : undefined}>
                {s.content ? (
                  // En riktig, levande miniatyr av startsidan — samma knep
                  // som stilförslagen i /forslag: rendera hela sajten i full
                  // storlek och skala ner den med CSS istället för att
                  // generera och lagra en skärmdump någonstans.
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-[400%] origin-top-left" style={{ transform: "scale(0.25)" }}>
                      <SitePreview content={s.content} siteName={s.name} />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-end p-4">
                    <span className="font-serif italic text-[20px] text-white">
                      {s.name.split(" ")[0]}
                    </span>
                  </div>
                )}
                <span
                  className="absolute top-3.5 left-3.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={
                    s.status === "live"
                      ? { background: "#22C55E", color: "#06280F" }
                      : { background: "#FDE68A", color: "#7C4A03" }
                  }
                >
                  {s.status === "live" ? "LIVE" : "UTKAST"}
                </span>
              </div>
              <div className="p-4.5">
                <div className="font-semibold text-[16px]">{s.name}</div>
                <div className="text-[13.5px] text-ink-dim mt-0.5">
                  {s.domain || "Ingen domän ännu"}
                </div>
              </div>
            </Link>
          </div>
        ))}

        <Link
          href="/onboarding/1"
          className="flex flex-col items-center justify-center gap-2.5 bg-surface border-[1.5px] border-dashed border-line rounded-2xl min-h-[248px] text-ink-dim"
        >
          <div className="w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#17171A" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[14.5px] font-semibold text-ink">Skapa ny sajt</span>
        </Link>
      </div>

      {sites.length === 0 && (
        <p className="text-[13.5px] text-ink-dim mt-6">
          Du har inga sajter än — klicka på &rdquo;Skapa ny sajt&rdquo; för att komma igång.
        </p>
      )}
    </div>
  );
}
