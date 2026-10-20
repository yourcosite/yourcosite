"use client";

import { msg } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/rich";
import { useT, useLocale } from "@/components/I18nProvider";
import { BCP47, CURRENCIES } from "@/lib/i18n/country";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CANCEL_INTRO_CUSTOMER,
  DEFAULT_CONFIRM_INTRO,
  DEFAULT_CONFIRM_SUBJECT,
  MAIL_PLACEHOLDERS,
  MAIL_PLACEHOLDERS_EN,
  applyMailTemplate,
  formatPrice,
  formatWhen,
} from "@/lib/booking";
import { createClient } from "@/lib/supabase/client";

type Pkg = { id: string; name: string; description: string | null; duration_min: number; buffer_min?: number | null; price_sek: number | null; image_url?: string | null; active: boolean };
type Rule = { package_id: string | null; weekday: number; start_time: string; end_time: string };
type Slot = { id: string; package_id: string | null; starts_at: string; ends_at: string };
type Block = { id: string; starts_at: string; ends_at: string; note: string | null };
type Booking = {
  id: string; package_name: string; duration_min: number; price_sek: number | null; starts_at: string;
  customer_name: string; customer_email: string; customer_phone: string | null; message: string | null; status: string;
};
type Data = {
  siteName?: string;
  siteLang?: string;
  currency?: string;
  settings: { notify_email: string; min_notice_hours: number; max_days_ahead: number; timezone: string; confirm_subject: string; confirm_intro: string; confirm_extra: string; cancel_intro: string; terms_text?: string; terms_ack_at?: string | null };
  packages: Pkg[]; rules: Rule[]; slots: Slot[]; blocks: Block[]; bookings: Booking[]; mailConfigured: boolean;
};

const DAYS = [msg("Måndag"), msg("Tisdag"), msg("Onsdag"), msg("Torsdag"), msg("Fredag"), msg("Lördag"), msg("Söndag")];
const TABS = [
  { id: "bookings", label: msg("Bokningar") },
  { id: "packages", label: msg("Paket") },
  { id: "times", label: msg("Tider") },
  { id: "settings", label: msg("Inställningar") },
] as const;
type Tab = (typeof TABS)[number]["id"];

const input = "border border-line rounded-lg px-3 py-2 text-[13.5px] bg-surface";
const btnPrimary = "text-[12.5px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg";

export default function BookingClient({ siteId }: { siteId: string }) {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/manage?site=${siteId}`);
      const d = await res.json();
      if (!res.ok) return setError(d.error || t("Kunde inte hämta bokningarna."));
      setData(d);
    } catch {
      setError(t("Kunde inte hämta bokningarna."));
    }
  }, [siteId]);
  useEffect(() => { load(); }, [load]);

  // Skickar ett kommando och laddar om. Returnerar true om det gick bra.
  const act = async (payload: Record<string, unknown>, okMsg = ""): Promise<boolean> => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/booking/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, ...payload }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || t("Något gick fel.")); return false; }
      if (okMsg) setNotice(okMsg);
      await load();
      return true;
    } catch {
      setError(t("Något gick fel, försök igen."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">{error || t("Hämtar bokningarna …")}</div>;
  }
  const tz = data.settings.timezone;
  const pkgName = (id: string | null) => (id ? data.packages.find((p) => p.id === id)?.name || t("Borttaget paket") : t("Alla paket"));

  return (
    <div>
      <p className="text-[13.5px] text-ink-dim mb-4">
        {t("Här lägger du upp vad besökarna kan boka, och när. Bokade tider blockeras automatiskt så ingen kan dubbelboka. Besökarna bokar via en bokningssektion på sajten, be Millie lägga till den: “Lägg till en bokning på sidan Kontakt”.")}
      </p>

      {!data.mailConfigured && (
        <div className="bg-accent-soft rounded-lg px-4 py-3 mb-4 text-[13px] font-semibold text-ink">
          {t("Mejltjänsten är inte kopplad ännu. Bokningar sparas och blockerar tiden, men inga bekräftelsemejl skickas förrän den är på plats.")}
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => { setTab(tabItem.id); setError(""); setNotice(""); }}
            className={`text-[13px] font-semibold px-4 py-2 rounded-full border ${tab === tabItem.id ? "bg-ink text-white border-ink" : "bg-surface text-ink-dim border-line"}`}
          >
            {t(tabItem.label)}
          </button>
        ))}
      </div>

      {error && <div className="bg-white border border-line rounded-lg px-4 py-3 mb-4 text-[13px] text-warm font-semibold">{error}</div>}
      {notice && <div className="bg-accent-soft rounded-lg px-4 py-3 mb-4 text-[13px] font-semibold">{notice}</div>}

      {tab === "bookings" && <BookingsTab data={data} tz={tz} busy={busy} act={act} />}
      {tab === "packages" && <PackagesTab data={data} busy={busy} act={act} />}
      {tab === "times" && <TimesTab data={data} tz={tz} busy={busy} act={act} pkgName={pkgName} />}
      {tab === "settings" && <SettingsTab data={data} busy={busy} act={act} siteId={siteId} />}
    </div>
  );
}

type Act = (payload: Record<string, unknown>, okMsg?: string) => Promise<boolean>;

function BookingsTab({ data, tz, busy, act }: { data: Data; tz: string; busy: boolean; act: Act }) {
  const t = useT();
  const bcp47 = BCP47[useLocale()];
  const cur = data.currency || "SEK";
  const [confirming, setConfirming] = useState<string | null>(null);
  const activePk = data.packages.filter((p) => p.active);
  const emptyManual = { package_id: activePk[0]?.id || "", package_name: "", duration_min: "60", date: "", time: "09:00", name: "", phone: "", email: "", message: "", sendMail: false };
  const [manual, setManual] = useState<typeof emptyManual | null>(null);
  const saveManual = async () => {
    if (!manual) return;
    const ok = await act({ action: "addBooking", ...manual, duration_min: Number(manual.duration_min) }, t("Bokningen är sparad."));
    if (ok) setManual(null);
  };
  const now = Date.now();
  const upcoming = data.bookings.filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now);
  const earlier = data.bookings.filter((b) => !(b.status === "confirmed" && new Date(b.starts_at).getTime() >= now)).reverse();

  const row = (b: Booking, canCancel: boolean) => (
    <div key={b.id} className={`border border-line rounded-xl px-4 py-3.5 bg-surface ${b.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-[14.5px]">{formatWhen(new Date(b.starts_at), tz, bcp47)}</div>
          <div className="text-[13px] text-ink-dim">
            {b.package_name} · {b.duration_min} min{b.price_sek != null ? ` · ${formatPrice(b.price_sek, cur, bcp47)}` : ""}
            {b.status === "cancelled" ? t(" · Avbokad") : ""}
          </div>
        </div>
        {canCancel &&
          (confirming === b.id ? (
            <div className="flex items-center gap-2">
              <button className={btnGhost} onClick={() => setConfirming(null)}>{t("Behåll")}</button>
              <button
                disabled={busy}
                className="text-[12.5px] font-bold text-white bg-warm px-3 py-2 rounded-lg disabled:opacity-60"
                onClick={async () => { await act({ action: "cancelBooking", id: b.id }, t("Bokningen är avbokad och kunden har fått ett mejl.")); setConfirming(null); }}
              >
                {t("Avboka och mejla kunden")}
              </button>
            </div>
          ) : (
            <button className={btnGhost} onClick={() => setConfirming(b.id)}>{t("Avboka")}</button>
          ))}
      </div>
      <div className="mt-2 text-[13px]">
        <div className="font-semibold">{b.customer_name}</div>
        <div className="text-ink-dim">
          <a href={`mailto:${b.customer_email}`} className="underline">{b.customer_email}</a>
          {b.customer_phone ? ` · ${b.customer_phone}` : ""}
        </div>
        {b.message && <div className="mt-1.5 text-ink-dim whitespace-pre-line">&ldquo;{b.message}&rdquo;</div>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        {manual ? (
          <div className="border border-line rounded-xl bg-surface p-4">
            <div className="text-[14.5px] font-semibold mb-3">{t("Lägg in bokning manuellt")}</div>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <label className="block md:col-span-2">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Paket")}</span>
                <select className={`${input} w-full`} value={manual.package_id} onChange={(e) => setManual({ ...manual, package_id: e.target.value })}>
                  {activePk.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.duration_min} min</option>)}
                  <option value="">{t("Annat (skriv själv)")}</option>
                </select>
              </label>
              {!manual.package_id && (
                <>
                  <label className="block">
                    <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Vad gäller bokningen?")}</span>
                    <input className={`${input} w-full`} value={manual.package_name} onChange={(e) => setManual({ ...manual, package_name: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Längd (minuter)")}</span>
                    <input type="number" min={5} className={`${input} w-full`} value={manual.duration_min} onChange={(e) => setManual({ ...manual, duration_min: e.target.value })} />
                  </label>
                </>
              )}
              <label className="block">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Datum")}</span>
                <input type="date" className={`${input} w-full`} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Starttid")}</span>
                <input type="time" className={`${input} w-full`} value={manual.time} onChange={(e) => setManual({ ...manual, time: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Namn")}</span>
                <input className={`${input} w-full`} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Telefon")}</span>
                <input type="tel" className={`${input} w-full`} value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("E-post (valfri)")}</span>
                <input type="email" className={`${input} w-full`} value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
              </label>
              <label className="block md:col-span-2">
                <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Anteckning (valfri)")}</span>
                <input className={`${input} w-full`} value={manual.message} onChange={(e) => setManual({ ...manual, message: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 md:col-span-2 text-[13px]">
                <input type="checkbox" checked={manual.sendMail && !!manual.email} disabled={!manual.email} onChange={(e) => setManual({ ...manual, sendMail: e.target.checked })} />
                {t("Skicka bekräftelse till kunden")}
              </label>
            </div>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={busy} onClick={saveManual}>{t("Spara bokningen")}</button>
              <button className={btnGhost} onClick={() => setManual(null)}>{t("Avbryt")}</button>
            </div>
          </div>
        ) : (
          <button className={btnPrimary} onClick={() => setManual(emptyManual)}>{t("+ Lägg in bokning manuellt")}</button>
        )}
      </div>
      <h2 className="text-[15px] font-semibold mb-2.5">{t("Kommande ({n})", { n: upcoming.length })}</h2>
      {upcoming.length === 0 ? (
        <div className="bg-white border border-line rounded-xl p-5 text-center text-ink-dim text-[13.5px] mb-6">{t("Inga kommande bokningar än.")}</div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-6">{upcoming.map((b) => row(b, true))}</div>
      )}
      {earlier.length > 0 && (
        <>
          <h2 className="text-[15px] font-semibold mb-2.5">{t("Tidigare och avbokade")}</h2>
          <div className="flex flex-col gap-2.5">{earlier.map((b) => row(b, false))}</div>
        </>
      )}
    </div>
  );
}

function PackagesTab({ data, busy, act }: { data: Data; busy: boolean; act: Act }) {
  const t = useT();
  const bcp47 = BCP47[useLocale()];
  const cur = data.currency || "SEK";
  const empty = { id: "", name: "", description: "", duration_min: "60", buffer_min: "0", price_sek: "", image_url: "", hadImage: false, active: true };
  const [form, setForm] = useState<typeof empty | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadImage = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError(t("Bilden måste vara PNG, JPG, WEBP eller GIF."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t("Bilden är större än 5 MB."));
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("Du är inte inloggad längre, ladda om sidan."));
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/paket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm((f) => (f ? { ...f, image_url: pub.publicUrl } : f));
    } catch (e: any) {
      setUploadError(e.message || t("Kunde inte ladda upp bilden."));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form) return;
    const ok = await act({
      action: "savePackage",
      id: form.id || undefined,
      name: form.name,
      description: form.description,
      duration_min: Number(form.duration_min),
      buffer_min: Number(form.buffer_min || 0),
      price_sek: form.price_sek === "" ? null : Number(form.price_sek),
      ...(form.image_url ? { image_url: form.image_url } : form.hadImage ? { clearImage: true } : {}),
      active: form.active,
    }, t("Paketet är sparat."));
    if (ok) setForm(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-4">
        {data.packages.length === 0 && (
          <div className="bg-white border border-line rounded-xl p-5 text-center text-ink-dim text-[13.5px]">
            {t("Inga paket än. Ett paket är det besökaren väljer att boka, till exempel “Konsultation 60 min” med eget pris.")}
          </div>
        )}
        {data.packages.map((p) => (
          <div key={p.id} className={`border border-line rounded-xl px-4 py-3.5 bg-surface ${p.active ? "" : "opacity-60"}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-[14.5px]">{p.name}{p.active ? "" : " (dold)"}</div>
                <div className="text-[12.5px] text-ink-dim">
                  {p.duration_min} min{p.price_sek != null ? ` · ${formatPrice(p.price_sek, cur, bcp47)}` : ""}
                </div>
                {p.description && <div className="text-[13px] text-ink-dim mt-1">{p.description}</div>}
              </div>
              {removing === p.id ? (
                <div className="flex items-center gap-2">
                  <button className={btnGhost} onClick={() => setRemoving(null)}>{t("Behåll")}</button>
                  <button
                    disabled={busy}
                    className="text-[12.5px] font-bold text-white bg-warm px-3 py-2 rounded-lg"
                    onClick={async () => { await act({ action: "deletePackage", id: p.id }, t("Paketet är borttaget. Gjorda bokningar ligger kvar.")); setRemoving(null); }}
                  >
                    {t("Ta bort")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button className={btnGhost} onClick={() => setForm({ id: p.id, name: p.name, description: p.description || "", duration_min: String(p.duration_min), buffer_min: String(p.buffer_min || 0), price_sek: p.price_sek == null ? "" : String(p.price_sek), image_url: p.image_url || "", hadImage: !!p.image_url, active: p.active })}>{t("Ändra")}</button>
                  <button className={btnGhost} onClick={() => setRemoving(p.id)}>{t("Ta bort")}</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!form ? (
        <button onClick={() => setForm(empty)} className="text-ink font-semibold text-[13.5px] py-1.5">{t("+ Lägg till paket")}</button>
      ) : (
        <div className="border border-line rounded-xl px-4 py-4 bg-surface">
          <div className="text-[13px] font-semibold mb-3">{form.id ? t("Ändra paket") : t("Nytt paket")}</div>
          <div className="grid gap-3 md:grid-cols-2 mb-3">
            <label className="block md:col-span-2">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Namn")}</span>
              <input className={`${input} w-full`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("t.ex. Konsultation")} />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Beskrivning (valfri)")}</span>
              <input className={`${input} w-full`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("Kort om vad som ingår")} />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Längd (minuter)")}</span>
              <input type="number" min={5} className={`${input} w-full`} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Tid till nästa bokning (minuter)")}</span>
              <input type="number" min={0} max={240} className={`${input} w-full`} value={form.buffer_min} onChange={(e) => setForm({ ...form, buffer_min: e.target.value })} />
              <span className="block text-[11.5px] text-ink-dim mt-1">{t("Paus du behöver efter tiden. Kunden ser bara längden ovan, men nästa tid börjar först efter pausen.")}</span>
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Pris i {valuta} (tomt = visas inte)", { valuta: data.currency || "SEK" })}</span>
              <input type="number" min={0} className={`${input} w-full`} value={form.price_sek} onChange={(e) => setForm({ ...form, price_sek: e.target.value })} />
            </label>
          </div>
          <div className="mb-3">
            <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Bild (valfri, visas på paketet i bokningen)")}</span>
            {form.image_url ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="w-24 h-16 rounded-lg object-cover" />
                <button type="button" className={btnGhost} onClick={() => setForm({ ...form, image_url: "" })}>{t("Ta bort bilden")}</button>
              </div>
            ) : (
              <label className={`inline-flex items-center gap-2 border-2 border-dashed border-line rounded-xl px-4 py-3 text-[13px] font-semibold text-ink-dim cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? t("Laddar upp …") : t("+ Lägg till bild")}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
            )}
            {uploadError && <div className="text-[12px] text-warm font-semibold mt-1.5">{uploadError}</div>}
          </div>
          <label className="flex items-center gap-2 text-[13px] mb-3">
            {rich(t, "{input}Visa paketet för besökare", {}, { input: <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> })}</label>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy || uploading} onClick={save}>{busy ? t("Sparar …") : t("Spara paket")}</button>
            <button className={btnGhost} onClick={() => setForm(null)}>{t("Avbryt")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimesTab({ data, tz, busy, act, pkgName }: { data: Data; tz: string; busy: boolean; act: Act; pkgName: (id: string | null) => string }) {
  const t = useT();
  const bcp47 = BCP47[useLocale()];
  const [rules, setRules] = useState<Rule[]>(data.rules);
  useEffect(() => setRules(data.rules), [data.rules]);
  const dirty = JSON.stringify(rules) !== JSON.stringify(data.rules);

  const pkgSelect = (value: string | null, onChange: (v: string | null) => void) => (
    <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{t("Alla paket")}</option>
      {data.packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );

  const [slot, setSlot] = useState({ date: "", start: "09:00", end: "12:00", package_id: "" });
  const [block, setBlock] = useState({ startDate: "", endDate: "", allDay: true, start: "09:00", end: "17:00", note: "" });
  const fmtRange = (s: string, e: string) => `${formatWhen(new Date(s), tz, bcp47)} ${t("till")} ${new Date(e).toLocaleTimeString(bcp47, { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-[15px] font-semibold mb-1">{t("Veckoschema")}</h2>
        <p className="text-[13px] text-ink-dim mb-3">
          {t("Återkommande öppettider. Tiderna delas upp efter paketets längd, så 09:00 till 12:00 ger tre tider för ett paket på 60 minuter.")}
        </p>
        <div className="flex flex-col gap-2 mb-3">
          {DAYS.map((day, i) => {
            const wd = i + 1;
            const dayRules = rules.map((r, idx) => ({ r, idx })).filter(({ r }) => r.weekday === wd);
            return (
              <div key={day} className="border border-line rounded-xl px-4 py-3 bg-surface">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-semibold text-[13.5px] w-24 pt-2">{t(day)}</div>
                  <div className="flex-1 flex flex-col gap-2 min-w-[240px]">
                    {dayRules.length === 0 && <div className="text-[13px] text-ink-dim pt-2">{t("Stängt")}</div>}
                    {dayRules.map(({ r, idx }) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <input type="time" className={input} value={r.start_time} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, start_time: e.target.value } : x)))} />
                        <span className="text-ink-dim">{t("till")}</span>
                        <input type="time" className={input} value={r.end_time} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, end_time: e.target.value } : x)))} />
                        {pkgSelect(r.package_id, (v) => setRules(rules.map((x, j) => (j === idx ? { ...x, package_id: v } : x))))}
                        <button className="text-ink-dim text-[18px] px-2" aria-label={t("Ta bort tiden")} onClick={() => setRules(rules.filter((_, j) => j !== idx))}>×</button>
                      </div>
                    ))}
                  </div>
                  <button className={btnGhost} onClick={() => setRules([...rules, { package_id: null, weekday: wd, start_time: "09:00", end_time: "17:00" }])}>{t("+ Tid")}</button>
                </div>
              </div>
            );
          })}
        </div>
        <button className={btnPrimary} disabled={busy || !dirty} onClick={() => act({ action: "saveRules", rules }, t("Veckoschemat är sparat."))}>
          {busy ? t("Sparar …") : dirty ? t("Spara veckoschemat") : t("Sparat")}
        </button>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold mb-1">{t("Extra tider")}</h2>
        <p className="text-[13px] text-ink-dim mb-3">{t("Lägg till en enskild tid utöver veckoschemat, till exempel en lördag.")}</p>
        <div className="flex flex-col gap-2 mb-3">
          {data.slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-4 py-2.5 bg-surface text-[13.5px]">
              <span>{fmtRange(s.starts_at, s.ends_at)} · {pkgName(s.package_id)}</span>
              <button className={btnGhost} onClick={() => act({ action: "deleteSlot", id: s.id })}>{t("Ta bort")}</button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Datum")}</span><input type="date" className={input} value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Från")}</span><input type="time" className={input} value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Till")}</span><input type="time" className={input} value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Paket")}</span>{pkgSelect(slot.package_id || null, (v) => setSlot({ ...slot, package_id: v || "" }))}</label>
          <button className={btnPrimary} disabled={busy} onClick={async () => { if (await act({ action: "addSlot", ...slot, package_id: slot.package_id || null }, t("Tiden är tillagd."))) setSlot({ ...slot, date: "" }); }}>{t("Lägg till")}</button>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold mb-1">{t("Stängda tider")}</h2>
        <p className="text-[13px] text-ink-dim mb-3">{t("Semester, sjukdag eller annat. Ingen kan boka under de här tiderna.")}</p>
        <div className="flex flex-col gap-2 mb-3">
          {data.blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-4 py-2.5 bg-surface text-[13.5px]">
              <span>{fmtRange(b.starts_at, b.ends_at)}{b.note ? ` · ${b.note}` : ""}</span>
              <button className={btnGhost} onClick={() => act({ action: "deleteBlock", id: b.id })}>{t("Ta bort")}</button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Från datum")}</span><input type="date" className={input} value={block.startDate} onChange={(e) => setBlock({ ...block, startDate: e.target.value, endDate: block.endDate || e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Till datum")}</span><input type="date" className={input} value={block.endDate} onChange={(e) => setBlock({ ...block, endDate: e.target.value })} /></label>
          <label className="flex items-center gap-1.5 text-[13px] pb-2">{rich(t, "{input}Hela dagarna", {}, { input: <input type="checkbox" checked={block.allDay} onChange={(e) => setBlock({ ...block, allDay: e.target.checked })} /> })}</label>
          {!block.allDay && (
            <>
              <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Från")}</span><input type="time" className={input} value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} /></label>
              <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Till")}</span><input type="time" className={input} value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} /></label>
            </>
          )}
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Anteckning")}</span><input className={input} value={block.note} onChange={(e) => setBlock({ ...block, note: e.target.value })} placeholder={t("t.ex. Semester")} /></label>
          <button className={btnPrimary} disabled={busy} onClick={async () => { if (await act({ action: "addBlock", ...block }, t("Tiden är stängd."))) setBlock({ ...block, startDate: "", endDate: "", note: "" }); }}>{t("Stäng tiden")}</button>
        </div>
        <p className="text-[12px] text-ink-dim mt-2">{t("Redan bokade tider påverkas inte. Avboka dem under Bokningar om du vill.")}</p>
      </section>
    </div>
  );
}

function SettingsTab({ data, busy, act, siteId }: { data: Data; busy: boolean; act: Act; siteId: string }) {
  const t = useT();
  const uiLocale = useLocale();
  const bcp47 = BCP47[uiLocale];
  const placeholders = uiLocale === "sv" ? MAIL_PLACEHOLDERS : MAIL_PLACEHOLDERS_EN;
  const [siteLang, setSiteLang] = useState(data.siteLang || "sv");
  const [siteCur, setSiteCur] = useState(data.currency || "SEK");
  const st = data.settings;
  const [s, setS] = useState({
    notify_email: st.notify_email,
    min_notice_hours: String(st.min_notice_hours),
    max_days_ahead: String(st.max_days_ahead),
    confirm_subject: st.confirm_subject || "",
    confirm_intro: st.confirm_intro || "",
    confirm_extra: st.confirm_extra || "",
    cancel_intro: st.cancel_intro || "",
  });
  const example = { namn: t("Anna"), tjänst: data.packages[0]?.name || t("Konsultation"), tid: formatWhen(new Date(Date.UTC(2026, 10, 3, 9, 0)), data.settings.timezone, bcp47), längd: t("{n} minuter", { n: data.packages[0]?.duration_min || 60 }), pris: data.packages[0]?.price_sek != null ? formatPrice(data.packages[0].price_sek, data.currency || "SEK", bcp47) : "", sajt: data.siteName || t("din sajt") };
  const fill = (custom: string, fallback: string) => applyMailTemplate(custom.trim() || fallback, example);
  const label = "block text-[11.5px] font-semibold text-ink-dim mb-1";

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-line rounded-xl px-4 py-4 bg-surface max-w-[560px]">
        <label className="block mb-3">
          <span className={label}>{t("Mejla nya bokningar till")}</span>
          <input type="email" className={`${input} w-full`} value={s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.value })} placeholder={t("Lämna tomt för att använda din inloggningsadress")} />
        </label>
        <label className="block mb-3">
          <span className={label}>{t("Tidigast bokning (timmar i förväg)")}</span>
          <input type="number" min={0} className={`${input} w-full`} value={s.min_notice_hours} onChange={(e) => setS({ ...s, min_notice_hours: e.target.value })} />
        </label>
        <label className="block">
          <span className={label}>{t("Hur många dagar framåt man kan boka")}</span>
          <input type="number" min={1} className={`${input} w-full`} value={s.max_days_ahead} onChange={(e) => setS({ ...s, max_days_ahead: e.target.value })} />
        </label>
        <p className="text-[12px] text-ink-dim mt-3">{t("Tider räknas i tidszonen {tz}.", { tz: data.settings.timezone })}</p>
      </div>

      <div className="border border-line rounded-xl px-4 py-4 bg-surface max-w-[560px]">
        <h2 className="text-[15px] font-semibold mb-1">{t("Sajtens språk och valuta")}</h2>
        <p className="text-[13px] text-ink-dim mb-3">{t("Språket besökarna ser i cookiebanner, bokning och formulär, och som bekräftelsemejlen till dem skrivs på. Texterna du själv skrivit på sajten ändras inte av det.")}</p>
        <div className="flex gap-3 flex-wrap">
          <label className="block">
            <span className={label}>{t("Språk")}</span>
            <select className={input} value={siteLang} onChange={(e) => setSiteLang(e.target.value)}>
              {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>{t("Valuta för priser")}</span>
            <select className={input} value={siteCur} onChange={(e) => setSiteCur(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy} className={`${btnPrimary} self-end`} onClick={() => act({ action: "saveSiteLocale", language: siteLang, currency: siteCur }, t("Sparat."))}>{t("Spara")}</button>
        </div>
      </div>

      <div className="border border-line rounded-xl px-4 py-4 bg-surface max-w-[760px]">
        <h2 className="text-[15px] font-semibold mb-1">{t("Mejl till kunden")}</h2>
        <p className="text-[13px] text-ink-dim mb-4">{rich(t, "Skriv egna texter, eller lämna fälten tomma så används standardtexten. Du kan använda {codes} så fylls kundens uppgifter i automatiskt. Tid, tjänst, längd och pris visas alltid i mejlet.", {}, { codes: placeholders.map((p) => (
            <code key={p} className="bg-bg px-1.5 py-0.5 rounded text-[12px] mr-1">{p}</code>
          )) })}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold">{t("Bekräftelse när någon bokat")}</div>
            <label className="block">
              <span className={label}>{t("Ämnesrad")}</span>
              <input className={`${input} w-full`} value={s.confirm_subject} onChange={(e) => setS({ ...s, confirm_subject: e.target.value })} placeholder={t(DEFAULT_CONFIRM_SUBJECT)} />
            </label>
            <label className="block">
              <span className={label}>{t("Inledande text")}</span>
              <textarea rows={3} className={`${input} w-full`} value={s.confirm_intro} onChange={(e) => setS({ ...s, confirm_intro: e.target.value })} placeholder={t(DEFAULT_CONFIRM_INTRO)} />
            </label>
            <label className="block">
              <span className={label}>{t("Bra att veta (valfri)")}</span>
              <textarea rows={4} className={`${input} w-full`} value={s.confirm_extra} onChange={(e) => setS({ ...s, confirm_extra: e.target.value })} placeholder={t("t.ex. hur man hittar hit, vad man ska ta med, parkering")} />
            </label>
            <div className="text-[13px] font-semibold mt-1">{t("Vid avbokning")}</div>
            <label className="block">
              <span className={label}>{t("Text i avbokningsmejlet")}</span>
              <textarea rows={3} className={`${input} w-full`} value={s.cancel_intro} onChange={(e) => setS({ ...s, cancel_intro: e.target.value })} placeholder={t(DEFAULT_CANCEL_INTRO_CUSTOMER)} />
            </label>
          </div>

          <div>
            <div className="text-[13px] font-semibold mb-2">{t("Så ser bekräftelsen ut (exempel)")}</div>
            <div className="rounded-xl border border-line bg-bg p-4 text-[13.5px]">
              <div className="text-[11.5px] text-ink-dim mb-0.5">{t("Ämne")}</div>
              <div className="font-semibold mb-3">{fill(s.confirm_subject, t(DEFAULT_CONFIRM_SUBJECT))}</div>
              <div className="rounded-lg bg-white border border-line p-4">
                <div className="font-semibold text-[15px] mb-2">{t("Din bokning är bekräftad")}</div>
                <div className="whitespace-pre-line mb-3">{fill(s.confirm_intro, t(DEFAULT_CONFIRM_INTRO))}</div>
                <div className="text-ink-dim text-[12.5px] mb-3">{t("Tjänst: {value}", { value: example.tjänst })}<br />{t("Tid: {value}", { value: example.tid })}<br />{t("Längd: {value}", { value: example.längd })}{example.pris && (<><br />{t("Pris: {value}", { value: example.pris })}</>)}
                </div>
                {s.confirm_extra.trim() && (
                  <div className="rounded-lg bg-bg p-3 mb-3">
                    <div className="font-semibold text-[12.5px] mb-1">{t("Bra att veta")}</div>
                    <div className="whitespace-pre-line text-[12.5px]">{applyMailTemplate(s.confirm_extra.trim(), example)}</div>
                  </div>
                )}
                <span className="inline-block bg-ink text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-full">{t("Avboka tiden")}</span>
              </div>
              <div className="text-[11.5px] text-ink-dim mt-4 mb-1">{t("Avbokningsmejl")}</div>
              <div className="whitespace-pre-line">{fill(s.cancel_intro, DEFAULT_CANCEL_INTRO_CUSTOMER)}</div>
            </div>
          </div>
        </div>
      </div>

      <TermsCard data={data} busy={busy} act={act} siteId={siteId} />

      <div>
        <button className={btnPrimary} disabled={busy} onClick={() => act({ action: "saveSettings", ...s }, t("Inställningarna är sparade."))}>{busy ? t("Sparar …") : t("Spara inställningar")}</button>
      </div>
    </div>
  );
}

// Egna villkor (t.ex. avbokningsvillkor). Ägaren skriver texten, eventuellt
// med hjälp av Millie, och måste kryssa i att hen själv ansvarar för den
// innan den sparas och visas för besökarna.
function TermsCard({ data, busy, act, siteId }: { data: Data; busy: boolean; act: Act; siteId: string }) {
  const t = useT();
  const saved = data.settings.terms_text || "";
  const savedAck = !!data.settings.terms_ack_at;
  const [text, setText] = useState(saved);
  const [ack, setAck] = useState(false);
  const [ask, setAsk] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState("");
  const unchanged = text.trim() === saved.trim();
  // En redan intygad, oförändrad text behöver inget nytt kryss.
  const needAck = text.trim() !== "" && !(unchanged && savedAck);
  const live = savedAck && saved.trim() !== "";
  const label = "block text-[11.5px] font-semibold text-ink-dim mb-1";

  const draft = async () => {
    setAsking(true);
    setAskErr("");
    try {
      const res = await fetch("/api/booking/terms-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, instruction: ask, current: text }),
      });
      const d = await res.json();
      if (!res.ok) { setAskErr(d.error || t("Något gick fel.")); return; }
      setText(d.terms || text);
      setAck(false);
    } catch {
      setAskErr(t("Något gick fel, försök igen."));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="border border-line rounded-xl px-4 py-4 bg-surface max-w-[760px]">
      <h2 className="text-[15px] font-semibold mb-1">{t("Bokningsvillkor")}</h2>
      <p className="text-[13px] text-ink-dim mb-3">{t("Skriv dina egna villkor, till exempel avbokningsvillkor. Besökarna ser texten när de bokar och måste kryssa i att de godkänner den. Villkoren följer också med bekräftelsemejlet. Lämna fältet tomt om du inte vill ha några villkor.")}</p>
      <div className={`text-[12px] font-semibold mb-3 ${live ? "text-ink" : "text-ink-dim"}`}>
        {live ? t("✓ Villkoren visas för besökarna när de bokar.") : t("Inga villkor visas just nu.")}
      </div>

      <div className="rounded-lg bg-bg border border-line p-3 mb-3">
        <label className="block">
          <span className={label}>{t("Be Millie skriva ett utkast")}</span>
          <div className="flex gap-2 flex-wrap">
            <input className={`${input} flex-1 min-w-[200px]`} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("t.ex. avbokning senast 24 timmar innan, annars debiteras halva priset")} />
            <button type="button" className={btnGhost} disabled={asking || busy} onClick={draft}>{asking ? t("Millie skriver …") : text.trim() ? t("Låt Millie förbättra texten") : t("Skriv utkast")}</button>
          </div>
        </label>
        {askErr && <div className="text-[12.5px] text-red-600 mt-2">{askErr}</div>}
        <p className="text-[12px] text-ink-dim mt-2">{t("Millie ger bara ett förslag. Läs igenom, ändra och fyll i det som står inom [hakparentes] innan du sparar.")}</p>
      </div>

      <label className="block mb-3">
        <span className={label}>{t("Dina villkor")}</span>
        <textarea rows={8} maxLength={8000} className={`${input} w-full`} value={text} onChange={(e) => { setText(e.target.value); setAck(false); }} placeholder={t("t.ex. Avbokning är kostnadsfri senast 24 timmar före tiden.")} />
      </label>

      {needAck && (
        <label className="flex items-start gap-2.5 mb-3 text-[13px] leading-snug cursor-pointer">
          <input type="checkbox" className="mt-0.5 w-4 h-4 flex-shrink-0" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>{t("Jag har läst texten och godkänner den. Jag är själv ansvarig för att villkoren stämmer med min verksamhet och gällande lagar. YourCoSite och Millie ansvarar inte för innehållet.")}</span>
        </label>
      )}

      <button className={btnPrimary} disabled={busy || unchanged && !needAck || (needAck && !ack)} onClick={() => act({ action: "saveTerms", terms_text: text, terms_ack: ack }, text.trim() ? t("Villkoren är sparade.") : t("Villkoren är borttagna."))}>
        {text.trim() ? t("Spara villkor") : saved ? t("Ta bort villkor") : t("Spara villkor")}
      </button>
    </div>
  );
}
