"use client";

import { useT } from "@/components/I18nProvider";
import { useState } from "react";

export default function ContactForm() {
  const t = useT();
  const [sent, setSent] = useState(false);

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
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
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
        rows={3}
        required
        placeholder={t("Hur kan vi hjälpa till?")}
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-4 resize-none"
      />
      <button
        type="submit"
        className="w-full bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg"
      >
        {t("Skicka meddelande")}
      </button>
    </form>
  );
}
