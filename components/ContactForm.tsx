"use client";

import { useT } from "@/components/I18nProvider";
import { useState } from "react";

export default function ContactForm() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          message: f.get("message"),
          website: f.get("website"),
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("Det gick inte att skicka just nu. Mejla oss gärna direkt på hej@cskb.se."));
      }
    } catch {
      setError(t("Det gick inte att skicka just nu. Mejla oss gärna direkt på hej@cskb.se."));
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-6 text-center">
        <div className="font-semibold text-[15px] mb-1">{t("Tack för ditt meddelande!")}</div>
        <p className="text-[13.5px] text-ink-dim">
          {t("Vi återkommer vanligtvis inom 24 timmar på vardagar.")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface border border-line rounded-2xl p-6"
    >
      <div className="font-semibold text-[15px] mb-4">
        {t("Eller skicka ett meddelande")}
      </div>
      <label htmlFor="nm" className="block text-[12.5px] font-semibold mb-[5px]">
        {t("Namn")}
      </label>
      <input
        id="nm"
        name="name"
        type="text"
        required
        placeholder={t("Ditt namn")}
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-3.5"
      />
      <label htmlFor="em" className="block text-[12.5px] font-semibold mb-[5px]">
        {t("E-post")}
      </label>
      <input
        id="em"
        name="email"
        type="email"
        required
        placeholder={t("du@företag.se")}
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-3.5"
      />
      <label htmlFor="msg" className="block text-[12.5px] font-semibold mb-[5px]">
        {t("Meddelande")}
      </label>
      <textarea
        id="msg"
        name="message"
        rows={3}
        required
        placeholder={t("Hur kan vi hjälpa till?")}
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-4 resize-none"
      />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg disabled:opacity-60"
      >
        {t("Skicka meddelande")}
      </button>
    </form>
  );
}
