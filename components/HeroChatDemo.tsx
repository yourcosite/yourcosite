"use client";

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
    text: "Vi är ett hantverksbageri i Uppsala. Varmt och personligt, gärna bilder på nybakat.",
    align: "flex-end",
    bg: "#C6FF5E",
    color: "#0C1004",
    radius: "11px 11px 4px 11px",
  },
  {
    text: "Perfekt, jag sätter ihop ett första förslag åt er nu …",
    align: "flex-start",
    bg: "#fff",
    color: "#17171A",
    radius: "11px 11px 11px 4px",
  },
  {
    text: "Kan hero-bilden vara ljusare? Morgonljus känns rätt.",
    align: "flex-end",
    bg: "#C6FF5E",
    color: "#0C1004",
    radius: "11px 11px 4px 11px",
  },
  {
    text: "Klart! Bytte till en bild med nybakat bröd i morgonljus.",
    align: "flex-start",
    bg: "#fff",
    color: "#17171A",
    radius: "11px 11px 11px 4px",
  },
];

export default function HeroChatDemo() {
  const [chatStep, setChatStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setChatStep((s) => (s + 1) % (messages.length + 3));
    }, 1700);
    return () => clearInterval(timer);
  }, []);

  const visibleCount = Math.min(chatStep, messages.length);
  const stillTyping = chatStep < messages.length;

  return (
    <div className="hidden md:flex w-[270px] flex-shrink-0 bg-bg border-l border-line p-4 flex-col gap-2.5 justify-end">
      {messages.slice(0, visibleCount).map((m, i) => (
        <div
          key={i}
          className="max-w-[90%] text-[12px] leading-relaxed px-3 py-2.5"
          style={{
            alignSelf: m.align,
            background: m.bg,
            color: m.color,
            borderRadius: m.radius,
            animation: "yc-fade 0.35s ease",
          }}
        >
          {m.text}
        </div>
      ))}
      {stillTyping && (
        <div className="flex gap-1.5 self-start px-0.5">
          <span
            className="w-[5px] h-[5px] rounded-full bg-[#B7B4AC]"
            style={{ animation: "yc-pulse 1.2s infinite" }}
          />
          <span
            className="w-[5px] h-[5px] rounded-full bg-[#B7B4AC]"
            style={{ animation: "yc-pulse 1.2s infinite 0.2s" }}
          />
          <span
            className="w-[5px] h-[5px] rounded-full bg-[#B7B4AC]"
            style={{ animation: "yc-pulse 1.2s infinite 0.4s" }}
          />
        </div>
      )}
    </div>
  );
}
