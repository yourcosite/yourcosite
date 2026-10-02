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

const colorOptions = ["#C6FF5E", "#E8714A", "#2F5D50", "#C2410C", "#17171A"];

export default function OnboardingStep4() {
  const [styleId, setStyleId] = useState("warm");
  const [color, setColor] = useState("#C6FF5E");

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

        <div className="text-[13.5px] font-semibold mb-2.5">Accentfärg</div>
        <div className="flex items-center gap-3 mb-7 flex-wrap">
          {colorOptions.map((hex) => (
            <button
              type="button"
              key={hex}
              aria-label={hex}
              onClick={() => setColor(hex)}
              className="w-[38px] h-[38px] rounded-full flex-shrink-0"
              style={{
                background: hex,
                boxShadow: color === hex ? `0 0 0 3px #fff, 0 0 0 5px ${hex}` : "none",
              }}
            />
          ))}
          <div className="w-px h-6.5 bg-line mx-1 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <div
              className="w-[38px] h-[38px] rounded-full border border-line flex-shrink-0"
              style={{ background: color }}
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={7}
              className="w-[108px] box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] font-mono"
            />
            <span className="text-[12px] text-ink-dim">Egen hexkod</span>
          </div>
        </div>

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
