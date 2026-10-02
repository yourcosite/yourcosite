"use client";

import { useState } from "react";
import AccountHeader from "@/components/AccountHeader";

const initialToggles = [
  { id: "changes", label: "Ändringar publicerade", desc: "Mejl varje gång en ändring går live", on: true },
  { id: "billing", label: "Fakturering", desc: "Kvitton och betalpåminnelser", on: true },
  { id: "tips", label: "Tips och nyheter", desc: "Då och då, inget skräppost", on: false },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState(initialToggles);
  const [lang, setLang] = useState<"sv" | "en">("sv");

  const toggle = (id: string) =>
    setToggles((ts) => ts.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/installningar" />

      <div className="flex-1 px-6 md:px-12 py-10 flex gap-10">
        <div className="w-[170px] flex-shrink-0 hidden md:flex flex-col gap-1">
          <a className="px-3 py-2 rounded-lg bg-accent-soft text-ink font-semibold text-[13.5px]">Konto</a>
          <a className="px-3 py-2 rounded-lg text-ink-dim text-[13.5px]">Lösenord</a>
          <a className="px-3 py-2 rounded-lg text-ink-dim text-[13.5px]">Notiser</a>
          <a className="px-3 py-2 rounded-lg text-warm text-[13.5px] mt-3.5">Ta bort konto</a>
        </div>

        <div className="flex-1 max-w-[560px]">
          <h1 className="text-[28px] font-medium mb-6.5">Kontouppgifter</h1>

          <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5">Förnamn</label>
                <input defaultValue="Carl" className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5">Efternamn</label>
                <input defaultValue="Schnell" className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-semibold mb-1.5">E-post</label>
              <input defaultValue="hej@cskb.se" className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Telefon</label>
              <input defaultValue="073 – 150 24 17" className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]" />
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6 mb-5">
            <div className="font-semibold text-[15px] mb-4">Språk</div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setLang("sv")}
                className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold ${
                  lang === "sv" ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"
                }`}
              >
                Svenska
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold ${
                  lang === "en" ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
            <div className="font-semibold text-[15px] mb-4">E-postnotiser</div>
            {toggles.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-b-0">
                <div>
                  <div className="text-[13.5px] font-semibold">{t.label}</div>
                  <div className="text-[12px] text-ink-dim mt-0.5">{t.desc}</div>
                </div>
                <button
                  onClick={() => toggle(t.id)}
                  aria-label={t.label}
                  className="w-[42px] h-6 rounded-full relative flex-shrink-0"
                  style={{ background: t.on ? "#C6FF5E" : "#D9D6CE" }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all"
                    style={{ left: t.on ? "21px" : "3px" }}
                  />
                </button>
              </div>
            ))}
          </div>

          <button className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px]">
            Spara ändringar
          </button>
        </div>
      </div>
    </div>
  );
}
