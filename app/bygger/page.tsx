import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Bygger din sajt" };

const steps = [
  { done: true, label: "Läser in din verksamhet och ton" },
  { done: true, label: "Skriver texter för varje sektion" },
  { active: true, label: "Designar layout och väljer bilder" },
  { done: false, label: "Sätter samman din sajt" },
];

export default function GeneratingPage() {
  return (
    <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center relative font-sans px-6">
      <div className="absolute top-8 left-6 md:left-12">
        <Logo />
      </div>

      <div className="w-[46px] h-[46px] rounded-full border-[3px] border-[#3A3A3E] animate-spin mb-7" style={{ borderTopColor: "#C6FF5E" }} />

      <h1 className="text-[28px] md:text-[30px] font-medium mb-2.5 text-center">
        Bygger Brunneby Musteris nya sajt
      </h1>
      <p className="text-[15px] text-[#9E9C97] mb-11">
        Det här brukar ta under en minut.
      </p>

      <div className="w-full max-w-[420px] flex flex-col gap-4">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            {s.done ? (
              <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#06280F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : s.active ? (
              <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-accent" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-[#3A3A3E] flex-shrink-0" />
            )}
            <span
              className={`text-[14.5px] ${
                s.done ? "text-[#E5E4E1]" : s.active ? "text-white font-semibold" : "text-[#6E6C68]"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/forslag"
        className="mt-12 bg-accent text-accent-ink font-semibold text-[15px] px-7.5 py-3.5 rounded-[10px]"
      >
        Se resultatet →
      </Link>
    </div>
  );
}
