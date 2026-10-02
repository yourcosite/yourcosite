"use client";

import { useState } from "react";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";

const tones = ["Personlig", "Professionell", "Lekfull", "Klassisk"];

export default function OnboardingStep1() {
  const [tone, setTone] = useState("Personlig");

  return (
    <OnboardingShell step={1} stepLabel="VERKSAMHET">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">
          Berätta om din verksamhet
        </h1>
        <p className="text-[15.5px] text-ink-dim mb-8">
          Ju mer du berättar, desto mindre behöver du rätta i efterhand.
        </p>

        <form className="flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="block text-[13.5px] font-semibold mb-1.5">
              Företagsnamn
            </label>
            <input
              id="name"
              type="text"
              placeholder="T.ex. Brunneby Musteri AB"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="industry" className="block text-[13.5px] font-semibold mb-1.5">
              Bransch
            </label>
            <input
              id="industry"
              type="text"
              placeholder="T.ex. Musteri och gårdsbutik"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="desc" className="block text-[13.5px] font-semibold mb-1.5">
              Beskriv verksamheten med egna ord
            </label>
            <textarea
              id="desc"
              rows={4}
              placeholder="Vad gör ni, för vem, och vad gör er annorlunda?"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px] resize-none"
            />
          </div>

          <div>
            <div className="text-[13.5px] font-semibold mb-2.5">
              Vilken ton passar er?
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {tones.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-4 py-2 rounded-full text-[13.5px] font-semibold border-[1.5px] ${
                    tone === t
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line text-ink-dim"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-[11.5px] text-ink-dim leading-relaxed max-w-[320px] m-0">
              Genom att fortsätta godkänner du våra{" "}
              <Link href="/anvandarvillkor" className="font-semibold underline">
                användarvillkor
              </Link>{" "}
              (3 månaders löpande uppsägningstid) och vår{" "}
              <Link href="/integritetspolicy" className="font-semibold underline">
                integritetspolicy
              </Link>
              .
            </p>
            <Link
              href="/onboarding/2"
              className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px] flex-shrink-0"
            >
              Nästa →
            </Link>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
