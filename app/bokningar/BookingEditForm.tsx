"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { localDateOf, localTimeOf } from "@/lib/booking";
import type { Act, Booking, Data } from "./BookingClient";

// Formulär för att ändra en befintlig bokning, används både i kalendern och i
// bokningslistan. Kunden kan få en ny bekräftelse med den nya tiden.
const input = "border border-line rounded-lg px-3 py-2 text-[13.5px] bg-surface w-full box-border";
const label = "block text-[11.5px] font-semibold text-ink-dim mb-1";

export default function BookingEditForm({ booking, data, tz, busy, act, onDone }: { booking: Booking; data: Data; tz: string; busy: boolean; act: Act; onDone: () => void }) {
  const t = useT();
  const start = new Date(booking.starts_at);
  const pkgs = data.packages.filter((p) => p.active || p.id === booking.package_id);
  const [f, setF] = useState({
    package_id: booking.package_id || "",
    package_name: booking.package_name,
    duration_min: String(booking.duration_min),
    date: localDateOf(start, tz),
    time: localTimeOf(start, tz),
    name: booking.customer_name,
    phone: booking.customer_phone || "",
    email: booking.customer_email || "",
    message: booking.message || "",
    sendMail: false,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const timeChanged = f.date !== localDateOf(start, tz) || f.time !== localTimeOf(start, tz) || Number(f.duration_min) !== booking.duration_min;

  const save = async () => {
    const ok = await act({ action: "updateBooking", id: booking.id, ...f, duration_min: Number(f.duration_min), sendMail: f.sendMail && !!f.email.trim() }, t("Bokningen är ändrad."));
    if (ok) onDone();
  };

  return (
    <div className="mt-3 grid gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>{t("Paket")}</label>
          <select
            className={input}
            value={f.package_id}
            onChange={(e) => {
              const p = data.packages.find((x) => x.id === e.target.value);
              setF((x) => ({ ...x, package_id: e.target.value, package_name: p ? p.name : x.package_name, duration_min: p ? String(p.duration_min) : x.duration_min }));
            }}
          >
            <option value="">{t("Annat (skriv själv)")}</option>
            {pkgs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {!f.package_id && (
          <div>
            <label className={label}>{t("Vad gäller bokningen?")}</label>
            <input className={input} value={f.package_name} onChange={(e) => set("package_name", e.target.value)} />
          </div>
        )}
        <div>
          <label className={label}>{t("Längd (minuter)")}</label>
          <input className={input} type="number" min={5} max={1440} step={5} value={f.duration_min} onChange={(e) => set("duration_min", e.target.value)} />
        </div>
        <div>
          <label className={label}>{t("Datum")}</label>
          <input className={input} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label className={label}>{t("Starttid")}</label>
          <input className={input} type="time" step={300} value={f.time} onChange={(e) => set("time", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>{t("Namn")}</label>
          <input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className={label}>{t("Telefon")}</label>
          <input className={input} type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{t("E-post")}</label>
          <input className={input} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{t("Meddelande från kunden")}</label>
          <textarea className={`${input} resize-y`} rows={2} value={f.message} onChange={(e) => set("message", e.target.value)} />
        </div>
      </div>
      <label className={`flex items-start gap-2 text-[13px] ${f.email.trim() ? "" : "opacity-50"}`}>
        <input type="checkbox" className="mt-0.5" disabled={!f.email.trim()} checked={f.sendMail && !!f.email.trim()} onChange={(e) => set("sendMail", e.target.checked)} />
        <span>
          {t("Mejla kunden en ny bekräftelse")}
          {timeChanged && f.email.trim() && !f.sendMail && <span className="block text-[12px] text-warm font-medium">{t("Tiden är ändrad. Kunden vet inte om det om du inte mejlar.")}</span>}
        </span>
      </label>
      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={busy || !f.name.trim()} className="text-[12.5px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-lg disabled:opacity-60" onClick={save}>{t("Spara ändringar")}</button>
        <button type="button" disabled={busy} className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg" onClick={onDone}>{t("Avbryt")}</button>
      </div>
    </div>
  );
}
