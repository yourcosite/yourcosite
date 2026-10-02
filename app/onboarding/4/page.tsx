"use client";

import { useState } from "react";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";

const styleCards = [
  { id: "minimal", name: "Minimalistisk", desc: "Mycket luft, lugn ton.", dot: "#17171A", href: "/stil/minimal" },
  { id: "bold", name: "Djärv", desc: "Stora typsnitt, hög kontrast.", dot: "#DC2626", href: "/stil/djarv" },
  { id: "warm", name: "Varm", desc: "Runda former, inbjudande.", dot: "#E8714A", href: "/stil/varm" },
  { id: "classic", name: "Klassisk", desc: "Balanserad, seriös.", dot: "#2F5D50", href: "/stil/klassisk" },
];

const swatches = [
  "#C6FF5E", // lime
  "#E8714A", // warm orange
  "#2F5D50", // forest green
  "#DC2626", // red
  "#2563EB", // blue
  "#0EA5E9", // sky blue
  "#7C3AED", // purple
  "#DB2777", // pink
  "#CA8A04", // gold
  "#0D9488", // teal
  "#17171A", // ink
  "#FFFFFF", // white
];

function isValidHex(v: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function ColorCircle({
  value,
  onChange,
  size = 38,
  ring = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full border border-line"
        style={{
          width: size,
          height: size,
          background: isValidHex(value) ? value : "#ffffff",
          boxShadow: ring ? "0 0 0 3px #fff, 0 0 0 5px var(--tw-shadow-color, currentColor)" : undefined,
        }}
      />
      <input
        type="color"
        value={isValidHex(value) && value.length === 7 ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Öppna färgväljare"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

export default function OnboardingStep4() {
  const [styleId, setStyleId] = useState("warm");
  const [mainColor, setMainColor] = useState("#C6FF5E");
  const [extraColors, setExtraColors] = useState<string[]>(["#2F5D50"]);
  const [mainHexDraft, setMainHexDraft] = useState("#C6FF5E");
  const [extraHexDraft, setExtraHexDraft] = useState("");

  const setMain = (hex: string) => {
    setMainColor(hex);
    setMainHexDraft(hex);
  };

  const toggleExtra = (hex: string) => {
    setExtraColors((cur) => {
      if (cur.includes(hex)) return cur.filter((c) => c !== hex);
      if (cur.length >= 2) return cur;
      return [...cur, hex];
    });
  };

  const removeExtra = (hex: string) =>
    setExtraColors((cur) => cur.filter((c) => c !== hex));

  const addExtraHex = () => {
    if (!isValidHex(extraHexDraft)) return;
    if (extraColors.length >= 2) return;
    if (extraColors.includes(extraHexDraft)) return;
    setExtraColors((cur) => [...cur, extraHexDraft]);
    setExtraHexDraft("");
  };

  return (
    <OnboardingShell step={4} stepLabel="STIL">
      <div className="w-full max-w-[760px]">
        <h1 className="text-[34px] font-medium mb-2">
          Vilken känsla passar er?
        </h1>
        <p className="text-[15.5px] text-ink-dim mb-6.5">
          Du kan ändra allt senare — det här ger oss bara en riktning att
          utgå från.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-7">
          {styleCards.map((s) => {
            const selected = styleId === s.id;
            return (
              <div
                key={s.id}
                className={`rounded-2xl p-3 pb-3.5 border-[1.5px] ${
                  selected ? "border-accent bg-accent-soft" : "border-line bg-surface"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setStyleId(s.id)}
                  className="flex items-center gap-1.5 mb-1 w-full text-left"
                >
                  <div
                    className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                    style={{ background: s.dot }}
                  />
                  <span className="font-semibold text-[13.5px]">{s.name}</span>
                </button>
                <div className="text-[11.5px] text-ink-dim mb-2.5 leading-snug">
                  {s.desc}
                </div>
                <Link href={s.href} className="block">
                  <div className="h-[100px] rounded-lg border border-line bg-surface flex items-center justify-center text-[11px] text-ink-dim">
                    Förhandsvisning
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#17171A" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span className="text-[11px] font-semibold">Visa hela sidan</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Huvudfärg */}
        <div className="text-[13.5px] font-semibold mb-1">Huvudfärg</div>
        <p className="text-[12px] text-ink-dim mb-2.5">
          Den färg som syns mest — knappar, länkar och accenter.
        </p>
        <div className="flex items-center gap-2.5 mb-7 flex-wrap">
          {swatches.map((hex) => (
            <button
              type="button"
              key={hex}
              aria-label={hex}
              onClick={() => setMain(hex)}
              className="w-[34px] h-[34px] rounded-full flex-shrink-0 border border-line"
              style={{
                background: hex,
                boxShadow: mainColor === hex ? `0 0 0 3px #fff, 0 0 0 5px #17171A` : "none",
              }}
            />
          ))}
          <div className="w-px h-6.5 bg-line mx-1 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <ColorCircle value={mainColor} onChange={setMain} />
            <input
              value={mainHexDraft}
              onChange={(e) => {
                setMainHexDraft(e.target.value);
                if (isValidHex(e.target.value)) setMainColor(e.target.value);
              }}
              maxLength={7}
              className="w-[100px] box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] font-mono"
            />
            <span className="text-[12px] text-ink-dim">Egen hexkod</span>
          </div>
        </div>

        {/* Fler färger */}
        <div className="text-[13.5px] font-semibold mb-1">
          Fler färger <span className="text-ink-dim font-normal">(valfritt, max 2)</span>
        </div>
        <p className="text-[12px] text-ink-dim mb-2.5">
          Komplementfärger till bakgrunder, kort och detaljer.
        </p>
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
          {swatches
            .filter((hex) => hex !== mainColor)
            .map((hex) => {
              const selected = extraColors.includes(hex);
              const disabled = !selected && extraColors.length >= 2;
              return (
                <button
                  type="button"
                  key={hex}
                  aria-label={hex}
                  disabled={disabled}
                  onClick={() => toggleExtra(hex)}
                  className="w-[34px] h-[34px] rounded-full flex-shrink-0 border border-line"
                  style={{
                    background: hex,
                    opacity: disabled ? 0.35 : 1,
                    boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 5px #17171A` : "none",
                  }}
                />
              );
            })}
          <div className="w-px h-6.5 bg-line mx-1 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <ColorCircle value={extraHexDraft || "#ffffff"} onChange={setExtraHexDraft} />
            <input
              value={extraHexDraft}
              onChange={(e) => setExtraHexDraft(e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="w-[100px] box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] font-mono"
            />
            <button
              type="button"
              onClick={addExtraHex}
              disabled={!isValidHex(extraHexDraft) || extraColors.length >= 2}
              className="text-[12.5px] font-semibold px-3.5 py-2 rounded-lg border border-line disabled:opacity-40"
            >
              Lägg till
            </button>
          </div>
        </div>

        {extraColors.length > 0 && (
          <div className="flex items-center gap-2.5 mb-7 flex-wrap">
            {extraColors.map((hex) => (
              <div
                key={hex}
                className="flex items-center gap-2 bg-surface border border-line rounded-full pl-1.5 pr-3 py-1.5"
              >
                <div
                  className="w-[20px] h-[20px] rounded-full border border-line flex-shrink-0"
                  style={{ background: hex }}
                />
                <span className="text-[12.5px] font-mono">{hex.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => removeExtra(hex)}
                  aria-label={`Ta bort ${hex}`}
                  className="text-ink-dim"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <Link href="/onboarding/3" className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5">
            ← Tillbaka
          </Link>
          <Link
            href="/bygger"
            className="bg-accent text-accent-ink font-semibold text-[15.5px] px-7.5 py-3.5 rounded-[10px]"
          >
            Bygg min sajt →
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
