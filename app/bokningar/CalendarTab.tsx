"use client";

import { useEffect, useMemo, useState } from "react";
import { useT, useLocale } from "@/components/I18nProvider";
import { BCP47 } from "@/lib/i18n/country";
import { addDays, formatPrice, formatWhen, isoWeekday, localDateOf, localTimeOf, zonedTimeToUtc } from "@/lib/booking";
import type { Act, Booking, Data } from "./BookingClient";

// Veckokalender över sajtens bokningar: bokade tider (färgade), lediga tider
// som besökarna kan boka (ljusa fält) och stängda tider (streckade). Allt
// räknas i sajtens tidszon.
const HOUR_PX = 44;
const DEFAULT_START = 7;
const DEFAULT_END = 20;

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const isoWeek = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - y0.getTime()) / 86400000 + 1) / 7);
};

type Seg = { startMin: number; endMin: number; label?: string };

export default function CalendarTab({ data, tz, busy, act }: { data: Data; tz: string; busy: boolean; act: Act }) {
  const t = useT();
  const bcp47 = BCP47[useLocale()];
  const cur = data.currency || "SEK";
  const today = localDateOf(new Date(), tz);
  const mondayOf = (d: string) => addDays(d, -(isoWeekday(d) - 1));
  type View = "day" | "week" | "month";
  const [view, setView] = useState<View>("week");
  // Valt läge kommer ihåg i webbläsaren.
  useEffect(() => {
    try {
      const v = localStorage.getItem("ycs-booking-cal-view");
      if (v === "day" || v === "week" || v === "month") setView(v);
    } catch { /* tyst */ }
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try { localStorage.setItem("ycs-booking-cal-view", v); } catch { /* tyst */ }
  };
  // Datumet kalendern utgår från (dag, veckans dagar eller månadens dagar).
  const [anchor, setAnchor] = useState(today);
  const [picked, setPicked] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState(false);

  const weekStart = mondayOf(anchor);
  const monthFirst = `${anchor.slice(0, 7)}-01`;
  const monthGridStart = mondayOf(monthFirst);
  const days = useMemo(
    () => (view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [view, anchor, weekStart]
  );
  const shift = (dir: 1 | -1) => {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else {
      const [y, m] = anchor.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1 + dir, 1));
      setAnchor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
    }
  };

  // Minuter efter midnatt (lokal tid) för ett ögonblick på ett visst datum,
  // begränsat till dygnet.
  const clampDay = (date: string, a: Date, b: Date): Seg | null => {
    const dayStart = zonedTimeToUtc(date, "00:00", tz).getTime();
    const dayEnd = zonedTimeToUtc(addDays(date, 1), "00:00", tz).getTime();
    const s = Math.max(a.getTime(), dayStart);
    const e = Math.min(b.getTime(), dayEnd);
    if (e <= s) return null;
    return { startMin: Math.round((s - dayStart) / 60000), endMin: Math.round((e - dayStart) / 60000) };
  };

  const perDay = useMemo(() => {
    return days.map((date) => {
      const wd = isoWeekday(date);
      const open: Seg[] = [];
      for (const r of data.rules) {
        if (r.weekday !== wd) continue;
        open.push({ startMin: mins(r.start_time), endMin: mins(r.end_time), label: r.package_id ? data.packages.find((p) => p.id === r.package_id)?.name : undefined });
      }
      for (const s of data.slots) {
        const seg = clampDay(date, new Date(s.starts_at), new Date(s.ends_at));
        if (seg) open.push({ ...seg, label: s.package_id ? data.packages.find((p) => p.id === s.package_id)?.name : undefined });
      }
      const blocks: Seg[] = [];
      for (const b of data.blocks) {
        const seg = clampDay(date, new Date(b.starts_at), new Date(b.ends_at));
        if (seg) blocks.push({ ...seg, label: b.note || undefined });
      }
      const bookings: (Seg & { b: Booking })[] = [];
      for (const b of data.bookings) {
        if (b.status !== "confirmed") continue;
        const start = new Date(b.starts_at);
        const seg = clampDay(date, start, new Date(start.getTime() + b.duration_min * 60000));
        if (seg) bookings.push({ ...seg, b });
      }
      return { date, open, blocks, bookings };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, data, tz]);

  // Tidsspannet följer innehållet men visar minst vanliga kontorstider.
  let startH = DEFAULT_START;
  let endH = DEFAULT_END;
  for (const d of perDay) {
    for (const s of [...d.open, ...d.bookings]) {
      startH = Math.min(startH, Math.floor(s.startMin / 60));
      endH = Math.max(endH, Math.ceil(s.endMin / 60));
    }
  }
  endH = Math.min(endH, 24);
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const top = (m: number) => ((m - startH * 60) / 60) * HOUR_PX;
  const height = (a: number, b: number) => Math.max(((b - a) / 60) * HOUR_PX, 14);

  const fmtDay = (date: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(bcp47, { timeZone: "UTC", ...opts }).format(new Date(`${date}T12:00:00Z`));
  const weekLabel =
    view === "day"
      ? fmtDay(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "month"
      ? fmtDay(monthFirst, { month: "long", year: "numeric" })
      : `${t("Vecka {n}", { n: isoWeek(weekStart) })} · ${fmtDay(weekStart, { day: "numeric", month: "short" })} – ${fmtDay(addDays(weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`;

  // Månadsvyn: 6 veckor, bokningar per dag.
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i));
  const bookingsByDay = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    for (const b of data.bookings) {
      if (b.status !== "confirmed") continue;
      const k = localDateOf(new Date(b.starts_at), tz);
      (m[k] ||= []).push(b);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return m;
  }, [data.bookings, tz]);
  const openWeekdays = useMemo(() => new Set(data.rules.map((r) => r.weekday)), [data.rules]);

  const nowMin = (() => {
    const [h, m] = localTimeOf(new Date(), tz).split(":").map(Number);
    return h * 60 + m;
  })();

  const gridH = hours.length * HOUR_PX;
  const hasAnything = perDay.some((d) => d.open.length || d.bookings.length || d.blocks.length);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex gap-1 mr-2">
          {(["day", "week", "month"] as const).map((v) => (
            <button key={v} type="button" onClick={() => changeView(v)} className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border ${view === v ? "bg-ink text-white border-ink" : "bg-surface text-ink-dim border-line"}`}>
              {v === "day" ? t("Dag") : v === "week" ? t("Vecka") : t("Månad")}
            </button>
          ))}
        </div>
        <button type="button" className="text-[13px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-surface" onClick={() => shift(-1)} aria-label={t("Föregående")}>‹</button>
        <button type="button" className="text-[13px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-surface" onClick={() => setAnchor(today)}>{t("Idag")}</button>
        <button type="button" className="text-[13px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-surface" onClick={() => shift(1)} aria-label={t("Nästa")}>›</button>
        <div className="text-[14px] font-semibold ml-1 capitalize">{weekLabel}</div>
      </div>

      <div className="flex gap-4 flex-wrap text-[12px] text-ink-dim mb-3">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded bg-accent" />{t("Bokad")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded border border-line bg-[#E8F5EC]" />{t("Ledig tid att boka")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded border border-line" style={{ background: "repeating-linear-gradient(45deg,#e5e5e5,#e5e5e5 3px,#f5f5f5 3px,#f5f5f5 6px)" }} />{t("Stängt")}</span>
      </div>

      {view !== "month" && !hasAnything && (
        <div className="border border-line rounded-xl bg-surface px-4 py-3 text-[13px] text-ink-dim mb-3">
          {t("Inget är inlagt den här veckan. Lägg upp öppettider under Tider, så syns de här.")}
        </div>
      )}

      {view !== "month" && (
      <div className="border border-line rounded-xl bg-surface overflow-x-auto">
        <div style={{ minWidth: view === "day" ? 0 : 760 }}>
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
            <div />
            {days.map((d) => (
              <div key={d} className={`text-center py-2 text-[12.5px] border-l border-line ${d === today ? "font-bold" : "text-ink-dim font-semibold"}`}>
                <div className="uppercase tracking-wide text-[11px]">{fmtDay(d, { weekday: "short" })}</div>
                <div className={d === today ? "inline-block bg-ink text-white rounded-full px-2 py-0.5" : ""}>{fmtDay(d, { day: "numeric" })}</div>
              </div>
            ))}
          </div>
          <div className="grid border-t border-line" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
            <div className="relative" style={{ height: gridH }}>
              {hours.map((h) => (
                <div key={h} className="absolute right-1.5 text-[10.5px] text-ink-dim" style={{ top: (h - startH) * HOUR_PX - 6 }}>{String(h).padStart(2, "0")}:00</div>
              ))}
            </div>
            {perDay.map((d) => (
              <div key={d.date} className={`relative border-l border-line ${d.date === today ? "bg-[#FAFAF7]" : ""}`} style={{ height: gridH }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-line/60" style={{ top: (h - startH) * HOUR_PX }} />
                ))}
                {d.open.map((s, i) => (
                  <div key={`o${i}`} className="absolute left-0.5 right-0.5 rounded bg-[#E8F5EC] border border-[#CFE9D6] overflow-hidden px-1 text-[10.5px] text-[#2F6B44]" style={{ top: top(s.startMin), height: height(s.startMin, s.endMin) }} title={s.label || t("Alla paket")}>
                    {s.label || ""}
                  </div>
                ))}
                {d.blocks.map((s, i) => (
                  <div key={`b${i}`} className="absolute left-0.5 right-0.5 rounded border border-line overflow-hidden px-1 text-[10.5px] text-ink-dim" style={{ top: top(s.startMin), height: height(s.startMin, s.endMin), background: "repeating-linear-gradient(45deg,#e5e5e5,#e5e5e5 3px,#f5f5f5 3px,#f5f5f5 6px)" }} title={s.label || t("Stängt")}>
                    {s.label || t("Stängt")}
                  </div>
                ))}
                {d.bookings.map((s) => (
                  <button
                    type="button"
                    key={s.b.id}
                    onClick={() => { setPicked(s.b); setConfirming(false); }}
                    className={`absolute left-1 right-1 rounded bg-accent text-accent-ink text-left overflow-hidden px-1.5 py-0.5 text-[11px] leading-tight shadow-sm ${picked?.id === s.b.id ? "ring-2 ring-ink" : ""}`}
                    style={{ top: top(s.startMin), height: height(s.startMin, s.endMin) }}
                  >
                    <div className="font-bold truncate">{localTimeOf(new Date(s.b.starts_at), tz)} {s.b.customer_name}</div>
                    <div className="truncate opacity-80">{s.b.package_name}</div>
                  </button>
                ))}
                {d.date === today && nowMin >= startH * 60 && nowMin <= endH * 60 && (
                  <div className="absolute left-0 right-0 h-[2px] bg-warm pointer-events-none" style={{ top: top(nowMin) }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {view === "month" && (
        <div className="border border-line rounded-xl bg-surface overflow-x-auto">
          <div style={{ minWidth: 640 }}>
            <div className="grid grid-cols-7">
              {monthDays.slice(0, 7).map((d) => (
                <div key={d} className="text-center py-2 text-[11px] uppercase tracking-wide font-semibold text-ink-dim border-l first:border-l-0 border-line">{fmtDay(d, { weekday: "short" })}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-t border-line">
              {monthDays.map((d) => {
                const list = bookingsByDay[d] || [];
                const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => { setAnchor(d); changeView("day"); }}
                    className={`text-left min-h-[92px] p-1.5 border-l first:border-l-0 border-b border-line align-top ${inMonth ? "" : "bg-[#FAFAF7] text-ink-dim/60"} ${d === today ? "bg-[#FAFAF7]" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[12px] font-semibold ${d === today ? "bg-ink text-white rounded-full px-1.5" : ""}`}>{fmtDay(d, { day: "numeric" })}</span>
                      {openWeekdays.has(isoWeekday(d)) && inMonth && <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF73]" title={t("Ledig tid att boka")} />}
                    </div>
                    {list.slice(0, 3).map((b) => (
                      <div key={b.id} className="bg-accent text-accent-ink rounded px-1 py-0.5 mb-0.5 text-[10.5px] leading-tight truncate">
                        {localTimeOf(new Date(b.starts_at), tz)} {b.customer_name}
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[10.5px] text-ink-dim">{t("+{n} till", { n: list.length - 3 })}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {picked && (
        <div className="border border-line rounded-xl px-4 py-3.5 bg-surface mt-4 max-w-[560px]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-[14.5px]">{formatWhen(new Date(picked.starts_at), tz, bcp47)}</div>
              <div className="text-[13px] text-ink-dim">
                {picked.package_name} · {picked.duration_min} min{picked.price_sek != null ? ` · ${formatPrice(picked.price_sek, cur, bcp47)}` : ""}
              </div>
            </div>
            <button type="button" className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg" onClick={() => setPicked(null)}>{t("Stäng")}</button>
          </div>
          <div className="mt-2 text-[13px]">
            <div className="font-semibold">{picked.customer_name}</div>
            <div className="text-ink-dim">
              {picked.customer_email && <a href={`mailto:${picked.customer_email}`} className="underline">{picked.customer_email}</a>}
              {picked.customer_phone ? `${picked.customer_email ? " · " : ""}${picked.customer_phone}` : ""}
            </div>
            {picked.message && <div className="mt-1.5 text-ink-dim whitespace-pre-line">&ldquo;{picked.message}&rdquo;</div>}
          </div>
          <div className="mt-3">
            {confirming ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg" onClick={() => setConfirming(false)}>{t("Behåll")}</button>
                <button
                  type="button"
                  disabled={busy}
                  className="text-[12.5px] font-bold text-white bg-warm px-3 py-2 rounded-lg disabled:opacity-60"
                  onClick={async () => { const ok = await act({ action: "cancelBooking", id: picked.id }, t("Bokningen är avbokad och kunden har fått ett mejl.")); if (ok) { setPicked(null); setConfirming(false); } }}
                >
                  {t("Avboka och mejla kunden")}
                </button>
              </div>
            ) : (
              <button type="button" className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg" onClick={() => setConfirming(true)}>{t("Avboka")}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
