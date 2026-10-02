"use client";

import { useEffect, useState } from "react";

const steps = [
  {
    n: "1",
    title: "Berätta om er",
    body: "Namn, ton, färger och egna bilder — så mycket eller lite ni vill.",
  },
  {
    n: "2",
    title: "Vi bygger sajten",
    body: "Text, bilder och design sätts samman snabbt och effektivt.",
  },
  {
    n: "3",
    title: "Fortsätt i samtalet",
    body: "Be om ändringar när som helst — och se dem direkt i sajten.",
  },
];

function BrowserChrome({ dark }: { dark?: boolean }) {
  return (
    <div
      className="h-[30px] flex items-center gap-[5px] px-3"
      style={{ background: dark ? "#232327" : "#EEECE5" }}
    >
      <div
        className="w-[7px] h-[7px] rounded-full"
        style={{ background: dark ? "#3A3A3E" : "#D8D5CC" }}
      />
      <div
        className="w-[7px] h-[7px] rounded-full"
        style={{ background: dark ? "#3A3A3E" : "#D8D5CC" }}
      />
      <div
        className="w-[7px] h-[7px] rounded-full"
        style={{ background: dark ? "#3A3A3E" : "#D8D5CC" }}
      />
    </div>
  );
}

export default function StepsDemo() {
  const [formPhase, setFormPhase] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const formTimer = setInterval(() => setFormPhase((p) => (p + 1) % 3), 2200);
    const phaseTimer = setInterval(() => setPhase((p) => (p === 0 ? 1 : 0)), 2600);
    return () => {
      clearInterval(formTimer);
      clearInterval(phaseTimer);
    };
  }, []);

  const isLoading = phase === 0;
  const isDone = phase === 1;
  const step3Image = isDone ? "/images/bakery-cake.jpg" : "/images/hero-bakery.jpg";

  return (
    <div className="grid md:grid-cols-3 gap-10">
      {steps.map((s, idx) => (
        <div key={s.n}>
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="font-serif italic text-accent-ink bg-accent w-7 h-7 rounded-full inline-flex items-center justify-center text-[14px] flex-shrink-0">
              {s.n}
            </span>
            <span className="font-semibold text-[16.5px]">{s.title}</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-ink-dim mb-4.5 max-w-[30ch]">
            {s.body}
          </p>

          {idx === 0 && (
            <div className="border border-line rounded-2xl bg-bg overflow-hidden shadow-[0_14px_30px_rgba(23,23,26,0.07)]">
              <BrowserChrome />
              {formPhase === 0 && (
                <div
                  className="p-5.5 h-[244px] box-border"
                  style={{ animation: "yc-fade 0.3s ease" }}
                >
                  <div className="text-[11px] text-ink-dim mb-2 font-bold tracking-[0.03em]">
                    FÖRETAGSNAMN
                  </div>
                  <div
                    className="text-[15px] text-ink overflow-hidden whitespace-nowrap border-r-2 border-ink"
                    style={{
                      width: "15ch",
                      animation:
                        "yc-type 2.1s steps(15) forwards, yc-caret .7s step-end infinite",
                    }}
                  >
                    Solgläntans Bageri
                  </div>
                </div>
              )}
              {formPhase === 1 && (
                <div
                  className="p-5.5 h-[244px] box-border"
                  style={{ animation: "yc-fade 0.3s ease" }}
                >
                  <div className="text-[11px] text-ink-dim mb-2 font-bold tracking-[0.03em]">
                    TON
                  </div>
                  <div className="flex gap-1.5 mb-5.5">
                    <div
                      className="bg-accent text-accent-ink text-[11.5px] font-bold px-3.5 py-1.5 rounded-full"
                      style={{ animation: "yc-pop 0.3s ease" }}
                    >
                      Personlig
                    </div>
                    <div className="border border-line text-ink-dim text-[11.5px] px-3.5 py-1.5 rounded-full">
                      Professionell
                    </div>
                  </div>
                  <div className="text-[11px] text-ink-dim mb-2.5 font-bold tracking-[0.03em]">
                    FÄRG
                  </div>
                  <div className="flex gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full bg-[#C9834A]"
                      style={{
                        boxShadow: "0 0 0 2px #fff, 0 0 0 3.5px #C9834A",
                        animation: "yc-pop 0.3s ease",
                      }}
                    />
                    <div className="w-6 h-6 rounded-full bg-accent" />
                    <div className="w-6 h-6 rounded-full bg-[#2F5D50]" />
                    <div className="w-6 h-6 rounded-full bg-[#E4635A]" />
                  </div>
                </div>
              )}
              {formPhase === 2 && (
                <div
                  className="p-5.5 h-[244px] box-border"
                  style={{ animation: "yc-fade 0.3s ease" }}
                >
                  <div className="text-[11px] text-ink-dim mb-2.5 font-bold tracking-[0.03em]">
                    LADDAR UPP BILDER
                  </div>
                  <div className="border-[1.5px] border-dashed border-line rounded-[10px] p-3.5 flex items-center gap-2.5 mb-3.5">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="#6B6A66"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-[11.5px] text-ink font-semibold">
                        bageri_fasad.jpg
                      </div>
                      <div className="h-[5px] rounded-[3px] bg-line mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-ink"
                          style={{ animation: "yc-bar 1.8s ease forwards" }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="w-[42px] h-[42px] rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: "url('/images/step1-beratta.jpg')" }}
                    />
                    <div
                      className="w-[42px] h-[42px] rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: "url('/images/bakery-cake.jpg')" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {idx === 1 && (
            <div className="rounded-2xl bg-ink overflow-hidden shadow-[0_18px_34px_rgba(23,23,26,0.2)]">
              <BrowserChrome dark />
              {isLoading && (
                <div className="p-5 h-[244px] box-border flex flex-col gap-3 justify-center">
                  <div
                    className="h-[34px] rounded-lg"
                    style={{
                      background:
                        "linear-gradient(90deg, #26262A 25%, #38383D 50%, #26262A 75%)",
                      backgroundSize: "200% 100%",
                      animation: "yc-shimmer 1.7s linear infinite",
                    }}
                  />
                  <div className="flex gap-2.5">
                    <div
                      className="flex-1 h-[60px] rounded-lg"
                      style={{
                        background:
                          "linear-gradient(90deg, #26262A 25%, #38383D 50%, #26262A 75%)",
                        backgroundSize: "200% 100%",
                        animation: "yc-shimmer 1.7s linear infinite .15s",
                      }}
                    />
                    <div
                      className="flex-1 h-[60px] rounded-lg"
                      style={{
                        background:
                          "linear-gradient(90deg, #26262A 25%, #38383D 50%, #26262A 75%)",
                        backgroundSize: "200% 100%",
                        animation: "yc-shimmer 1.7s linear infinite .3s",
                      }}
                    />
                  </div>
                  <div
                    className="h-[10px] w-[70%] rounded-[5px]"
                    style={{
                      background:
                        "linear-gradient(90deg, #26262A 25%, #38383D 50%, #26262A 75%)",
                      backgroundSize: "200% 100%",
                      animation: "yc-shimmer 1.7s linear infinite .45s",
                    }}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-[13px] h-[13px] rounded-full border-2"
                      style={{
                        borderColor: "#3A3A3E",
                        borderTopColor: "#C6FF5E",
                        animation: "yc-spin 0.8s linear infinite",
                      }}
                    />
                    <span className="text-[11px] text-[#9E9C97]">Bygger sajten …</span>
                  </div>
                </div>
              )}
              {isDone && (
                <div
                  className="h-[244px] box-border relative flex flex-col overflow-hidden"
                  style={{ animation: "yc-pop 0.35s ease" }}
                >
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#1D1D21]">
                    <div className="w-3 h-3 rounded-[4px] bg-[#C9834A]" />
                    <span className="font-serif italic text-[11px] text-white">
                      Solgläntans Bageri
                    </span>
                  </div>
                  <div
                    className="h-[96px] flex-shrink-0 bg-cover"
                    style={{
                      backgroundImage: "url('/images/step2-bygger.jpg')",
                      backgroundPosition: "center 55%",
                    }}
                  />
                  <div className="px-3.5 py-3 flex-1">
                    <div className="h-[7px] w-[60%] rounded bg-[#38383D] mb-2" />
                    <div className="h-[5px] w-[85%] rounded-sm bg-[#2A2A2E] mb-1.5" />
                    <div className="h-[5px] w-[70%] rounded-sm bg-[#2A2A2E]" />
                  </div>
                  <div className="absolute top-3 right-3 bg-accent text-accent-ink text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <svg
                      viewBox="0 0 24 24"
                      width="10"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Klar
                  </div>
                </div>
              )}
            </div>
          )}

          {idx === 2 && (
            <div className="border border-line rounded-2xl bg-bg overflow-hidden shadow-[0_14px_30px_rgba(23,23,26,0.07)]">
              <BrowserChrome />
              <div className="p-4 h-[244px] box-border flex flex-col gap-2.5">
                <div
                  className="rounded-lg overflow-hidden h-[108px] flex-shrink-0 relative bg-cover bg-center"
                  style={{ backgroundImage: `url('${step3Image}')` }}
                >
                  {isDone && (
                    <div
                      className="absolute top-2 right-2 bg-accent text-accent-ink text-[9.5px] font-bold px-2.5 py-1 rounded-full"
                      style={{ animation: "yc-pop 0.3s ease" }}
                    >
                      Ny bild
                    </div>
                  )}
                  {isLoading && (
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full border-[1.5px]"
                        style={{
                          borderColor: "rgba(255,255,255,0.35)",
                          borderTopColor: "#fff",
                          animation: "yc-spin 0.7s linear infinite",
                        }}
                      />
                      Byter …
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-end gap-1.5">
                  <div className="self-end max-w-[88%] bg-accent text-accent-ink text-[11.5px] font-semibold px-2.5 py-1.5 rounded-[10px_10px_3px_10px]">
                    Byt till en bild med fler bullar i förgrunden
                  </div>
                  {isDone && (
                    <div
                      className="self-start max-w-[88%] bg-white border border-line text-ink text-[11.5px] px-2.5 py-1.5 rounded-[10px_10px_10px_3px]"
                      style={{ animation: "yc-fade 0.3s ease" }}
                    >
                      Klart! Kolla ovan.
                    </div>
                  )}
                  {isLoading && (
                    <div className="self-start flex gap-1 px-0.5 py-0.5">
                      <span
                        className="w-[4.5px] h-[4.5px] rounded-full bg-[#B7B4AC]"
                        style={{ animation: "yc-pulse 1.2s infinite" }}
                      />
                      <span
                        className="w-[4.5px] h-[4.5px] rounded-full bg-[#B7B4AC]"
                        style={{ animation: "yc-pulse 1.2s infinite .2s" }}
                      />
                      <span
                        className="w-[4.5px] h-[4.5px] rounded-full bg-[#B7B4AC]"
                        style={{ animation: "yc-pulse 1.2s infinite .4s" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
