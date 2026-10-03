"use client";

import { useState } from "react";

// Återanvänds på två ställen: "Kontakta oss" i kontomenyn (AccountHeader,
// source "konto") och knappen Millie visar i chattredigeraren när ett
// önskemål inte går att utföra (redigera/page.tsx, source "chattredigerare",
// med context ifylld i förväg så staff ser vad kunden egentligen bad om).
// Landar i support_messages — se /admin/meddelanden för inkorgen.
export default function ContactSupportModal({
  open,
  onClose,
  source,
  context,
  defaultMessage = "",
  siteId,
  title = "Kontakta oss",
  intro,
}: {
  open: boolean;
  onClose: () => void;
  source: "konto" | "chattredigerare";
  context?: string;
  defaultMessage?: string;
  siteId?: string;
  title?: string;
  intro?: string;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const close = () => {
    onClose();
    // Liten fördröjning så inte formuläret hinner synas tomt/skickat innan
    // stängningsanimationen (ingen i nuläget, men ofarligt ändå) är klar.
    setTimeout(() => {
      setSent(false);
      setMessage(defaultMessage);
      setError("");
    }, 200);
  };

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, source, context, siteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kunde inte skicka meddelandet.");
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={close}>
      <div
        className="bg-surface rounded-2xl p-6 w-full max-w-[440px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button onClick={close} aria-label="Stäng" className="text-ink-dim">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="font-semibold text-[15px] mb-1.5">Tack, vi har tagit emot det!</div>
            <p className="text-[13.5px] text-ink-dim mb-5">
              Vi återkommer vanligtvis inom 24 timmar på vardagar.
            </p>
            <button
              onClick={close}
              className="bg-ink text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            {intro && <p className="text-[13.5px] text-ink-dim mb-3.5 leading-relaxed">{intro}</p>}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Skriv vad du vill ha hjälp med eller önskar dig …"
              className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-3.5 resize-none"
            />
            {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}
            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="w-full bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg disabled:opacity-60"
            >
              {sending ? "Skickar …" : "Skicka till oss"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
