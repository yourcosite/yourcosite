"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Article = {
  id: string;
  cat: string;
  title: string;
  date: string;
  status: "publicerad" | "utkast" | "schemalagd";
  isAi: boolean;
  excerpt: string;
  scheduledFor?: string;
};

const categories = [
  { id: "nyheter", label: "Nyheter", bg: "#F0FADB", color: "#17171A", dot: "#C6FF5E" },
  { id: "erbjudanden", label: "Erbjudanden", bg: "#FDE3D7", color: "#7C3A1D", dot: "#E8714A" },
  { id: "evenemang", label: "Evenemang", bg: "#DCEAFB", color: "#1E3A5F", dot: "#5A9BE0" },
];

const statusDefs = {
  publicerad: { label: "Publicerad", bg: "#DCFCE7", color: "#166534" },
  utkast: { label: "Utkast", bg: "#FDE68A", color: "#7C4A03" },
  schemalagd: { label: "Schemalagd", bg: "#CCFBF1", color: "#115E59" },
};

const initialArticles: Article[] = [
  { id: "a1", cat: "nyheter", title: "Nya säsongens must är här", date: "28 sep 2026", status: "publicerad", isAi: false, excerpt: "Årets första pressning är klar och butiken fylld igen — passa på innan de populäraste sorterna tar slut." },
  { id: "a2", cat: "erbjudanden", title: "20% rabatt på hela sortimentet i oktober", date: "20 sep 2026", status: "publicerad", isAi: false, excerpt: "Gäller i gårdsbutiken och i webbshopen, hela oktober månad." },
  { id: "a3", cat: "evenemang", title: "Öppet hus på gården 12 oktober", date: "15 sep 2026", status: "utkast", isAi: false, excerpt: "Provsmakning, pressningsvisning och fika i äppellunden klockan 11–15." },
  { id: "a4", cat: "nyheter", title: "Så här går det till när vi pressar must", date: "30 sep 2026", status: "utkast", isAi: true, excerpt: "Ett första utkast från YourCoSite om hela processen, från skörd till flaska. Redigera gärna innan publicering." },
  { id: "a5", cat: "nyheter", title: "Vi levererar nu till fler ICA-butiker", date: "2 sep 2026", status: "publicerad", isAi: false, excerpt: "Hitta oss i kylen hos ICA Supermarket i hela Östergötland." },
  { id: "a6", cat: "evenemang", title: "Vinprovning hos oss 5 november", date: "1 okt 2026", status: "schemalagd", isAi: false, excerpt: "Boka plats redan nu — begränsat antal platser i källaren.", scheduledFor: "Publiceras 20 okt 2026, 08:00" },
];

export default function NewsPage() {
  const [activeFilter, setActiveFilter] = useState("alla");
  const [showCompose, setShowCompose] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const filters = [{ id: "alla", label: "Alla" }, ...categories];
  const articles = initialArticles.filter((a) => activeFilter === "alla" || a.cat === activeFilter);

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">Brunneby Musteri</div>
            <div className="text-[11.5px] text-ink-dim">Utkast · ingen domän ännu</div>
          </div>
        </div>
        <Link
          href="/redigera"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
        >
          ← Till redigeraren
        </Link>
      </div>

      <div className="flex-1 px-6 md:px-10 py-8 flex flex-col md:flex-row gap-7">
        <div className="flex-[1.6]">
          <div className="flex items-end justify-between mb-4.5 flex-wrap gap-3">
            <div>
              <h1 className="text-[27px] font-medium">Nyheter</h1>
              <p className="text-[13.5px] text-ink-dim mt-1.5">
                Skapa och kategorisera nyheter som visas på er sajt.
              </p>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 bg-accent text-accent-ink font-semibold text-[13.5px] px-4.5 py-2.5 rounded-[10px]"
            >
              + Ny nyhet
            </button>
          </div>

          <div className="flex gap-2 mb-4.5 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="px-3.5 py-2 rounded-full text-[13px] font-semibold border-[1.5px]"
                style={{
                  background: activeFilter === f.id ? "#17171A" : "#FFFFFF",
                  color: activeFilter === f.id ? "#fff" : "#6B6A66",
                  borderColor: activeFilter === f.id ? "#17171A" : "#E7E4DD",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {articles.map((a) => {
              const cat = categories.find((c) => c.id === a.cat)!;
              const st = statusDefs[a.status];
              return (
                <div key={a.id} className="bg-surface border border-line rounded-2xl px-4.5 py-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: cat.bg, color: cat.color }}
                    >
                      {cat.label}
                    </span>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                    {a.isAi && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EDE6FB] text-[#5B3BA8]">
                        AI-utkast
                      </span>
                    )}
                    <span className="text-[12px] text-ink-dim ml-auto">{a.date}</span>
                  </div>
                  <div className="font-semibold text-[15px] mb-1">{a.title}</div>
                  <div className="text-[13px] text-ink-dim leading-relaxed">{a.excerpt}</div>
                  {a.scheduledFor && (
                    <div className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-[#115E59]">
                      {a.scheduledFor}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-ink rounded-2xl p-5.5 text-white">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-serif italic text-[17px] text-accent">
                Beställ en artikel
              </span>
            </div>

            {orderSubmitted ? (
              <p className="text-[13px] text-[#C9C7C2] leading-relaxed">
                Beställning mottagen ✓ Vi återkommer med ett utkast inom 2
                arbetsdagar — det dyker upp i listan som &ldquo;AI-utkast&rdquo;.
                Nästa beställning kan göras 1 november 2026.
              </p>
            ) : orderOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOrderSubmitted(true);
                }}
              >
                <p className="text-[12.5px] text-[#C9C7C2] leading-relaxed mb-3.5">
                  En gång i månaden kan ni be YourCoSite skriva ett utkast
                  till en nyhetsartikel. Ange bara ämnet.
                </p>
                <label className="block text-[12px] font-semibold text-[#C9C7C2] mb-1.5">
                  Ämne
                </label>
                <input
                  required
                  placeholder="T.ex. Vårens äppelskörd"
                  className="w-full box-border px-3 py-2.5 border border-[#3A3A3D] bg-[#232325] text-white rounded-lg text-[13.5px] mb-3"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderOpen(false)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-[#C9C7C2] border border-[#3A3A3D]"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="flex-[1.3] py-2.5 rounded-lg text-[13px] font-bold bg-accent text-accent-ink"
                  >
                    Skicka beställning
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-[12.5px] text-[#C9C7C2] leading-relaxed mb-3.5">
                  En gång i månaden kan ni be YourCoSite skriva ett utkast
                  till en nyhetsartikel — ange bara ämnet, och eventuellt
                  lite mer information.
                </p>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[12px] text-[#9E9C97]">Använt i oktober</span>
                  <span className="text-[12.5px] font-bold text-white">0 av 1</span>
                </div>
                <button
                  onClick={() => setOrderOpen(true)}
                  className="w-full bg-accent text-accent-ink font-bold text-[13.5px] py-2.5 rounded-lg"
                >
                  Beställ en artikel
                </button>
              </>
            )}
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="font-semibold text-[14px] mb-3">Kategorier</div>
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 py-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                <span className="text-[13px] flex-1">{c.label}</span>
                <span className="text-[12px] text-ink-dim">
                  {initialArticles.filter((a) => a.cat === c.id).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 bg-[rgba(23,23,26,0.45)] flex items-center justify-center z-40 p-6">
          <div className="w-full max-w-[480px] bg-surface rounded-2xl p-6.5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4.5">
              <h2 className="text-[19px] font-medium">Nyhet</h2>
              <button
                onClick={() => setShowCompose(false)}
                aria-label="Stäng"
                className="w-7 h-7 rounded-full bg-bg flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#17171A" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <label className="block text-[12.5px] font-semibold mb-1.5">Rubrik</label>
            <input
              placeholder="T.ex. Nya säsongens must är här"
              className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] mb-4"
            />

            <label className="block text-[12.5px] font-semibold mb-2">Kategori</label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] border-line text-ink-dim"
                >
                  {c.label}
                </button>
              ))}
            </div>

            <label className="block text-[12.5px] font-semibold mb-1.5">Text</label>
            <textarea
              rows={4}
              placeholder="Skriv nyheten här, eller be YourCoSite om ett förslag."
              className="w-full box-border px-3.5 py-2.5 border border-line rounded-lg text-[14px] mb-4 resize-none"
            />

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCompose(false)}
                className="flex-1 py-3 rounded-[10px] text-[13.5px] font-semibold text-ink-dim border border-line"
              >
                Avbryt
              </button>
              <button
                onClick={() => setShowCompose(false)}
                className="flex-1 py-3 rounded-[10px] text-[13.5px] font-semibold text-ink border border-line"
              >
                Spara utkast
              </button>
              <button
                onClick={() => setShowCompose(false)}
                className="flex-[1.3] py-3 rounded-[10px] text-[13.5px] font-bold bg-accent text-accent-ink"
              >
                Publicera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
