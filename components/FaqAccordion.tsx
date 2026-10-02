"use client";

import { useState } from "react";

const faqs = [
  {
    id: "overused",
    q: "Vad händer om jag använder alla ändringar för månaden?",
    a: "Ni kan antingen vänta till nästa period eller köpa till fler ändringar direkt i Fakturering, utan att behöva byta plan.",
  },
  {
    id: "switch",
    q: "Kan jag byta plan när som helst?",
    a: "Ja, uppgradera eller nedgradera när ni vill. Ändringen börjar gälla direkt och justeras på nästa faktura.",
  },
  {
    id: "domain",
    q: "Ingår domänen i priset?",
    a: "Ni kan koppla en domän ni redan äger utan extra kostnad. Vill ni köpa en ny domän går det att göra direkt i tjänsten.",
  },
  {
    id: "uppsagning",
    q: "Finns det någon bindningstid?",
    a: "Nej. Uppsägningstiden är 3 månader, löpande — ingen bindning i block. Säger ni upp idag avslutas tjänsten exakt 3 månader senare.",
  },
  {
    id: "change",
    q: 'Vad räknas som en "ändring"?',
    a: "Varje gång ni ber om en ändring i chatten eller redigerar text direkt på sidan räknas det som en ändring mot månadens kvot.",
  },
];

export default function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>("uppsagning");

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
              className="w-full flex items-center justify-between text-left px-[18px] py-[15px] text-[14.5px] font-semibold"
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
              <div className="px-[18px] pb-4 text-[13.5px] text-ink-dim leading-relaxed">
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
