"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Msg = { from: "user" | "bot"; text: string };

const initialMessages: Msg[] = [
  { from: "user", text: "Kan vi byta hero-bilden till en bild från gården istället för illustrationen?" },
  { from: "bot", text: "Klart! Bytte till fotot av äppelträden vid ladan. Vill du att jag mörkar ner den lite så texten syns bättre?" },
  { from: "user", text: "Ja gärna, och gör rubriken lite större" },
  { from: "bot", text: "Fixat — mörkare bild och rubriken uppskalad. Kolla i förhandsvisningen till vänster." },
];

export default function EditorPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [texts, setTexts] = useState({
    eyebrow: "SEDAN 1987 · ÖSTERGÖTLAND",
    headline: "Must från våra egna äpplen",
    body: "Handplockat, kallpressat och tappat på gården — precis som det alltid gjorts.",
    cta: "Se vårt sortiment",
  });
  const [editingField, setEditingField] = useState<keyof typeof texts | null>(null);
  const [draftField, setDraftField] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [
      ...m,
      { from: "user", text: draft },
      {
        from: "bot",
        text: "Noterat! Den här demon visar bara hur chatten känns — riktig AI-koppling byggs i nästa steg av projektet.",
      },
    ]);
    setDraft("");
  };

  const startEdit = (field: keyof typeof texts) => {
    setDraftField(texts[field]);
    setEditingField(field);
  };
  const saveEdit = () => {
    if (editingField) setTexts((t) => ({ ...t, [editingField]: draftField }));
    setEditingField(null);
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">Brunneby Musteri</div>
            <div className="text-[11.5px] text-ink-dim">Utkast · ingen domän ännu</div>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="text-[12.5px] text-ink-dim bg-bg border border-line rounded-full px-3.5 py-1.5">
            37 ändringar kvar denna månad
          </div>
          <Link href="/nyheter" className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Nyheter
          </Link>
          <Link href="/sidor" className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Sidor
          </Link>
          <button className="text-[13.5px] font-semibold text-ink border border-line px-4 py-2.5 rounded-lg">
            Förhandsgranska
          </button>
          <button className="text-[13.5px] font-semibold text-accent-ink bg-accent px-4.5 py-2.5 rounded-lg">
            Publicera
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-[#E5E3DD] flex items-center justify-center p-7">
          <div className="w-full max-w-[820px] h-full bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
            <div className="h-[38px] bg-[#F1EFE9] flex items-center gap-1.5 px-3.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
              <div className="flex-1 text-center text-[11.5px] text-ink-dim">brunneby.se</div>
            </div>

            <div
              className="flex-1 flex flex-col relative overflow-hidden"
              style={{ background: "linear-gradient(160deg, #3E2A1C 0%, #6B3F22 100%)" }}
            >
              <div className="flex items-center justify-between px-8 py-5.5">
                <span className="font-serif italic text-[19px]" style={{ color: "#F4D9A8" }}>
                  Brunneby Musteri
                </span>
                <div className="flex gap-5.5 text-[12.5px]" style={{ color: "#E9D9C4" }}>
                  <span>Produkter</span>
                  <span>Gården</span>
                  <span>Kontakt</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center px-14 gap-0.5">
                <EditableLine
                  value={texts.eyebrow}
                  editing={editingField === "eyebrow"}
                  draftValue={draftField}
                  onDraftChange={setDraftField}
                  onStart={() => startEdit("eyebrow")}
                  onCancel={() => setEditingField(null)}
                  onSave={saveEdit}
                  className="text-[12px] tracking-[0.12em] mb-3.5"
                  style={{ color: "#E8A15C" }}
                />
                <EditableLine
                  value={texts.headline}
                  editing={editingField === "headline"}
                  draftValue={draftField}
                  onDraftChange={setDraftField}
                  onStart={() => startEdit("headline")}
                  onCancel={() => setEditingField(null)}
                  onSave={saveEdit}
                  className="font-serif italic text-[40px] leading-[1.1] mb-4"
                  style={{ color: "#FBF1E2" }}
                  as="h1"
                />
                <EditableLine
                  value={texts.body}
                  editing={editingField === "body"}
                  draftValue={draftField}
                  onDraftChange={setDraftField}
                  onStart={() => startEdit("body")}
                  onCancel={() => setEditingField(null)}
                  onSave={saveEdit}
                  className="text-[14.5px] max-w-[440px] mb-6"
                  style={{ color: "#E9D9C4" }}
                />
                <EditableLine
                  value={texts.cta}
                  editing={editingField === "cta"}
                  draftValue={draftField}
                  onDraftChange={setDraftField}
                  onStart={() => startEdit("cta")}
                  onCancel={() => setEditingField(null)}
                  onSave={saveEdit}
                  className="inline-block font-bold text-[13.5px] px-6.5 py-3 rounded-full"
                  style={{ background: "#E8A15C", color: "#3E2A1C" }}
                  pill
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-[400px] border-l border-line bg-surface flex flex-col flex-shrink-0">
          <div className="px-5 py-4 border-b border-line">
            <div className="font-semibold text-[14.5px]">Be om ändringar</div>
            <div className="text-[12px] text-ink-dim mt-0.5">
              Skriv precis som du skulle till en kollega.
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-accent-soft px-5 py-3 border-b border-line">
            <span className="text-[12px] text-ink leading-relaxed">
              Klicka på pennan direkt på sidan för snabba textändringar.
              Bilder, layout och allt annat ber du om här i chatten.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4.5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-[13.5px] leading-relaxed px-3.5 py-2.5 ${
                  m.from === "user"
                    ? "self-end bg-accent text-accent-ink rounded-[14px_14px_4px_14px]"
                    : "self-start bg-bg rounded-[14px_14px_14px_4px]"
                }`}
              >
                {m.text}
              </div>
            ))}
            <div className="self-center text-[11.5px] text-ink-dim mt-1">
              {messages.filter((m) => m.from === "user").length} ändringar
              denna session
            </div>
          </div>

          <div className="px-5 py-4 border-t border-line">
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl py-1.5 pl-4 pr-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Be om en ändring …"
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim"
              />
              <button
                onClick={send}
                aria-label="Skicka"
                className="w-[34px] h-[34px] rounded-[9px] bg-accent flex items-center justify-center flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableLine({
  value,
  editing,
  draftValue,
  onDraftChange,
  onStart,
  onCancel,
  onSave,
  className,
  style,
  as = "div",
  pill = false,
}: {
  value: string;
  editing: boolean;
  draftValue: string;
  onDraftChange: (v: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "h1";
  pill?: boolean;
}) {
  const Tag = as;
  return (
    <div className="relative inline-block">
      {editing && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[260px] bg-white rounded-xl p-3 shadow-[0_16px_34px_rgba(0,0,0,0.3)] z-20">
          <textarea
            value={draftValue}
            onChange={(e) => onDraftChange(e.target.value)}
            className="w-full box-border border border-line rounded-lg p-2 text-[12.5px] text-ink resize-none h-11"
          />
          <div className="flex gap-1.5 justify-end mt-2">
            <button onClick={onCancel} className="text-[12px] font-semibold text-ink-dim px-2.5 py-1.5">
              Avbryt
            </button>
            <button onClick={onSave} className="text-[12px] font-semibold text-accent-ink bg-accent px-3.5 py-1.5 rounded-md">
              Spara
            </button>
          </div>
        </div>
      )}
      <Tag className={className} style={style}>
        {value}
      </Tag>
      <button
        onClick={onStart}
        aria-label="Redigera text"
        className={`absolute w-[22px] h-[22px] rounded-full bg-white/20 flex items-center justify-center ${
          pill ? "-top-2 -right-7" : "-top-1 -right-7"
        }`}
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
    </div>
  );
}
