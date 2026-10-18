"use client";

import { useState } from "react";
import Link from "next/link";

type Message = {
  id: string;
  source: "konto" | "chattredigerare" | "ovrigt";
  context: string | null;
  message: string;
  status: "ny" | "laser" | "klar";
  created_at: string;
  site_id: string | null;
  customer: { id: string; full_name: string | null; email: string; language?: string | null } | null;
  site: { name: string } | null;
  language?: string | null;
  message_sv?: string | null;
  replies?: Reply[] | null;
};

export type Reply = { id: string; body_sv: string; body_sent: string; language: string; emailed: boolean; created_at: string };

const LANG_NAMES: Record<string, string> = { sv: "svenska", en: "engelska", da: "danska", fi: "finska", de: "tyska", fr: "franska", es: "spanska" };

const TABS = [
  { id: "ny", label: "Nya" },
  { id: "laser", label: "Pågår" },
  { id: "klar", label: "Klara" },
  { id: "alla", label: "Alla" },
] as const;

const SOURCE_LABEL: Record<Message["source"], string> = {
  konto: "Kontakta oss",
  chattredigerare: "Chattredigeraren",
  ovrigt: "Övrigt",
};

const STATUS_LABEL: Record<Message["status"], string> = {
  ny: "Ny",
  laser: "Pågår",
  klar: "Klar",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReplyBox({ message, onSent }: { message: Message; onSent: (r: Reply, status: Message["status"]) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lang = message.language && message.language !== "sv" ? message.language : null;

  const send = async (markDone: boolean) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${message.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, markDone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Kunde inte skicka svaret.");
      onSent(d.reply, d.status);
      setText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={lang ? `Skriv ditt svar på svenska, det översätts till ${LANG_NAMES[lang] ?? lang} och mejlas till kunden …` : "Skriv ditt svar, det mejlas till kunden …"}
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] resize-none"
      />
      {error && <p className="text-[12.5px] text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button onClick={() => send(false)} disabled={busy || !text.trim()} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-ink text-white disabled:opacity-50">
          {busy ? "Skickar …" : "Skicka svar"}
        </button>
        <button onClick={() => send(true)} disabled={busy || !text.trim()} className="text-[13px] font-semibold px-4 py-2 rounded-lg border border-line text-ink-dim disabled:opacity-50">
          Skicka och markera klar
        </button>
      </div>
    </div>
  );
}

export default function AdminMeddelandenClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ny");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const setStatus = async (id: string, status: Message["status"]) => {
    setUpdatingId(id);
    const prev = messages;
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMessages(prev);
      alert("Kunde inte uppdatera status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = tab === "alla" ? messages : messages.filter((m) => m.status === tab);
  const newCount = messages.filter((m) => m.status === "ny").length;

  return (
    <div className="px-11 py-7.5">
      <div className="mb-6.5">
        <h1 className="text-[28px] font-medium font-serif">Meddelanden</h1>
        <p className="text-[14.5px] text-ink-dim mt-1.5">
          Önskemål och frågor kunder skickat in direkt via kundportalen
          {newCount > 0 ? ` — ${newCount} nya` : ""}.
        </p>
      </div>

      <div className="flex gap-1.5 bg-surface border border-line rounded-[10px] p-1 w-fit mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-[13.5px] font-semibold ${
              tab === t.id ? "bg-accent text-accent-ink" : "text-ink-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <div key={m.id} className="bg-surface border border-line rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {m.customer ? (
                    <Link href={`/admin/kunder/${m.customer.id}`} className="font-semibold text-[14px] hover:underline">
                      {m.customer.full_name || m.customer.email}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[14px]">Okänd kund</span>
                  )}
                  <span className="text-[11.5px] font-semibold text-ink-dim bg-bg border border-line px-2 py-0.5 rounded-full">
                    {SOURCE_LABEL[m.source]}
                  </span>
                  {m.site?.name && (
                    <span className="text-[11.5px] text-ink-dim">· {m.site.name}</span>
                  )}
                </div>
                <div className="text-[12px] text-ink-dim">{formatDateTime(m.created_at)}</div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {TABS.filter((t) => t.id !== "alla").map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStatus(m.id, t.id)}
                    disabled={updatingId === m.id || m.status === t.id}
                    className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border disabled:opacity-100 ${
                      m.status === t.id
                        ? "bg-ink text-white border-ink"
                        : "text-ink-dim border-line"
                    }`}
                  >
                    {STATUS_LABEL[t.id]}
                  </button>
                ))}
              </div>
            </div>

            {m.message_sv ? (
              <>
                <p className="text-[13.5px] leading-relaxed mt-3.5 whitespace-pre-wrap">{m.message_sv}</p>
                <details className="mt-2 text-[12.5px] text-ink-dim">
                  <summary className="cursor-pointer">Original på {LANG_NAMES[m.language ?? ""] ?? m.language}</summary>
                  <p className="mt-1.5 whitespace-pre-wrap">{m.message}</p>
                </details>
              </>
            ) : (
              <p className="text-[13.5px] leading-relaxed mt-3.5 whitespace-pre-wrap">{m.message}</p>
            )}
            {m.language && m.language !== "sv" && !m.message_sv && (
              <p className="text-[12px] text-warm mt-1.5">Skriven på {LANG_NAMES[m.language] ?? m.language}, översättningen saknas.</p>
            )}

            {m.context && (
              <div className="mt-3 bg-bg rounded-lg px-3.5 py-3 text-[12.5px] text-ink-dim whitespace-pre-wrap leading-relaxed">
                {m.context}
              </div>
            )}

            {(m.replies ?? []).length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {[...(m.replies ?? [])]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((r) => (
                    <div key={r.id} className="bg-accent-soft/40 border border-line rounded-lg px-3.5 py-3 text-[13px]">
                      <div className="text-[11.5px] text-ink-dim mb-1">
                        Ert svar · {formatDateTime(r.created_at)}
                        {r.language !== "sv" ? ` · skickat på ${LANG_NAMES[r.language] ?? r.language}` : ""}
                        {r.emailed ? " · mejlat" : " · inte mejlat (mejltjänsten saknas)"}
                      </div>
                      <p className="whitespace-pre-wrap">{r.body_sv}</p>
                      {r.language !== "sv" && (
                        <details className="mt-1.5 text-[12px] text-ink-dim">
                          <summary className="cursor-pointer">Det kunden fick</summary>
                          <p className="mt-1 whitespace-pre-wrap">{r.body_sent}</p>
                        </details>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <ReplyBox
              message={m}
              onSent={(r, status) =>
                setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, status, replies: [...(x.replies ?? []), r] } : x)))
              }
            />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-surface border border-line rounded-2xl py-10 text-center text-ink-dim text-[13.5px]">
            Inga meddelanden här.
          </div>
        )}
      </div>
    </div>
  );
}
