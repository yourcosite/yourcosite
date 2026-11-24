"use client";

import { useEffect, useState } from "react";
import { formatWhen, localTimeOf } from "@/lib/booking";

// Kundens egen ombokning från avbokningssidan: välj dag och ny tid bland
// de lediga. Delas av kundsajtens avbokningssida och den generiska sidan.
type Props = {
  token: string;
  timezone: string;
  bcp47: string;
  t: (s: string, v?: Record<string, string | number>) => string;
  btnClassName: string;
  btnStyle?: React.CSSProperties;
  dimColor: string;
  borderColor: string;
  onDone: (newStartsAt: string) => void;
};

export default function RescheduleBlock({ token, timezone, bcp47, t, btnClassName, btnStyle, dimColor, borderColor, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [avail, setAvail] = useState<Record<string, string[]> | null>(null);
  const [day, setDay] = useState("");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || avail) return;
    fetch(`/api/public/booking/cancel?token=${encodeURIComponent(token)}&slots=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d.availability) {
          setAvail(d.availability);
          setDay(Object.keys(d.availability).sort()[0] || "");
        } else setError(d.error || t("Inga lediga tider just nu."));
      })
      .catch(() => setError(t("Kunde inte hämta lediga tider.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = avail ? Object.keys(avail).sort() : [];
  const dayLabel = (d: string) => new Intl.DateTimeFormat(bcp47, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/booking/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "reschedule", startsAt: pick }) });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || t("Kunde inte boka om just nu."));
        if (res.status === 409) { setAvail(null); setPick(""); setOpen(false); setTimeout(() => setOpen(true), 0); }
      } else onDone(d.startsAt);
    } catch {
      setError(t("Kunde inte boka om just nu."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnClassName} style={btnStyle}>{t("Välj ny tid")}</button>
    );
  }
  return (
    <div>
      <div className="text-[14px] font-semibold mb-2">{t("Välj ny tid")}</div>
      {!avail && !error && <p className="text-[13.5px]" style={{ color: dimColor }}>{t("Hämtar lediga tider …")}</p>}
      {avail && days.length === 0 && <p className="text-[13.5px]" style={{ color: dimColor }}>{t("Inga lediga tider just nu. Kontakta oss.")}</p>}
      {days.length > 0 && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
            {days.slice(0, 30).map((d) => (
              <button key={d} type="button" onClick={() => { setDay(d); setPick(""); }} className="shrink-0 text-[12.5px] px-3 py-1.5 rounded-full" style={{ border: `1px solid ${borderColor}`, fontWeight: d === day ? 700 : 400, background: d === day ? borderColor : "transparent" }}>{dayLabel(d)}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(avail![day] || []).map((iso) => (
              <button key={iso} type="button" onClick={() => setPick(iso)} className="text-[13px] px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${borderColor}`, fontWeight: iso === pick ? 700 : 400, background: iso === pick ? borderColor : "transparent" }}>{localTimeOf(new Date(iso), timezone)}</button>
            ))}
          </div>
          {pick && (
            <p className="text-[13.5px] mb-3" style={{ color: dimColor }}>{t("Ny tid")}: {formatWhen(new Date(pick), timezone, bcp47)}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button type="button" disabled={!pick || busy} onClick={confirm} className={`disabled:opacity-50 ${btnClassName}`} style={btnStyle}>{busy ? t("Bokar om …") : t("Bekräfta ny tid")}</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[13px] px-3 py-2" style={{ color: dimColor }}>{t("Avbryt")}</button>
          </div>
        </>
      )}
      {error && <p className="text-[13.5px] font-semibold mt-3" style={{ color: "#C0392B" }}>{error}</p>}
    </div>
  );
}
