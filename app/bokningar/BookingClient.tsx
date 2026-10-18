"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice, formatSwedish } from "@/lib/booking";
import { createClient } from "@/lib/supabase/client";

type Pkg = { id: string; name: string; description: string | null; duration_min: number; price_sek: number | null; image_url?: string | null; active: boolean };
type Rule = { package_id: string | null; weekday: number; start_time: string; end_time: string };
type Slot = { id: string; package_id: string | null; starts_at: string; ends_at: string };
type Block = { id: string; starts_at: string; ends_at: string; note: string | null };
type Booking = {
  id: string; package_name: string; duration_min: number; price_sek: number | null; starts_at: string;
  customer_name: string; customer_email: string; customer_phone: string | null; message: string | null; status: string;
};
type Data = {
  settings: { notify_email: string; min_notice_hours: number; max_days_ahead: number; timezone: string };
  packages: Pkg[]; rules: Rule[]; slots: Slot[]; blocks: Block[]; bookings: Booking[]; mailConfigured: boolean;
};

const DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
const TABS = [
  { id: "bookings", label: "Bokningar" },
  { id: "packages", label: "Paket" },
  { id: "times", label: "Tider" },
  { id: "settings", label: "Inställningar" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const input = "border border-line rounded-lg px-3 py-2 text-[13.5px] bg-surface";
const btnPrimary = "text-[12.5px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg";

export default function BookingClient({ siteId }: { siteId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/manage?site=${siteId}`);
      const d = await res.json();
      if (!res.ok) return setError(d.error || "Kunde inte hämta bokningarna.");
      setData(d);
    } catch {
      setError("Kunde inte hämta bokningarna.");
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
      if (!res.ok) { setError(d.error || "Något gick fel."); return false; }
      if (okMsg) setNotice(okMsg);
      await load();
      return true;
    } catch {
      setError("Något gick fel, försök igen.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">{error || "Hämtar bokningarna …"}</div>;
  }
  const tz = data.settings.timezone;
  const pkgName = (id: string | null) => (id ? data.packages.find((p) => p.id === id)?.name || "Borttaget paket" : "Alla paket");

  return (
    <div>
      <p className="text-[13.5px] text-ink-dim mb-4">
        Här lägger du upp vad besökarna kan boka, och när. Bokade tider blockeras automatiskt så ingen kan dubbelboka.
        Besökarna bokar via en bokningssektion på sajten, be Millie lägga till den: &ldquo;Lägg till en bokning på sidan Kontakt&rdquo;.
      </p>

      {!data.mailConfigured && (
        <div className="bg-accent-soft rounded-lg px-4 py-3 mb-4 text-[13px] font-semibold text-ink">
          Mejltjänsten är inte kopplad ännu. Bokningar sparas och blockerar tiden, men inga bekräftelsemejl skickas förrän den är på plats.
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(""); setNotice(""); }}
            className={`text-[13px] font-semibold px-4 py-2 rounded-full border ${tab === t.id ? "bg-ink text-white border-ink" : "bg-surface text-ink-dim border-line"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-white border border-line rounded-lg px-4 py-3 mb-4 text-[13px] text-warm font-semibold">{error}</div>}
      {notice && <div className="bg-accent-soft rounded-lg px-4 py-3 mb-4 text-[13px] font-semibold">{notice}</div>}

      {tab === "bookings" && <BookingsTab data={data} tz={tz} busy={busy} act={act} />}
      {tab === "packages" && <PackagesTab data={data} busy={busy} act={act} />}
      {tab === "times" && <TimesTab data={data} tz={tz} busy={busy} act={act} pkgName={pkgName} />}
      {tab === "settings" && <SettingsTab data={data} busy={busy} act={act} />}
    </div>
  );
}

type Act = (payload: Record<string, unknown>, okMsg?: string) => Promise<boolean>;

function BookingsTab({ data, tz, busy, act }: { data: Data; tz: string; busy: boolean; act: Act }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const now = Date.now();
  const upcoming = data.bookings.filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now);
  const earlier = data.bookings.filter((b) => !(b.status === "confirmed" && new Date(b.starts_at).getTime() >= now)).reverse();

  const row = (b: Booking, canCancel: boolean) => (
    <div key={b.id} className={`border border-line rounded-xl px-4 py-3.5 bg-surface ${b.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-[14.5px]">{formatSwedish(new Date(b.starts_at), tz)}</div>
          <div className="text-[13px] text-ink-dim">
            {b.package_name} · {b.duration_min} min{b.price_sek != null ? ` · ${formatPrice(b.price_sek)}` : ""}
            {b.status === "cancelled" ? " · Avbokad" : ""}
          </div>
        </div>
        {canCancel &&
          (confirming === b.id ? (
            <div className="flex items-center gap-2">
              <button className={btnGhost} onClick={() => setConfirming(null)}>Behåll</button>
              <button
                disabled={busy}
                className="text-[12.5px] font-bold text-white bg-warm px-3 py-2 rounded-lg disabled:opacity-60"
                onClick={async () => { await act({ action: "cancelBooking", id: b.id }, "Bokningen är avbokad och kunden har fått ett mejl."); setConfirming(null); }}
              >
                Avboka och mejla kunden
              </button>
            </div>
          ) : (
            <button className={btnGhost} onClick={() => setConfirming(b.id)}>Avboka</button>
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
      <h2 className="text-[15px] font-semibold mb-2.5">Kommande ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <div className="bg-white border border-line rounded-xl p-5 text-center text-ink-dim text-[13.5px] mb-6">Inga kommande bokningar än.</div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-6">{upcoming.map((b) => row(b, true))}</div>
      )}
      {earlier.length > 0 && (
        <>
          <h2 className="text-[15px] font-semibold mb-2.5">Tidigare och avbokade</h2>
          <div className="flex flex-col gap-2.5">{earlier.map((b) => row(b, false))}</div>
        </>
      )}
    </div>
  );
}

function PackagesTab({ data, busy, act }: { data: Data; busy: boolean; act: Act }) {
  const empty = { id: "", name: "", description: "", duration_min: "60", price_sek: "", image_url: "", hadImage: false, active: true };
  const [form, setForm] = useState<typeof empty | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadImage = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError("Bilden måste vara PNG, JPG, WEBP eller GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Bilden är större än 5 MB.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du är inte inloggad längre, ladda om sidan.");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/paket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm((f) => (f ? { ...f, image_url: pub.publicUrl } : f));
    } catch (e: any) {
      setUploadError(e.message || "Kunde inte ladda upp bilden.");
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
      price_sek: form.price_sek === "" ? null : Number(form.price_sek),
      ...(form.image_url ? { image_url: form.image_url } : form.hadImage ? { clearImage: true } : {}),
      active: form.active,
    }, "Paketet är sparat.");
    if (ok) setForm(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-4">
        {data.packages.length === 0 && (
          <div className="bg-white border border-line rounded-xl p-5 text-center text-ink-dim text-[13.5px]">
            Inga paket än. Ett paket är det besökaren väljer att boka, till exempel &ldquo;Konsultation 60 min&rdquo; med eget pris.
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
                  {p.duration_min} min{p.price_sek != null ? ` · ${formatPrice(p.price_sek)}` : ""}
                </div>
                {p.description && <div className="text-[13px] text-ink-dim mt-1">{p.description}</div>}
              </div>
              {removing === p.id ? (
                <div className="flex items-center gap-2">
                  <button className={btnGhost} onClick={() => setRemoving(null)}>Behåll</button>
                  <button
                    disabled={busy}
                    className="text-[12.5px] font-bold text-white bg-warm px-3 py-2 rounded-lg"
                    onClick={async () => { await act({ action: "deletePackage", id: p.id }, "Paketet är borttaget. Gjorda bokningar ligger kvar."); setRemoving(null); }}
                  >
                    Ta bort
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button className={btnGhost} onClick={() => setForm({ id: p.id, name: p.name, description: p.description || "", duration_min: String(p.duration_min), price_sek: p.price_sek == null ? "" : String(p.price_sek), image_url: p.image_url || "", hadImage: !!p.image_url, active: p.active })}>Ändra</button>
                  <button className={btnGhost} onClick={() => setRemoving(p.id)}>Ta bort</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!form ? (
        <button onClick={() => setForm(empty)} className="text-ink font-semibold text-[13.5px] py-1.5">+ Lägg till paket</button>
      ) : (
        <div className="border border-line rounded-xl px-4 py-4 bg-surface">
          <div className="text-[13px] font-semibold mb-3">{form.id ? "Ändra paket" : "Nytt paket"}</div>
          <div className="grid gap-3 md:grid-cols-2 mb-3">
            <label className="block md:col-span-2">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Namn</span>
              <input className={`${input} w-full`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="t.ex. Konsultation" />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Beskrivning (valfri)</span>
              <input className={`${input} w-full`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Kort om vad som ingår" />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Längd (minuter)</span>
              <input type="number" min={5} className={`${input} w-full`} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Pris i kronor (tomt = visas inte)</span>
              <input type="number" min={0} className={`${input} w-full`} value={form.price_sek} onChange={(e) => setForm({ ...form, price_sek: e.target.value })} />
            </label>
          </div>
          <div className="mb-3">
            <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Bild (valfri, visas på paketet i bokningen)</span>
            {form.image_url ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="w-24 h-16 rounded-lg object-cover" />
                <button type="button" className={btnGhost} onClick={() => setForm({ ...form, image_url: "" })}>Ta bort bilden</button>
              </div>
            ) : (
              <label className={`inline-flex items-center gap-2 border-2 border-dashed border-line rounded-xl px-4 py-3 text-[13px] font-semibold text-ink-dim cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? "Laddar upp …" : "+ Lägg till bild"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
            )}
            {uploadError && <div className="text-[12px] text-warm font-semibold mt-1.5">{uploadError}</div>}
          </div>
          <label className="flex items-center gap-2 text-[13px] mb-3">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Visa paketet för besökare
          </label>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy || uploading} onClick={save}>{busy ? "Sparar …" : "Spara paket"}</button>
            <button className={btnGhost} onClick={() => setForm(null)}>Avbryt</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimesTab({ data, tz, busy, act, pkgName }: { data: Data; tz: string; busy: boolean; act: Act; pkgName: (id: string | null) => string }) {
  const [rules, setRules] = useState<Rule[]>(data.rules);
  useEffect(() => setRules(data.rules), [data.rules]);
  const dirty = JSON.stringify(rules) !== JSON.stringify(data.rules);

  const pkgSelect = (value: string | null, onChange: (v: string | null) => void) => (
    <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Alla paket</option>
      {data.packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );

  const [slot, setSlot] = useState({ date: "", start: "09:00", end: "12:00", package_id: "" });
  const [block, setBlock] = useState({ startDate: "", endDate: "", allDay: true, start: "09:00", end: "17:00", note: "" });
  const fmtRange = (s: string, e: string) => `${formatSwedish(new Date(s), tz)} till ${new Date(e).toLocaleTimeString("sv-SE", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-[15px] font-semibold mb-1">Veckoschema</h2>
        <p className="text-[13px] text-ink-dim mb-3">
          Återkommande öppettider. Tiderna delas upp efter paketets längd, så 09:00 till 12:00 ger tre tider för ett paket på 60 minuter.
        </p>
        <div className="flex flex-col gap-2 mb-3">
          {DAYS.map((day, i) => {
            const wd = i + 1;
            const dayRules = rules.map((r, idx) => ({ r, idx })).filter(({ r }) => r.weekday === wd);
            return (
              <div key={day} className="border border-line rounded-xl px-4 py-3 bg-surface">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-semibold text-[13.5px] w-24 pt-2">{day}</div>
                  <div className="flex-1 flex flex-col gap-2 min-w-[240px]">
                    {dayRules.length === 0 && <div className="text-[13px] text-ink-dim pt-2">Stängt</div>}
                    {dayRules.map(({ r, idx }) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <input type="time" className={input} value={r.start_time} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, start_time: e.target.value } : x)))} />
                        <span className="text-ink-dim">till</span>
                        <input type="time" className={input} value={r.end_time} onChange={(e) => setRules(rules.map((x, j) => (j === idx ? { ...x, end_time: e.target.value } : x)))} />
                        {pkgSelect(r.package_id, (v) => setRules(rules.map((x, j) => (j === idx ? { ...x, package_id: v } : x))))}
                        <button className="text-ink-dim text-[18px] px-2" aria-label="Ta bort tiden" onClick={() => setRules(rules.filter((_, j) => j !== idx))}>×</button>
                      </div>
                    ))}
                  </div>
                  <button className={btnGhost} onClick={() => setRules([...rules, { package_id: null, weekday: wd, start_time: "09:00", end_time: "17:00" }])}>+ Tid</button>
                </div>
              </div>
            );
          })}
        </div>
        <button className={btnPrimary} disabled={busy || !dirty} onClick={() => act({ action: "saveRules", rules }, "Veckoschemat är sparat.")}>
          {busy ? "Sparar …" : dirty ? "Spara veckoschemat" : "Sparat"}
        </button>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold mb-1">Extra tider</h2>
        <p className="text-[13px] text-ink-dim mb-3">Lägg till en enskild tid utöver veckoschemat, till exempel en lördag.</p>
        <div className="flex flex-col gap-2 mb-3">
          {data.slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-4 py-2.5 bg-surface text-[13.5px]">
              <span>{fmtRange(s.starts_at, s.ends_at)} · {pkgName(s.package_id)}</span>
              <button className={btnGhost} onClick={() => act({ action: "deleteSlot", id: s.id })}>Ta bort</button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Datum</span><input type="date" className={input} value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Från</span><input type="time" className={input} value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Till</span><input type="time" className={input} value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Paket</span>{pkgSelect(slot.package_id || null, (v) => setSlot({ ...slot, package_id: v || "" }))}</label>
          <button className={btnPrimary} disabled={busy} onClick={async () => { if (await act({ action: "addSlot", ...slot, package_id: slot.package_id || null }, "Tiden är tillagd.")) setSlot({ ...slot, date: "" }); }}>Lägg till</button>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold mb-1">Stängda tider</h2>
        <p className="text-[13px] text-ink-dim mb-3">Semester, sjukdag eller annat. Ingen kan boka under de här tiderna.</p>
        <div className="flex flex-col gap-2 mb-3">
          {data.blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-4 py-2.5 bg-surface text-[13.5px]">
              <span>{fmtRange(b.starts_at, b.ends_at)}{b.note ? ` · ${b.note}` : ""}</span>
              <button className={btnGhost} onClick={() => act({ action: "deleteBlock", id: b.id })}>Ta bort</button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Från datum</span><input type="date" className={input} value={block.startDate} onChange={(e) => setBlock({ ...block, startDate: e.target.value, endDate: block.endDate || e.target.value })} /></label>
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Till datum</span><input type="date" className={input} value={block.endDate} onChange={(e) => setBlock({ ...block, endDate: e.target.value })} /></label>
          <label className="flex items-center gap-1.5 text-[13px] pb-2"><input type="checkbox" checked={block.allDay} onChange={(e) => setBlock({ ...block, allDay: e.target.checked })} />Hela dagarna</label>
          {!block.allDay && (
            <>
              <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Från</span><input type="time" className={input} value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} /></label>
              <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Till</span><input type="time" className={input} value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} /></label>
            </>
          )}
          <label><span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Anteckning</span><input className={input} value={block.note} onChange={(e) => setBlock({ ...block, note: e.target.value })} placeholder="t.ex. Semester" /></label>
          <button className={btnPrimary} disabled={busy} onClick={async () => { if (await act({ action: "addBlock", ...block }, "Tiden är stängd.")) setBlock({ ...block, startDate: "", endDate: "", note: "" }); }}>Stäng tiden</button>
        </div>
        <p className="text-[12px] text-ink-dim mt-2">Redan bokade tider påverkas inte. Avboka dem under Bokningar om du vill.</p>
      </section>
    </div>
  );
}

function SettingsTab({ data, busy, act }: { data: Data; busy: boolean; act: Act }) {
  const [s, setS] = useState({ notify_email: data.settings.notify_email, min_notice_hours: String(data.settings.min_notice_hours), max_days_ahead: String(data.settings.max_days_ahead) });
  return (
    <div className="border border-line rounded-xl px-4 py-4 bg-surface max-w-[520px]">
      <label className="block mb-3">
        <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Mejla nya bokningar till</span>
        <input type="email" className={`${input} w-full`} value={s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.value })} placeholder="Lämna tomt för att använda din inloggningsadress" />
      </label>
      <label className="block mb-3">
        <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Tidigast bokning (timmar i förväg)</span>
        <input type="number" min={0} className={`${input} w-full`} value={s.min_notice_hours} onChange={(e) => setS({ ...s, min_notice_hours: e.target.value })} />
      </label>
      <label className="block mb-4">
        <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">Hur många dagar framåt man kan boka</span>
        <input type="number" min={1} className={`${input} w-full`} value={s.max_days_ahead} onChange={(e) => setS({ ...s, max_days_ahead: e.target.value })} />
      </label>
      <button className={btnPrimary} disabled={busy} onClick={() => act({ action: "saveSettings", ...s }, "Inställningarna är sparade.")}>{busy ? "Sparar …" : "Spara"}</button>
      <p className="text-[12px] text-ink-dim mt-3">Tider räknas i svensk tid ({data.settings.timezone}).</p>
    </div>
  );
}
