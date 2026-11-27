"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSiteT } from "@/components/SiteI18n";
import { useT } from "@/components/I18nProvider";
import { campaignLive, campaignOnPage, type Campaign } from "@/lib/campaigns";

// Visar kundens kampanjytor på sajten (se lib/campaigns.ts). SitePreview
// anropar CampaignSlot på fyra ställen: "bar" (ovanför menyn), "top" (under
// menyn), "bottom" (före sidfoten) och "float" (flytande rutor och märken).
// Knappar och länkar renderas av SitePreview (renderButton/renderLink) så de
// följer sajtens knappstil och sidnavigering.

export type CampaignRenderButton = (link: string, color: string, children: ReactNode) => ReactNode;
export type CampaignRenderLink = (link: string | undefined, props: { className?: string; style?: CSSProperties }, children: ReactNode) => ReactNode;

type Slot = "bar" | "top" | "bottom" | "float";

type Props = {
  slot: Slot;
  campaigns?: Campaign[];
  pagePath: string;
  accent: string;
  // Redigeringsvyn: visar alla påslagna kampanjer (oavsett schema) och lägger
  // flytande ytor i sidan i stället för att fästa dem i fönstret.
  editable?: boolean;
  renderButton: CampaignRenderButton;
  renderLink: CampaignRenderLink;
  // Cookiebannern ligger i nederkanten: flytande ytor flyttas upp över den.
  cookieOpen?: boolean;
};

const DARK = "#15140F";
const LIGHT = "#F5F4F1";

function lum(hex: string): number {
  const h = (hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return 0.5;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function tones(accent: string, tone: "accent" | "dark") {
  if (tone === "accent") {
    const fg = lum(accent) < 0.45 ? LIGHT : "#17171A";
    return { bg: accent, fg, btn: fg === LIGHT ? LIGHT : DARK, line: fg };
  }
  const pop = lum(accent) > 0.18 ? accent : LIGHT;
  return { bg: DARK, fg: pop, btn: pop, line: pop };
}

function store(session: boolean) {
  try {
    return session ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}
function getItem(k: string, session: boolean): string | null {
  try {
    return store(session)?.getItem(k) ?? null;
  } catch {
    return null;
  }
}
function setItem(k: string, v: string, session: boolean) {
  try {
    store(session)?.setItem(k, v);
  } catch {
    /* ignoreras: lagringen är blockerad */
  }
}

function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}

const CSS = `
@keyframes ycs-cm-roll{to{transform:translateX(-100%)}}
@keyframes ycs-cm-spin{to{transform:rotate(360deg)}}
@keyframes ycs-cm-wob{0%,100%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(6deg) scale(1.06)}}
.ycs-cm-mq{overflow:hidden;white-space:nowrap;display:flex;border-block:2px solid var(--cm-line)}
.ycs-cm-mq .tr{display:flex;flex-shrink:0;min-width:100%;animation:ycs-cm-roll var(--sp,26s) linear infinite}
.ycs-cm-mq .tr span{display:flex;align-items:center;gap:20px;padding:11px 20px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:18px;font-family:var(--ycs-hf,inherit)}
.ycs-cm-mq .tr span::after{content:"✦";font-size:.8em}
.ycs-cm-mq.big .tr span{font-size:clamp(22px,4vw,34px);padding:16px 26px}
.ycs-cm-mq:hover .tr,.ycs-cm-cards:hover .tr{animation-play-state:paused}
.ycs-cm-mq.rev .tr{animation-direction:reverse}
.ycs-cm-cards{overflow:hidden;display:flex}
.ycs-cm-cards .tr{display:flex;flex-shrink:0;gap:14px;padding-right:14px;animation:ycs-cm-roll var(--sp,40s) linear infinite}
.ycs-cm-diag{position:relative;height:190px;overflow:hidden}
.ycs-cm-diag .a,.ycs-cm-diag .b{position:absolute;left:-5%;right:-5%}
.ycs-cm-diag .a{top:34px;transform:rotate(-3deg);z-index:2}
.ycs-cm-diag .b{top:96px;transform:rotate(2.5deg);z-index:1}
.ycs-cm-cd{display:flex;gap:6px}
.ycs-cm-cd div{border-radius:8px;padding:4px 8px;text-align:center;min-width:44px;font-weight:700;font-size:17px;line-height:1.1;background:rgba(127,127,127,.22)}
.ycs-cm-cd small{display:block;font-size:9px;font-weight:500;opacity:.75;text-transform:uppercase;letter-spacing:.06em}
.ycs-cm-fade{transition:opacity .5s,transform .5s}
@media (prefers-reduced-motion:reduce){.ycs-cm-mq .tr,.ycs-cm-cards .tr,.ycs-cm-ring,.ycs-cm-badge,.ycs-cm-badge::before{animation:none!important}.ycs-cm-fade{transition:none}}
.ycs-cm-badge{animation:ycs-cm-wob 4s ease-in-out infinite}
.ycs-cm-badge::before{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px dashed var(--cm-bg);animation:ycs-cm-spin 14s linear infinite}
.ycs-cm-prevlabel{font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;font-weight:600;margin-bottom:6px}
`;

function Countdown({ end, color }: { end: number; color: string }) {
  const t = useSiteT();
  const now = useNow(1000);
  const left = Math.max(0, end - now) / 1000;
  if (left <= 0) return null;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const cells: [string, string][] = [
    [pad(left / 86400), t("dgr")],
    [pad((left % 86400) / 3600), t("tim")],
    [pad((left % 3600) / 60), t("min")],
    [pad(left % 60), t("sek")],
  ];
  return (
    <div className="ycs-cm-cd" style={{ color }} role="timer" aria-label={t("Tid kvar")}>
      {cells.map(([v, l]) => (
        <div key={l}>
          {v}
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}

function repeatTo(list: string[], min: number): string[] {
  if (list.length === 0) return [];
  const out: string[] = [];
  while (out.length < min) out.push(...list);
  return out;
}
const speedMult = (s: Campaign["speed"]) => (s === "slow" ? 1.6 : s === "fast" ? 0.6 : 1);

function Track({ items, sp }: { items: string[]; sp: string }) {
  return (
    <>
      <div className="tr" style={{ ["--sp" as string]: sp }}>
        {items.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </div>
      <div className="tr" aria-hidden="true" style={{ ["--sp" as string]: sp }}>
        {items.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </div>
    </>
  );
}

function Marquee({ c, accent, band2 }: { c: Campaign; accent: string; band2?: boolean }) {
  const tone = band2 ? tones(accent, "dark") : tones(accent, c.type === "diagonal" ? "accent" : c.tone);
  const src = band2 ? c.lines2 : c.lines;
  const items = repeatTo(src, 6);
  const chars = items.reduce((n, x) => n + x.length + 6, 0);
  const sp = `${Math.max(14, Math.round(chars * 0.42 * speedMult(c.speed)))}s`;
  if (items.length === 0) return null;
  return (
    <div
      className={`ycs-cm-mq${c.type === "marquee" ? " big" : ""}${band2 ? " rev" : ""}`}
      style={{ background: tone.bg, color: tone.fg, ["--cm-line" as string]: tone.line }}
    >
      <Track items={items} sp={sp} />
    </div>
  );
}

function TopBar({ c, accent, editable }: { c: Campaign; accent: string; editable: boolean }) {
  const t = useSiteT();
  const tone = tones(accent, c.tone);
  const closeKey = `ycs_cmx_${c.id}_${c.rev}`;
  const [closed, setClosed] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!editable && c.dismissible && getItem(closeKey, true)) setClosed(true);
  }, [closeKey, editable, c.dismissible]);
  useEffect(() => {
    if (c.lines.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % c.lines.length), 4500);
    return () => clearInterval(id);
  }, [c.lines.length]);
  if (closed || c.lines.length === 0) return null;
  return (
    <div style={{ background: tone.bg, color: tone.fg }} className="relative flex items-center justify-center gap-3 px-10 py-2 text-[13px] font-semibold min-h-[38px]">
      <div className="grid min-w-0">
        {c.lines.map((l, k) => (
          <span
            key={k}
            className="ycs-cm-fade text-center"
            style={{ gridArea: "1 / 1", opacity: k === i % c.lines.length ? 1 : 0, transform: k === i % c.lines.length ? "none" : "translateY(8px)" }}
            aria-hidden={k !== i % c.lines.length}
          >
            {l}
          </span>
        ))}
      </div>
      {c.lines.length > 1 && (
        <div className="hidden sm:flex gap-1" aria-hidden="true">
          {c.lines.map((_, k) => (
            <b key={k} style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor", opacity: k === i % c.lines.length ? 1 : 0.3 }} />
          ))}
        </div>
      )}
      {c.dismissible && (
        <button
          type="button"
          aria-label={t("Stäng")}
          onClick={() => {
            setClosed(true);
            setItem(closeKey, "1", true);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-[18px] leading-none opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

function Hero({ c, accent, renderButton }: { c: Campaign; accent: string; renderButton: CampaignRenderButton }) {
  const tone = tones(accent, "dark");
  const end = c.endsAt ? Date.parse(c.endsAt) : 0;
  const parts = c.emphasis && c.heading.includes(c.emphasis) ? c.heading.split(c.emphasis) : null;
  return (
    <div
      className="relative overflow-hidden px-6 py-10 md:px-12 md:py-14 grid gap-4"
      style={{
        color: "#fff",
        background: c.imageUrl
          ? `linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.7)), url(${JSON.stringify(c.imageUrl)}) center/cover`
          : `radial-gradient(120% 140% at 85% 0%, ${accent}b3, transparent 60%), ${DARK}`,
      }}
    >
      {c.kicker && <div className="text-[12px] tracking-[0.14em] uppercase font-semibold opacity-80">{c.kicker}</div>}
      <div className="font-bold leading-[1.02] max-w-[16ch]" style={{ fontSize: "clamp(34px,7vw,64px)", fontFamily: "var(--ycs-hf, inherit)", textWrap: "balance" as CSSProperties["textWrap"] }}>
        {parts ? (
          <>
            {parts[0]}
            <span style={{ color: tone.fg }}>{c.emphasis}</span>
            {parts.slice(1).join(c.emphasis)}
          </>
        ) : (
          c.heading
        )}
      </div>
      {c.body && <div className="text-[16px] max-w-[48ch] opacity-90">{c.body}</div>}
      {c.showCountdown && end > 0 && <Countdown end={end} color="#fff" />}
      {c.buttonText && <div>{renderButton(c.buttonLink, tone.btn, c.buttonText)}</div>}
      {!c.imageUrl && (
        <div
          aria-hidden="true"
          className="ycs-cm-ring"
          style={{ position: "absolute", right: -60, bottom: -80, width: 260, height: 260, borderRadius: "50%", border: `2px dashed ${accent}99`, animation: "ycs-cm-spin 30s linear infinite" }}
        />
      )}
    </div>
  );
}

function Cards({ c, accent, palette, renderLink }: { c: Campaign; accent: string; palette: { text: string; bgAlt: string }; renderLink: CampaignRenderLink }) {
  if (c.cards.length === 0) return null;
  const items = c.cards.length >= 5 ? c.cards : [...c.cards, ...c.cards, ...c.cards].slice(0, Math.max(5, c.cards.length));
  const sp = `${Math.max(24, Math.round(items.length * 9 * speedMult(c.speed)))}s`;
  const card = (x: Campaign["cards"][number], k: number) => (
    <div key={k} style={{ width: 230, flex: "none" }}>
      {renderLink(
        x.link,
        { className: "block rounded-[14px] p-3.5 text-left", style: { background: "rgba(127,127,127,.1)", border: "1px solid rgba(127,127,127,.25)", color: "inherit" } },
        <>
          <div
            className="relative rounded-[10px] mb-2.5"
            style={{ height: 96, background: x.imageUrl ? `url(${JSON.stringify(x.imageUrl)}) center/cover` : `linear-gradient(135deg, ${accent}, ${palette.bgAlt})` }}
          >
            {x.label && (
              <b style={{ position: "absolute", top: 8, left: 8, background: DARK, color: tones(accent, "dark").fg, fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>{x.label}</b>
            )}
          </div>
          <strong className="block text-[14px]">{x.title}</strong>
          {x.text && <span className="block text-[12px] opacity-70 mt-0.5">{x.text}</span>}
        </>
      )}
    </div>
  );
  return (
    <div className="py-6" style={{ background: "rgba(127,127,127,.06)" }}>
      {c.heading && <div className="px-6 md:px-12 mb-4 text-[20px] font-semibold" style={{ fontFamily: "var(--ycs-hf, inherit)" }}>{c.heading}</div>}
      <div className="ycs-cm-cards">
        <div className="tr" style={{ ["--sp" as string]: sp }}>{items.map(card)}</div>
        <div className="tr" aria-hidden="true" style={{ ["--sp" as string]: sp }}>{items.map(card)}</div>
      </div>
    </div>
  );
}

function Diagonal({ c, accent }: { c: Campaign; accent: string }) {
  return (
    <div className="ycs-cm-diag">
      <div className="a"><Marquee c={c} accent={accent} /></div>
      <div className="b"><Marquee c={c} accent={accent} band2 /></div>
    </div>
  );
}

function Badge({ c, accent, preview, offset, renderLink }: { c: Campaign; accent: string; preview: boolean; offset: number; renderLink: CampaignRenderLink }) {
  const tone = tones(accent, "accent");
  if (!c.badgeText) return null;
  const pos: CSSProperties = preview ? { position: "relative", display: "inline-grid" } : { position: "fixed", right: 16, top: 110, zIndex: 35 };
  void offset;
  return (
    <div style={pos}>
      {renderLink(
        c.buttonLink || undefined,
        {
          className: "ycs-cm-badge relative grid place-items-center text-center rounded-full",
          style: { width: 92, height: 92, background: tone.bg, color: tone.fg, boxShadow: "0 8px 20px rgba(0,0,0,.25)", ["--cm-bg" as string]: tone.bg, fontFamily: "var(--ycs-hf, inherit)" },
        },
        <span className="block font-bold leading-none" style={{ fontSize: c.badgeText.length > 5 ? 17 : 22 }}>
          {c.badgeText}
          {c.badgeSub && <small className="block font-semibold mt-1" style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "inherit" }}>{c.badgeSub}</small>}
        </span>
      )}
    </div>
  );
}

function Sticky({ c, accent, editable, bottom, renderButton }: { c: Campaign; accent: string; editable: boolean; bottom: number; renderButton: CampaignRenderButton }) {
  const t = useSiteT();
  const tone = tones(accent, c.tone);
  const closeKey = `ycs_cmx_${c.id}_${c.rev}`;
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!editable && c.dismissible && getItem(closeKey, true)) setClosed(true);
  }, [closeKey, editable, c.dismissible]);
  if (closed) return null;
  const end = c.endsAt ? Date.parse(c.endsAt) : 0;
  const style: CSSProperties = editable
    ? { position: "relative" }
    : { position: "fixed", left: 12, right: 12, bottom, zIndex: 40, maxWidth: 940, margin: "0 auto" };
  return (
    <div style={{ ...style, background: tone.bg, color: tone.fg, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 12px 30px rgba(0,0,0,.3)" }}>
      <div className="min-w-0 text-[14px] font-semibold" style={{ flex: "1 1 160px" }}>
        {c.heading}
        {c.showCountdown && end > 0 && c.kicker && <small className="block text-[12px] font-medium opacity-75">{c.kicker}</small>}
      </div>
      {c.showCountdown && end > 0 && <Countdown end={end} color={tone.fg} />}
      {c.buttonText && renderButton(c.buttonLink, tone.btn, c.buttonText)}
      {c.dismissible && (
        <button
          type="button"
          aria-label={t("Stäng")}
          onClick={() => {
            setClosed(true);
            setItem(closeKey, "1", true);
          }}
          className="text-[18px] leading-none px-1 opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Rutan som glider in. Visningsreglerna lagras i besökarens webbläsare:
// per kampanj och version (ändrar kunden kampanjen räknas den som ny).
function SlideIn({ c, editable, bottom, renderButton }: { c: Campaign; editable: boolean; bottom: number; renderButton: CampaignRenderButton }) {
  const t = useSiteT();
  const [shown, setShown] = useState(editable);
  const base = `ycs_cm_${c.id}_${c.rev}`;
  const counted = useRef(false);

  useEffect(() => {
    if (editable) {
      setShown(true);
      return;
    }
    // Besökaren har stängt den i den här sessionen.
    if (getItem(`${base}_x`, true)) return;
    const views = Number(getItem(`${base}_v`, false) || "0") || 0;
    if (c.maxViews > 0 && views >= c.maxViews) return;
    if (c.frequency === "once" && views >= 1) return;
    if (c.frequency === "visit" && getItem(`${base}_s`, true)) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      setShown(true);
      if (!counted.current) {
        counted.current = true;
        setItem(`${base}_v`, String(views + 1), false);
        setItem(`${base}_s`, "1", true);
      }
      if (!c.stayUntilClosed) hide = setTimeout(() => setShown(false), c.autoHideSec * 1000);
    }, Math.max(0, c.delaySec) * 1000);
    return () => {
      clearTimeout(show);
      if (hide) clearTimeout(hide);
    };
  }, [base, editable, c.maxViews, c.frequency, c.delaySec, c.stayUntilClosed, c.autoHideSec]);

  const pos: CSSProperties = editable ? { position: "relative", maxWidth: 320 } : { position: "fixed", right: 14, bottom, zIndex: 40, width: "min(320px, calc(100% - 28px))" };
  return (
    <div
      role="dialog"
      aria-label={c.heading}
      aria-hidden={!shown}
      className="ycs-cm-fade"
      style={{
        ...pos,
        background: "#fff",
        color: "#17171A",
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 16px 40px rgba(0,0,0,.28)",
        border: "1px solid rgba(0,0,0,.08)",
        transform: shown ? "none" : "translateX(130%)",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        display: "grid",
        gap: 8,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: "#6A6D60" }}>{c.kicker}</span>
        <button
          type="button"
          aria-label={t("Stäng")}
          onClick={() => {
            setShown(false);
            setItem(`${base}_x`, "1", true);
          }}
          className="text-[18px] leading-none px-1 opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
      <strong className="text-[17px] leading-snug" style={{ fontFamily: "var(--ycs-hf, inherit)" }}>{c.heading}</strong>
      {c.body && <span className="text-[13.5px]" style={{ color: "#4A4D42" }}>{c.body}</span>}
      {c.buttonText && <div>{renderButton(c.buttonLink, DARK, c.buttonText)}</div>}
    </div>
  );
}

export default function CampaignSlot({ slot, campaigns, pagePath, accent, editable = false, renderButton, renderLink, cookieOpen }: Props) {
  const ut = useT();
  const now = useNow(15000);
  const palette = { text: "#17171A", bgAlt: "#EEE" };
  if (!campaigns || campaigns.length === 0) return null;
  const live = campaigns.filter((c) => campaignLive(c, now, editable) && campaignOnPage(c, pagePath));
  if (live.length === 0) return null;

  if (slot === "bar") {
    const bars = live.filter((c) => c.type === "topbar");
    if (bars.length === 0) return null;
    return (
      <>
        <style>{CSS}</style>
        {bars.map((c) => <TopBar key={c.id} c={c} accent={accent} editable={editable} />)}
      </>
    );
  }

  if (slot === "top" || slot === "bottom") {
    const list = live.filter((c) => ["marquee", "hero", "cards", "diagonal"].includes(c.type) && c.placement === slot);
    if (list.length === 0) return null;
    return (
      <>
        <style>{CSS}</style>
        {list.map((c) => {
          if (c.type === "marquee") return <Marquee key={c.id} c={c} accent={accent} />;
          if (c.type === "hero") return <Hero key={c.id} c={c} accent={accent} renderButton={renderButton} />;
          if (c.type === "cards") return <Cards key={c.id} c={c} accent={accent} palette={palette} renderLink={renderLink} />;
          return <Diagonal key={c.id} c={c} accent={accent} />;
        })}
      </>
    );
  }

  const floats = live.filter((c) => c.type === "sticky" || c.type === "badge" || c.type === "slidein");
  if (floats.length === 0) return null;
  const cookie = cookieOpen && !editable ? 130 : 0;
  const hasSticky = floats.some((c) => c.type === "sticky");
  const stickyBottom = 12 + cookie;
  const slideBottom = 14 + cookie + (hasSticky ? 84 : 0);

  const items = floats.map((c) => {
    if (c.type === "sticky") return <Sticky key={c.id} c={c} accent={accent} editable={editable} bottom={stickyBottom} renderButton={renderButton} />;
    if (c.type === "badge") return <Badge key={c.id} c={c} accent={accent} preview={editable} offset={0} renderLink={renderLink} />;
    return <SlideIn key={c.id} c={c} editable={editable} bottom={slideBottom} renderButton={renderButton} />;
  });

  if (editable) {
    return (
      <div className="px-6 py-6" style={{ borderTop: "1px dashed rgba(127,127,127,.5)" }}>
        <style>{CSS}</style>
        <div className="ycs-cm-prevlabel">{ut("Förhandsvisning: så här ser de flytande ytorna ut. På sajten ligger de fast i fönstret.")}</div>
        <div className="grid gap-4 justify-items-start">{items}</div>
      </div>
    );
  }
  return (
    <>
      <style>{CSS}</style>
      {items}
    </>
  );
}
