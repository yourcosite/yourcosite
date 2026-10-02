"use client";

import { useState } from "react";
import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";

const allSites = [
  { id: "cskb", name: "CS Kommunikationsbyrå", domain: "cskb.se", status: "live", mark: "CS", gradient: "linear-gradient(135deg, #17171A, #2A2A2E)", markColor: "#C6FF5E", badgeBg: "#22C55E", badgeColor: "#06280F", badgeLabel: "LIVE", lastEdited: "idag" },
  { id: "sisu", name: "SISU Östergötland", domain: "sisuostergotland.se", status: "live", mark: "SISU", gradient: "linear-gradient(135deg, #1E3A5F, #14263F)", markColor: "#8FC7FF", badgeBg: "#22C55E", badgeColor: "#06280F", badgeLabel: "LIVE", lastEdited: "3 dagar sedan" },
  { id: "brunneby", name: "Brunneby Musteri", domain: "Ingen domän ännu", status: "utkast", mark: "Brunneby", gradient: "linear-gradient(135deg, #E8714A, #C9502B)", markColor: "#fff", badgeBg: "#FDE68A", badgeColor: "#7C4A03", badgeLabel: "UTKAST", lastEdited: "igår" },
];

const tabs = [
  { id: "alla", label: "Alla" },
  { id: "live", label: "Live" },
  { id: "utkast", label: "Utkast" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState("alla");
  const sites = allSites.filter((s) => tab === "alla" || s.status === tab);
  const liveCount = allSites.filter((s) => s.status === "live").length;

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/dashboard" />

      <div className="flex-1 px-6 md:px-12 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-[32px] font-medium">Dina sajter</h1>
            <p className="text-[15px] text-ink-dim mt-1.5">
              {allSites.length} sajter, {liveCount} av dem live.
            </p>
          </div>
          <div className="text-right bg-accent-soft rounded-xl px-4.5 py-3">
            <div className="text-[13px] text-ink font-semibold">
              38 av 60 ändringar kvar
            </div>
            <div className="text-[12px] text-ink-dim mt-0.5">
              denna månad · Standardplan
            </div>
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
              placeholder="Sök sajt eller domän"
              className="border-none outline-none text-[13.5px] flex-1 bg-transparent"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5.5 mt-6">
          {sites.map((s) => (
            <div
              key={s.id}
              className="bg-surface border border-line rounded-2xl overflow-hidden relative"
            >
              <Link href="/redigera" className="block">
                <div
                  className="h-[150px] relative flex items-end p-4"
                  style={{ background: s.gradient }}
                >
                  <span className="font-serif italic text-[20px]" style={{ color: s.markColor }}>
                    {s.mark}
                  </span>
                  <span
                    className="absolute top-3.5 left-3.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: s.badgeBg, color: s.badgeColor }}
                  >
                    {s.badgeLabel}
                  </span>
                </div>
                <div className="p-4.5">
                  <div className="font-semibold text-[16px]">{s.name}</div>
                  <div className="text-[13.5px] text-ink-dim mt-0.5">{s.domain}</div>
                  <div className="text-[12.5px] text-ink-dim mt-3">
                    Senast ändrad: {s.lastEdited}
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
      </div>
    </div>
  );
}
