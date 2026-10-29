"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { msg } from "@/lib/i18n/config";
import { SKINS } from "@/lib/skins";
import type { SiteContent, SkinId, HeaderLayout, ButtonStyle } from "@/lib/contentModel";

// Designpanelen i redigeraren: allt som gäller hela sajtens utseende på ett
// ställe. Varje val sparas direkt via /api/sites/edit-theme (se onChange i
// app/redigera/page.tsx) och går att ångra. Ingen AI inblandad.

const SKIN_LABELS: Record<SkinId, string> = {
  solglimt: msg("Solglimt"),
  skymning: msg("Skymning"),
  pastell: msg("Pastell"),
  kontrast: msg("Kontrast"),
  fargyta: msg("Färgyta"),
};

const BUTTONS: { id: ButtonStyle; label: string }[] = [
  { id: "pill", label: msg("Rund") },
  { id: "rounded", label: msg("Mjukt rundad") },
  { id: "square", label: msg("Kantig") },
  { id: "soft", label: msg("Mjuk ton") },
  { id: "outline", label: msg("Ram") },
  { id: "gradient", label: msg("Färgton") },
  { id: "underline", label: msg("Understruken") },
];

const HEADERS: { id: HeaderLayout; label: string }[] = [
  { id: "left", label: msg("Logga vänster") },
  { id: "centered-stacked", label: msg("Centrerad logga") },
  { id: "split", label: msg("Meny i mitten") },
  { id: "left-button", label: msg("Vänster med knapp") },
  { id: "split-button", label: msg("Mitten med knapp") },
  { id: "centered-button", label: msg("Centrerad med knapp") },
  { id: "pill-bar", label: msg("Flytande ruta") },
  { id: "minimal", label: msg("Minimal") },
];

const SCALES: { v: number; label: string }[] = [
  { v: 0.85, label: msg("Mindre") },
  { v: 1, label: msg("Standard") },
  { v: 1.2, label: msg("Större") },
  { v: 1.4, label: msg("Mycket större") },
];

const BASE_COLORS = ["#C6FF5E", "#E8714A", "#B4567A", "#2E7D5B", "#2F6FDE", "#E0A526", "#17171A", "#8A5CF6"];

function btnSample(id: ButtonStyle, accent: string): React.CSSProperties {
  switch (id) {
    case "soft": return { background: `color-mix(in srgb, ${accent} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`, borderRadius: 12 };
    case "outline": return { border: `1.5px solid ${accent}`, borderRadius: 999 };
    case "underline": return { borderBottom: `2px solid ${accent}`, borderRadius: 0 };
    case "square": return { background: accent, borderRadius: 6, color: "#17171A" };
    case "rounded": return { background: accent, borderRadius: 12, color: "#17171A" };
    case "gradient": return { background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, transparent))`, borderRadius: 999, color: "#17171A" };
    default: return { background: accent, borderRadius: 999, color: "#17171A" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-dim">{title}</div>
      {children}
    </div>
  );
}

const opt = (on: boolean) =>
  `rounded-xl border text-left disabled:opacity-60 ${on ? "border-ink bg-white ring-1 ring-ink" : "border-line bg-white hover:border-ink-dim"}`;

export default function DesignPanel({
  content,
  busy,
  onChange,
  onClose,
}: {
  content: SiteContent;
  busy: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const t = useT();
  const th = content.theme;
  const accent = th.accentColor || "#2E7D5B";
  const [custom, setCustom] = useState<string | null>(null);
  const colors = Array.from(new Set([th.accentColor, ...(th.secondaryColors || []), ...BASE_COLORS].filter((c): c is string => /^#[0-9a-fA-F]{6}$/.test(c || "")).map((c) => c.toUpperCase())));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <div className="text-[17px] font-bold">{t("Design")}</div>
          <div className="text-[12px] text-ink-dim mt-0.5">{t("Gäller hela sajten. Det du markerar på sajten får egna val.")}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-ink-dim text-[18px] leading-none px-1">×</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-5">
        <Section title={t("Utseende")}>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SKINS) as SkinId[]).map((id) => {
              const p = SKINS[id].palette(SKINS[id].accent ? SKINS[id].accent!(accent) : accent);
              return (
                <button key={id} type="button" disabled={busy} onClick={() => onChange({ skin: id })} className={`${opt(th.skin === id)} p-2`}>
                  <div className="h-10 rounded-lg flex items-end gap-1 p-1.5" style={{ background: p.bg }}>
                    <span className="h-2 w-8 rounded-sm" style={{ background: p.text }} />
                    <span className="h-2 w-4 rounded-sm" style={{ background: SKINS[id].accent ? SKINS[id].accent!(accent) : accent }} />
                  </div>
                  <div className="text-[12.5px] font-semibold mt-1.5">{t(SKIN_LABELS[id])}</div>
                </button>
              );
            })}
            {th.skin && (
              <button type="button" disabled={busy} onClick={() => onChange({ skin: null })} className={`${opt(false)} p-2 text-[12.5px] text-ink-dim flex items-center justify-center`}>
                {t("Utan paket")}
              </button>
            )}
          </div>
        </Section>

        <Section title={t("Accentfärg")}>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy}
                aria-label={c}
                onClick={() => onChange({ accentColor: c })}
                className={`w-8 h-8 rounded-full border-2 disabled:opacity-60 ${accent.toUpperCase() === c ? "border-ink ring-2 ring-ink" : "border-line"}`}
                style={{ background: c }}
              />
            ))}
            <label className="text-[12px] flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1 cursor-pointer">
              {t("Egen färg")}
              <input type="color" disabled={busy} value={custom ?? accent} onChange={(e) => setCustom(e.target.value.toUpperCase())} className="w-6 h-6 p-0 border-0 bg-transparent" />
            </label>
            {custom && custom !== accent.toUpperCase() && (
              <button type="button" disabled={busy} onClick={() => { onChange({ accentColor: custom }); setCustom(null); }} className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-3 py-1.5">
                {t("Använd")}
              </button>
            )}
          </div>
        </Section>

        <Section title={t("Typsnitt")}>
          <div className="grid grid-cols-2 gap-2">
            {([["serif", msg("Med seriffer")], ["sans", msg("Utan seriffer")]] as const).map(([id, label]) => (
              <button key={id} type="button" disabled={busy} onClick={() => onChange({ font: id })} className={`${opt(th.font === id)} px-3 py-2.5`}>
                <div className={`text-[20px] leading-none ${id === "serif" ? "font-serif" : "font-sans"}`}>Aa</div>
                <div className="text-[12px] font-semibold mt-1">{t(label)}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("Bakgrund")}>
          <div className="grid grid-cols-3 gap-2">
            {([["light", msg("Ljus"), "#FFFFFF", "#17171A"], ["warm", msg("Varm"), "#F4EFE6", "#17171A"], ["dark", msg("Mörk"), "#17171A", "#FFFFFF"]] as const).map(([id, label, bg, fg]) => (
              <button key={id} type="button" disabled={busy} onClick={() => onChange({ backgroundMode: id })} className={`${opt(th.backgroundMode === id)} p-2`}>
                <div className="h-8 rounded-md border border-line flex items-center justify-center text-[11px] font-bold" style={{ background: bg, color: fg }}>Aa</div>
                <div className="text-[12px] font-semibold mt-1">{t(label)}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("Knappar på hela sajten")}>
          <div className="grid grid-cols-2 gap-2">
            {BUTTONS.map((b) => (
              <button key={b.id} type="button" disabled={busy} onClick={() => onChange({ buttonStyle: b.id })} className={`${opt((th.buttonStyle || "pill") === b.id)} p-2`}>
                <div className="flex justify-center py-1">
                  <span className="inline-block text-[11px] font-semibold px-4 py-1.5" style={btnSample(b.id, accent)}>{t("Knapp")}</span>
                </div>
                <div className="text-[12px] font-semibold mt-1">{t(b.label)}</div>
              </button>
            ))}
          </div>
          <div className="text-[11.5px] text-ink-dim">{t("Har en enskild knapp fått egen stil kan du återställa den genom att markera knappen.")}</div>
        </Section>

        <Section title={t("Rubrikernas storlek")}>
          <div className="grid grid-cols-4 gap-1.5">
            {SCALES.map((s) => (
              <button key={s.v} type="button" disabled={busy} onClick={() => onChange({ headingScale: s.v })} className={`${opt((th.headingScale ?? 1) === s.v)} px-1.5 py-2 text-center text-[11.5px] font-semibold`}>
                {t(s.label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("Luft mellan sektioner")}>
          <div className="grid grid-cols-3 gap-1.5">
            {([["compact", msg("Tätt")], ["normal", msg("Normalt")], ["airy", msg("Luftigt")]] as const).map(([id, label]) => (
              <button key={id} type="button" disabled={busy} onClick={() => onChange({ sectionSpacing: id })} className={`${opt((th.sectionSpacing ?? "normal") === id)} px-1.5 py-2 text-center text-[12px] font-semibold`}>
                {t(label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("Textjustering")}>
          <div className="grid grid-cols-4 gap-1.5">
            {([["auto", msg("Som mallen")], ["left", msg("Vänster")], ["center", msg("Mitten")], ["right", msg("Höger")]] as const).map(([id, label]) => (
              <button key={id} type="button" disabled={busy} onClick={() => onChange({ textAlign: id })} className={`${opt((th.textAlign ?? "auto") === id)} px-1 py-2 text-center text-[11.5px] font-semibold`}>
                {t(label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("Meny och logga")}>
          <div className="grid grid-cols-2 gap-2">
            {HEADERS.map((h) => (
              <button key={h.id} type="button" disabled={busy} onClick={() => onChange({ headerLayout: h.id })} className={`${opt((th.headerLayout || "left") === h.id)} px-3 py-2.5 text-[12px] font-semibold`}>
                {t(h.label)}
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => onChange({ headerGlass: !th.headerGlass })} className={`${opt(!!th.headerGlass)} px-3 py-2.5`}>
            <div className="text-[12.5px] font-semibold">{t("Genomskinlig över bilden")}</div>
            <div className="text-[11.5px] text-ink-dim">{t("Bilden syns svagt genom menyn när sidan börjar med en stor bild.")}</div>
          </button>
        </Section>
      </div>
      <div className="px-5 py-3 border-t border-line text-[11.5px] text-ink-dim">{t("Sparas direkt. Ångra finns kvar.")}</div>
    </div>
  );
}
