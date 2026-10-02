"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-6 text-center">
        <div className="font-semibold text-[15px] mb-1">Tack för ditt meddelande!</div>
        <p className="text-[13.5px] text-ink-dim">
          Vi återkommer vanligtvis inom 24 timmar på vardagar.
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
        Eller skicka ett meddelande
      </div>
      <label htmlFor="nm" className="block text-[12.5px] font-semibold mb-[5px]">
        Namn
      </label>
      <input
        id="nm"
        type="text"
        required
        placeholder="Ditt namn"
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-3.5"
      />
      <label htmlFor="em" className="block text-[12.5px] font-semibold mb-[5px]">
        E-post
      </label>
      <input
        id="em"
        type="email"
        required
        placeholder="du@företag.se"
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-3.5"
      />
      <label htmlFor="msg" className="block text-[12.5px] font-semibold mb-[5px]">
        Meddelande
      </label>
      <textarea
        id="msg"
        rows={3}
        required
        placeholder="Hur kan vi hjälpa till?"
        className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13.5px] mb-4 resize-none"
      />
      <button
        type="submit"
        className="w-full bg-ink text-white font-semibold text-[13.5px] py-2.5 rounded-lg"
      >
        Skicka meddelande
      </button>
    </form>
  );
}
