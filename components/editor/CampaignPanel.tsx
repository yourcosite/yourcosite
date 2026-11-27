"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import {
  CAMPAIGN_META,
  CAMPAIGN_TYPES,
  MAX_CAMPAIGNS,
  MAX_CAMPAIGN_CARDS,
  campaignStatus,
  isoToLocalInput,
  localInputToIso,
  newCampaign,
  type Campaign,
  type CampaignType,
} from "@/lib/campaigns";
import type { SiteContent } from "@/lib/contentModel";

// Panelen Kampanjer: lista, skapa och ändra kampanjytor, med schema.
// Sparar hela listan via /api/sites/edit-campaigns.

const input = "w-full min-w-0 border border-line rounded-lg bg-bg px-3 py-2 text-[13.5px] text-ink";
const btn = "text-[12.5px] font-semibold rounded-full px-3 py-1.5 border border-line bg-surface text-ink hover:border-ink disabled:opacity-50";
const btnPrimary = "text-[13px] font-bold rounded-full px-4 py-2 bg-accent text-accent-ink disabled:opacity-50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-ink-dim">{hint}</span>}
    </label>
  );
}

function Check({ checked, onChange, children, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-2 text-[13px] ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export default function CampaignPanel({
  siteId,
  campaigns,
  pages,
  onSaved,
}: {
  siteId?: string;
  campaigns: Campaign[];
  pages: { path: string; label: string }[];
  onSaved: (content: SiteContent) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = useMemo(() => Date.now(), [campaigns, editing]);

  const save = async (list: Campaign[]) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sites/edit-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, campaigns: list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      onSaved(data.content);
      return true;
    } catch (e: any) {
      setError(e.message || t("Något gick fel."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const statusText = (c: Campaign) => {
    const s = campaignStatus(c, now);
    const fmt = (v?: string) => (v ? new Date(v).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" }) : "");
    if (s === "off") return { text: t("Avstängd"), cls: "bg-bg text-ink-dim" };
    if (s === "scheduled") return { text: t("Startar {when}", { when: fmt(c.startsAt) }), cls: "bg-amber-100 text-amber-900" };
    if (s === "ended") return { text: t("Slut {when}", { when: fmt(c.endsAt) }), cls: "bg-bg text-ink-dim" };
    return { text: c.endsAt ? t("Pågår, slutar {when}", { when: fmt(c.endsAt) }) : t("Pågår"), cls: "bg-accent-soft text-ink" };
  };

  // ---- Redigera en kampanj ----
  if (editing) {
    const c = editing;
    const meta = CAMPAIGN_META[c.type];
    const set = (patch: Partial<Campaign>) => setEditing({ ...c, ...patch });
    const setLines = (key: "lines" | "lines2", v: string) => set({ [key]: v.split("\n").slice(0, 8) } as Partial<Campaign>);
    const countdownPossible = !!c.endsAt;
    const listId = `camp-pages-${c.id}`;
    const hasText = (v: string[]) => v.some((x) => x.trim());
    const ready =
      (c.type === "topbar" || c.type === "marquee" ? hasText(c.lines) : true) &&
      (c.type === "diagonal" ? hasText(c.lines) && hasText(c.lines2) : true) &&
      (["sticky", "hero", "slidein"].includes(c.type) ? !!c.heading.trim() : true) &&
      (c.type === "badge" ? !!c.badgeText.trim() : true) &&
      (c.type === "cards" ? c.cards.some((x) => x.title.trim()) : true);
    const dateOk = !c.startsAt || !c.endsAt || Date.parse(c.endsAt) > Date.parse(c.startsAt);

    const submit = async () => {
      const edited: Campaign = { ...c, rev: Date.now(), lines: c.lines.map((x) => x.trim()).filter(Boolean), lines2: c.lines2.map((x) => x.trim()).filter(Boolean) };
      const list = isNew ? [...campaigns, edited] : campaigns.map((x) => (x.id === edited.id ? edited : x));
      if (await save(list)) {
        setEditing(null);
        setIsNew(false);
      }
    };

    return (
      <div className="grid gap-4 max-w-[640px]">
        <button type="button" onClick={() => { setEditing(null); setIsNew(false); setError(""); }} className="text-[12.5px] font-semibold text-ink-dim justify-self-start">
          ← {t("Tillbaka till kampanjerna")}
        </button>
        <div>
          <div className="text-[15px] font-bold">{meta.label}</div>
          <div className="text-[12.5px] text-ink-dim">{meta.desc}</div>
        </div>

        <Field label={t("Namn i listan")} hint={t("Syns bara för dig.")}>
          <input className={input} value={c.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        {/* Texter */}
        {c.type === "topbar" && (
          <Field label={t("Budskap, ett per rad")} hint={t("Flera rader byter av varandra.")}>
            <textarea className={input} rows={4} value={c.lines.join("\n")} onChange={(e) => setLines("lines", e.target.value)} />
          </Field>
        )}
        {c.type === "marquee" && (
          <Field label={t("Ord som rullar, ett per rad")}>
            <textarea className={input} rows={4} value={c.lines.join("\n")} onChange={(e) => setLines("lines", e.target.value)} />
          </Field>
        )}
        {c.type === "diagonal" && (
          <>
            <Field label={t("Övre bandet, en text per rad")}>
              <textarea className={input} rows={3} value={c.lines.join("\n")} onChange={(e) => setLines("lines", e.target.value)} />
            </Field>
            <Field label={t("Nedre bandet, en text per rad")}>
              <textarea className={input} rows={3} value={c.lines2.join("\n")} onChange={(e) => setLines("lines2", e.target.value)} />
            </Field>
          </>
        )}
        {(c.type === "hero" || c.type === "slidein") && (
          <Field label={c.type === "slidein" ? t("Liten rubrik överst") : t("Rad ovanför rubriken")}>
            <input className={input} value={c.kicker} maxLength={80} onChange={(e) => set({ kicker: e.target.value })} />
          </Field>
        )}
        {(c.type === "sticky" || c.type === "hero" || c.type === "slidein" || c.type === "cards") && (
          <Field label={c.type === "sticky" ? t("Text") : t("Rubrik")}>
            <input className={input} value={c.heading} maxLength={140} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
        )}
        {c.type === "hero" && (
          <Field label={t("Ord i rubriken som ska få färg")} hint={t("Måste stå exakt som i rubriken, till exempel 20 procent.")}>
            <input className={input} value={c.emphasis} maxLength={60} onChange={(e) => set({ emphasis: e.target.value })} />
          </Field>
        )}
        {(c.type === "hero" || c.type === "slidein") && (
          <Field label={t("Brödtext")}>
            <textarea className={input} rows={2} maxLength={240} value={c.body} onChange={(e) => set({ body: e.target.value })} />
          </Field>
        )}
        {c.type === "sticky" && c.showCountdown && (
          <Field label={t("Text ovanför nedräkningen")}>
            <input className={input} value={c.kicker} maxLength={80} onChange={(e) => set({ kicker: e.target.value })} />
          </Field>
        )}
        {c.type === "badge" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Text i märket")} hint={t("Kort, till exempel -30%.")}>
              <input className={input} value={c.badgeText} maxLength={12} onChange={(e) => set({ badgeText: e.target.value })} />
            </Field>
            <Field label={t("Liten text under")}>
              <input className={input} value={c.badgeSub} maxLength={24} onChange={(e) => set({ badgeSub: e.target.value })} />
            </Field>
          </div>
        )}
        {c.type === "cards" && (
          <div className="grid gap-3">
            <div className="text-[12px] font-semibold">{t("Kort")}</div>
            {c.cards.map((card, i) => (
              <div key={i} className="border border-line rounded-xl p-3 grid gap-2 bg-surface">
                <div className="grid grid-cols-[1fr_90px] gap-2">
                  <input className={input} placeholder={t("Rubrik")} value={card.title} maxLength={80} onChange={(e) => set({ cards: c.cards.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} />
                  <input className={input} placeholder={t("Etikett")} value={card.label || ""} maxLength={20} onChange={(e) => set({ cards: c.cards.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
                </div>
                <input className={input} placeholder={t("Kort text")} value={card.text || ""} maxLength={160} onChange={(e) => set({ cards: c.cards.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} />
                <input className={input} placeholder={t("Länk (valfri)")} list={listId} value={card.link || ""} onChange={(e) => set({ cards: c.cards.map((x, k) => (k === i ? { ...x, link: e.target.value } : x)) })} />
                <button type="button" onClick={() => set({ cards: c.cards.filter((_, k) => k !== i) })} className="text-[12px] text-red-700 font-semibold justify-self-start">{t("Ta bort kortet")}</button>
              </div>
            ))}
            {c.cards.length < MAX_CAMPAIGN_CARDS && (
              <button type="button" onClick={() => set({ cards: [...c.cards, { title: "" }] })} className={`${btn} justify-self-start`}>+ {t("Lägg till kort")}</button>
            )}
          </div>
        )}

        {/* Knapp */}
        {meta.button && (
          <div className="grid gap-3">
            <Field label={t("Knapptext")} hint={t("Lämna tomt för ingen knapp.")}>
              <input className={input} value={c.buttonText} maxLength={40} onChange={(e) => set({ buttonText: e.target.value })} />
            </Field>
            {c.buttonText && (
              <Field label={t("Knappen leder till")} hint={t("Välj en av dina sidor eller skriv en webbadress.")}>
                <input className={input} list={listId} value={c.buttonLink} placeholder="/boka eller https://…" onChange={(e) => set({ buttonLink: e.target.value })} />
              </Field>
            )}
          </div>
        )}
        {c.type === "badge" && (
          <Field label={t("Länk (valfri)")} hint={t("Märket blir klickbart om du anger en länk.")}>
            <input className={input} list={listId} value={c.buttonLink} placeholder="/boka eller https://…" onChange={(e) => set({ buttonLink: e.target.value })} />
          </Field>
        )}
        <datalist id={listId}>
          {pages.map((p) => (
            <option key={p.path} value={p.path}>{p.label}</option>
          ))}
        </datalist>

        {/* Nedräkning */}
        {meta.countdown && (
          <div className="grid gap-1">
            <Check checked={c.showCountdown && countdownPossible} disabled={!countdownPossible} onChange={(v) => set({ showCountdown: v })}>
              {t("Visa nedräkning till slutdatumet")}
            </Check>
            {!countdownPossible && <span className="text-[11.5px] text-ink-dim">{t("Välj ett slutdatum nedan för att kunna visa en nedräkning.")}</span>}
          </div>
        )}

        {/* Schema */}
        <div className="grid gap-3 border border-line rounded-xl p-3 bg-surface">
          <div className="text-[12px] font-semibold">{t("Schema")}</div>
          <div className="grid gap-3">
            <Field label={t("Börjar visas")}>
              <input type="datetime-local" className={input} value={isoToLocalInput(c.startsAt)} onChange={(e) => set({ startsAt: localInputToIso(e.target.value) })} />
            </Field>
            <Field label={t("Slutar visas")}>
              <input type="datetime-local" className={input} value={isoToLocalInput(c.endsAt)} onChange={(e) => set({ endsAt: localInputToIso(e.target.value), ...(e.target.value ? {} : { showCountdown: false }) })} />
            </Field>
          </div>
          <div className="text-[11.5px] text-ink-dim">{t("Tomt betyder ingen gräns. Kampanjen visas och tas bort av sig själv.")}</div>
          {!dateOk && <div className="text-[12px] text-red-700">{t("Slutdatumet måste ligga efter startdatumet.")}</div>}
        </div>

        {/* Var */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("Sidor")}>
            <select className={input} value={c.pages} onChange={(e) => set({ pages: e.target.value as Campaign["pages"] })}>
              <option value="all">{t("Alla sidor")}</option>
              <option value="home">{t("Bara startsidan")}</option>
            </select>
          </Field>
          {meta.where && (
            <Field label={t("Plats på sidan")}>
              <select className={input} value={c.placement} onChange={(e) => set({ placement: e.target.value as Campaign["placement"] })}>
                <option value="top">{t("Högst upp, under menyn")}</option>
                <option value="bottom">{t("Längst ner, före sidfoten")}</option>
              </select>
            </Field>
          )}
        </div>

        {/* Utseende */}
        {(c.type === "topbar" || c.type === "marquee" || c.type === "sticky") && (
          <Field label={t("Färg")}>
            <select className={input} value={c.tone} onChange={(e) => set({ tone: e.target.value as Campaign["tone"] })}>
              <option value="accent">{t("Sajtens accentfärg")}</option>
              <option value="dark">{t("Mörk")}</option>
            </select>
          </Field>
        )}
        {(c.type === "marquee" || c.type === "cards" || c.type === "diagonal") && (
          <Field label={t("Hastighet")}>
            <select className={input} value={c.speed} onChange={(e) => set({ speed: e.target.value as Campaign["speed"] })}>
              <option value="slow">{t("Långsam")}</option>
              <option value="normal">{t("Normal")}</option>
              <option value="fast">{t("Snabb")}</option>
            </select>
          </Field>
        )}
        {(c.type === "topbar" || c.type === "sticky") && (
          <Check checked={c.dismissible} onChange={(v) => set({ dismissible: v })}>{t("Besökaren kan stänga den")}</Check>
        )}

        {/* Ruta som glider in */}
        {c.type === "slidein" && (
          <div className="grid gap-3 border border-line rounded-xl p-3 bg-surface">
            <div className="text-[12px] font-semibold">{t("Hur och när rutan visas")}</div>
            <Field label={t("Glider in efter")} hint={t("Sekunder efter att sidan öppnats.")}>
              <input type="number" min={0} max={120} className={input} value={c.delaySec} onChange={(e) => set({ delaySec: Number(e.target.value) })} />
            </Field>
            <div className="grid gap-1.5">
              <span className="text-[12px] font-semibold">{t("Hur ofta ska samma person se den?")}</span>
              <label className="flex items-start gap-2 text-[13px]">
                <input type="radio" name="freq" className="mt-0.5" checked={c.frequency === "once"} onChange={() => set({ frequency: "once" })} />
                <span>{t("En gång per person. Kommer hen tillbaka senare visas den inte igen.")}</span>
              </label>
              <label className="flex items-start gap-2 text-[13px]">
                <input type="radio" name="freq" className="mt-0.5" checked={c.frequency === "visit"} onChange={() => set({ frequency: "visit" })} />
                <span>{t("Varje gång hen kommer in på sidan igen. Under ett och samma besök visas den bara en gång.")}</span>
              </label>
            </div>
            <Field label={t("Högsta antal visningar per person")} hint={t("0 betyder ingen gräns. Efter så här många gånger slutar rutan visas för den personen.")}>
              <input type="number" min={0} max={99} className={input} value={c.maxViews} onChange={(e) => set({ maxViews: Number(e.target.value) })} />
            </Field>
            <Check checked={c.stayUntilClosed} onChange={(v) => set({ stayUntilClosed: v })}>
              {t("Ligger kvar när besökaren scrollar upp och ned, tills hen klickar bort den")}
            </Check>
            {!c.stayUntilClosed && (
              <Field label={t("Försvinner av sig själv efter")} hint={t("Sekunder.")}>
                <input type="number" min={3} max={120} className={input} value={c.autoHideSec} onChange={(e) => set({ autoHideSec: Number(e.target.value) })} />
              </Field>
            )}
            <div className="text-[11.5px] text-ink-dim">{t("Visningarna räknas i besökarens egen webbläsare. Ändrar du kampanjen räknas den som ny och visas för alla igen.")}</div>
          </div>
        )}

        {error && <div className="text-[12.5px] text-red-700">{error}</div>}
        <div className="flex gap-2 flex-wrap">
          <button type="button" className={btnPrimary} disabled={busy || !ready || !dateOk} onClick={submit}>
            {busy ? t("Sparar …") : t("Spara kampanjen")}
          </button>
          <button type="button" className={btn} onClick={() => { setEditing(null); setIsNew(false); setError(""); }}>{t("Avbryt")}</button>
        </div>
        {!ready && <div className="text-[11.5px] text-ink-dim">{t("Fyll i texten för att kunna spara.")}</div>}
      </div>
    );
  }

  // ---- Välj typ ----
  if (picking) {
    return (
      <div className="grid gap-3 max-w-[640px]">
        <button type="button" onClick={() => setPicking(false)} className="text-[12.5px] font-semibold text-ink-dim justify-self-start">← {t("Tillbaka")}</button>
        <div className="text-[15px] font-bold">{t("Vilken sorts kampanj?")}</div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {CAMPAIGN_TYPES.map((type: CampaignType) => (
            <button
              key={type}
              type="button"
              onClick={() => { setEditing(newCampaign(type)); setIsNew(true); setPicking(false); }}
              className="text-left border border-line rounded-xl p-3 bg-surface hover:border-ink"
            >
              <div className="text-[13.5px] font-bold">{t(CAMPAIGN_META[type].label)}</div>
              <div className="text-[12px] text-ink-dim mt-0.5">{t(CAMPAIGN_META[type].desc)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Lista ----
  return (
    <div className="grid gap-3 max-w-[640px]">
      {campaigns.length === 0 && (
        <div className="text-[13.5px] text-ink-dim border border-dashed border-line rounded-xl p-4">
          {t("Du har inga kampanjer än. Lägg till en toppremsa, ett textband eller en ruta som glider in, och schemalägg när den ska visas.")}
        </div>
      )}
      {campaigns.map((c) => {
        const st = statusText(c);
        return (
          <div key={c.id} className="border border-line rounded-xl p-3 bg-surface grid gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-bold truncate">{c.name}</div>
                <div className="text-[12px] text-ink-dim">{t(CAMPAIGN_META[c.type].label)}</div>
              </div>
              <span className={`text-[11.5px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${st.cls}`}>{st.text}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn} disabled={busy} onClick={() => { setEditing(c); setIsNew(false); setError(""); }}>{t("Ändra")}</button>
              <button type="button" className={btn} disabled={busy} onClick={() => save(campaigns.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled, rev: Date.now() } : x)))}>
                {c.enabled ? t("Stäng av") : t("Slå på")}
              </button>
              <button
                type="button"
                className={`${btn} text-red-700 border-red-300`}
                disabled={busy}
                onClick={() => { if (window.confirm(t("Ta bort kampanjen ”{name}”? Du kan ångra direkt efteråt.", { name: c.name }))) void save(campaigns.filter((x) => x.id !== c.id)); }}
              >
                {t("Ta bort")}
              </button>
            </div>
          </div>
        );
      })}
      {error && <div className="text-[12.5px] text-red-700">{error}</div>}
      <button type="button" className={`${btnPrimary} justify-self-start`} disabled={campaigns.length >= MAX_CAMPAIGNS} onClick={() => setPicking(true)}>
        + {t("Ny kampanj")}
      </button>
    </div>
  );
}
