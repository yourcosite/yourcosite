"use client";

import { useState } from "react";

const faqs = [
  {
    id: "time",
    q: "Hur lång tid tar det att bygga en sajt?",
    a: "Oftast under en minut för ett första utkast. Sen fortsätter ni finslipa i ett samtal så länge ni vill, innan ni publicerar.",
  },
  {
    id: "domain",
    q: "Kan jag använda min egen domän?",
    a: "Ja. Koppla en domän ni redan äger, eller köp en ny direkt i YourCoSite utan att lämna flödet.",
  },
  {
    id: "limit",
    q: "Vad händer om jag använder alla ändringar för månaden?",
    a: "Ni kan antingen vänta till nästa period eller köpa till fler ändringar direkt, utan att behöva byta plan.",
  },
  {
    id: "own",
    q: "Äger jag innehållet på min sajt?",
    a: "Ja. All text och alla bilder ni laddar upp eller godkänner är helt era, oavsett om ni fortsätter använda YourCoSite eller inte.",
  },
  {
    id: "export",
    q: "Kan jag exportera sajten om jag vill lämna tjänsten?",
    a: "Ja, ni kan alltid ladda ner en fullständig kopia av er sajt och ta med er den till valfritt webbhotell.",
  },
  {
    id: "pay",
    q: "Hur fungerar betalningen?",
    a: "Månadsvis fakturering, ingen bindningstid. Avsluta när ni vill direkt under Fakturering.",
  },
];

export default function SupportFaq() {
  const [openId, setOpenId] = useState<string | null>("time");

  return (
    <div className="flex flex-col gap-2">
      {faqs.map((f) => {
        const open = openId === f.id;
        return (
          <div
            key={f.id}
            className="border border-line rounded-xl bg-surface overflow-hidden"
          >
            <button
              onClick={() => setOpenId(open ? null : f.id)}
              aria-expanded={open}
              className="w-full flex items-center justify-between text-left px-4 py-[13px] text-[14px] font-semibold"
            >
              {f.q}
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="#6B6A66"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 transition-transform"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open && (
              <div className="px-4 pb-[15px] text-[13.5px] text-ink-dim leading-relaxed">
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
