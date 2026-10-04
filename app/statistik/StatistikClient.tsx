"use client";

import { useState } from "react";

type Day = { date: string; label: string; count: number };
type PathCount = { path: string; count: number };
type ReferrerCount = { referrer: string; count: number };
type FormSubmission = {
  id: string;
  pagePath: string;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: string;
};

export default function StatistikClient({
  days,
  topPages,
  topReferrers,
  total,
  today,
  formSubmissions,
}: {
  days: Day[];
  topPages: PathCount[];
  topReferrers: ReferrerCount[];
  total: number;
  today: number;
  formSubmissions: FormSubmission[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const avgPerDay = days.length ? Math.round((total / days.length) * 10) / 10 : 0;
  const maxPathCount = Math.max(1, ...topPages.map((p) => p.count));
  const maxReferrerCount = Math.max(1, ...topReferrers.map((r) => r.count));

  return (
    <div className="flex flex-col gap-6">
      {/* Stat-brickor */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[12px] text-ink-dim font-semibold mb-1.5">Sidvisningar, 30 dagar</div>
          <div className="text-[26px] font-medium">{total}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[12px] text-ink-dim font-semibold mb-1.5">Idag</div>
          <div className="text-[26px] font-medium">{today}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[12px] text-ink-dim font-semibold mb-1.5">Snitt per dag</div>
          <div className="text-[26px] font-medium">{avgPerDay}</div>
        </div>
      </div>

      {/* Stapeldiagram */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <div className="text-[13.5px] font-semibold mb-4">Sidvisningar per dag</div>
        <div className="relative flex items-end gap-[3px] h-[140px]">
          {days.map((d, i) => (
            <div
              key={d.date}
              className="flex-1 h-full flex items-end relative"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            >
              {hover === i && (
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-ink text-white text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none">
                  {d.count} · {d.label}
                </div>
              )}
              <div
                className="w-full rounded-t-[4px] bg-accent transition-opacity"
                style={{
                  height: `${Math.max(2, (d.count / max) * 100)}%`,
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10.5px] text-ink-dim">
          <span>{days[0]?.label}</span>
          <span>{days[days.length - 1]?.label}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[13.5px] font-semibold mb-3.5">Mest besökta sidor</div>
          {topPages.length === 0 && <p className="text-[12.5px] text-ink-dim">Inga sidvisningar än.</p>}
          <div className="flex flex-col gap-2.5">
            {topPages.map((p) => (
              <div key={p.path}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-medium truncate">{p.path}</span>
                  <span className="text-ink-dim flex-shrink-0 ml-2">{p.count}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(p.count / maxPathCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[13.5px] font-semibold mb-3.5">Källor</div>
          {topReferrers.length === 0 && <p className="text-[12.5px] text-ink-dim">Inga sidvisningar än.</p>}
          <div className="flex flex-col gap-2.5">
            {topReferrers.map((r) => (
              <div key={r.referrer}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-medium truncate">{r.referrer}</span>
                  <span className="text-ink-dim flex-shrink-0 ml-2">{r.count}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(r.count / maxReferrerCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inskickade kontaktformulär (lib/contentModel.ts, "contactForm") —
          visas bara om kunden faktiskt lagt in en sådan sektion och fått
          minst ett svar. */}
      {formSubmissions.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="text-[13.5px] font-semibold mb-3.5">Formulärsvar</div>
          <div className="flex flex-col gap-3">
            {formSubmissions.map((s) => (
              <div key={s.id} className="border border-line rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[13px] font-semibold truncate">
                    {s.name || "Namnlös"}
                    {s.email ? ` · ${s.email}` : ""}
                  </span>
                  <span className="text-[11.5px] text-ink-dim flex-shrink-0">
                    {new Date(s.createdAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-[13px] text-ink-dim whitespace-pre-wrap">{s.message}</p>
                <div className="text-[11px] text-ink-dim mt-1.5">Sidan {s.pagePath}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
