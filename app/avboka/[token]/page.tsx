"use client";

import { useT, useLocale } from "@/components/I18nProvider";
import { BCP47 } from "@/lib/i18n/country";
import { useEffect, useState } from "react";
import { formatWhen } from "@/lib/booking";

// Kundens egen avbokningssida (länken i bekräftelsemejlet).
export default function CancelBookingPage({ params }: { params: { token: string } }) {
  const t = useT();
  const locale = useLocale();
  const [info, setInfo] = useState<{ packageName: string; startsAt: string; durationMin: number; status: string; siteName: string; timezone: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/public/booking/cancel?token=${encodeURIComponent(params.token)}`)
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ok) return setError(data.error || t("Hittade ingen bokning."));
        setInfo({ ...data.booking, siteName: data.siteName, timezone: data.timezone });
        if (data.booking.status === "cancelled") setDone(true);
      })
      .catch(() => setError(t("Kunde inte hämta bokningen.")));
  }, [params.token]);

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || t("Kunde inte avboka."));
      else setDone(true);
    } catch {
      setError(t("Kunde inte avboka just nu."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-sans flex items-center justify-center px-5">
      <div className="w-full max-w-[460px] bg-surface border border-line rounded-2xl p-7">
        <h1 className="text-[22px] font-medium mb-3">{done ? t("Bokningen är avbokad") : t("Avboka din tid")}</h1>
        {!info && !error && <p className="text-[14px] text-ink-dim">{t("Hämtar din bokning …")}</p>}
        {info && (
          <div className="text-[14px] mb-5">
            <div className="font-semibold">{info.packageName}</div>
            <div className="text-ink-dim">{formatWhen(new Date(info.startsAt), info.timezone, BCP47[locale])} · {info.durationMin} min</div>
            {info.siteName && <div className="text-ink-dim">{info.siteName}</div>}
          </div>
        )}
        {done ? (
          <p className="text-[14px] text-ink-dim">{t("Tiden är avbokad och ett mejl är skickat. Välkommen att boka en ny tid när det passar.")}</p>
        ) : (
          info && (
            <button onClick={cancel} disabled={busy} className="text-[13.5px] font-bold text-white bg-warm px-5 py-2.5 rounded-full disabled:opacity-60">
              {busy ? t(t("Avbokar …")) : t(t("Ja, avboka tiden"))}
            </button>
          )
        )}
        {error && <p className="text-[13px] text-warm font-semibold mt-3">{error}</p>}
      </div>
    </div>
  );
}
