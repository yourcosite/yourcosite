"use client";

import Image from "next/image";
import { useLocale, useT } from "@/components/I18nProvider";
import { msg } from "@/lib/i18n/config";
import { useEffect, useState } from "react";

type Msg = {
  text: string;
  align: "flex-end" | "flex-start";
  bg: string;
  color: string;
  radius: string;
};

const messages: Msg[] = [
  {
    text: msg("Vi är en bistro i Norrköping med mat att dela. Mörkt, varmt och gärna tegel."),
    align: "flex-end",
    bg: "#C6FF5E",
    color: "#0C1004",
    radius: "11px 11px 4px 11px",
  },
  {
    text: msg("Perfekt, jag sätter ihop ett första förslag åt er nu …"),
    align: "flex-start",
    bg: "#fff",
    color: "#17171A",
    radius: "11px 11px 11px 4px",
  },
  {
    text: msg("Lägg till ostron, tre stycken, för 98 kr under Smått att dela."),
    align: "flex-end",
    bg: "#C6FF5E",
    color: "#0C1004",
    radius: "11px 11px 4px 11px",
  },
  {
    text: msg("Klart! Ostron ligger nu först i menyn."),
    align: "flex-start",
    bg: "#fff",
    color: "#17171A",
    radius: "11px 11px 11px 4px",
  },
];

// Skärmdumpar av den färdiga restaurangsajten (skapas i alla sju språk i
// public/images/demo) med en chatt ovanpå: först sajten, sedan en ändring i
// menyn — före och efter.
export default function HeroChatDemo() {
  const t = useT();
  const locale = useLocale();
  const [chatStep, setChatStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setChatStep((s) => (s + 1) % (messages.length + 3));
    }, 1900);
    return () => clearInterval(timer);
  }, []);

  const visibleCount = Math.min(chatStep, messages.length);
  const stillTyping = chatStep < messages.length;
  const shown = chatStep <= 2 ? "a" : chatStep === 3 ? "b0" : "b1";

  return (
    <div className="relative aspect-[16/9] bg-bg">
      {(["a", "b0", "b1"] as const).map((k) => (
        <Image
          key={k}
          src={`/images/demo/${locale}-${k}.jpg`}
          alt={k === "a" ? t("Bistro Tegelbruket — exempel på en hemsida byggd med YourCoSite") : ""}
          fill
          sizes="(min-width: 768px) 560px, 100vw"
          priority={k === "a"}
          className="object-cover object-top transition-opacity duration-500"
          style={{ opacity: shown === k ? 1 : 0 }}
        />
      ))}
      <div className="absolute right-2.5 bottom-2.5 w-[72%] md:w-[230px] flex flex-col gap-2 rounded-xl p-3 bg-black/65 border border-white/10 backdrop-blur-sm min-h-[64px] justify-end">
        {messages.slice(Math.max(0, visibleCount - 2), visibleCount).map((m, i) => (
          <div
            key={`${visibleCount}-${i}`}
            className="max-w-[92%] text-[11.5px] leading-snug px-2.5 py-2"
            style={{
              alignSelf: m.align,
              background: m.bg,
              color: m.color,
              borderRadius: m.radius,
              animation: "yc-fade 0.35s ease",
            }}
          >
            {t(m.text)}
          </div>
        ))}
        {stillTyping && (
          <div className="flex gap-1.5 self-start px-0.5">
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="w-[5px] h-[5px] rounded-full bg-[#B7B4AC]" style={{ animation: `yc-pulse 1.2s infinite ${d}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
