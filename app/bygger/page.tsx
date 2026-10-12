"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const steps = [
  "Läser in din verksamhet och ton",
  "Skriver texter för varje sektion",
  "Designar layout och väljer struktur",
  "Sätter samman din sajt",
];

export default function GeneratingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState("");
  // Ingen fallback-text som "din" — hellre visa rubriken en stund senare
  // än att blinka till en felaktig/konstig text innan det riktiga namnet
  // hämtats.
  const [siteName, setSiteName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Procenten är en UPPSKATTNING utifrån hur lång tid som gått — det
    // riktiga arbetet är ett enda anrop till /api/sites/generate som inte
    // rapporterar hur långt det kommit. Kurvan går snabbt i början och
    // saktar in, och stannar under 97 % tills bygget faktiskt är klart.
    const startedAt = Date.now();
    const stepTimer = setInterval(() => {
      const t = (Date.now() - startedAt) / 1000;
      const p = Math.min(97, 97 * (1 - Math.exp(-t / 45)));
      setPercent(p);
      setActiveStep(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length * 1.15)));
    }, 250);

    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.site?.name) setSiteName(data.site.name);
      })
      .catch(() => {});

    fetch("/api/sites/generate", { method: "POST" })
      .then(async (res) => {
        // Tar servern för lång tid eller kraschar kommer ingen JSON tillbaka
        // (bara en textsida med ett felmeddelande) — visa då ett begripligt
        // meddelande istället för ett tekniskt parsningsfel.
        const raw = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(
            "Bygget avbröts innan det blev klart, troligen för att det tog för lång tid. Inget har gått förlorat, tryck på Försök igen."
          );
        }
        if (!res.ok) throw new Error(data.error || "Något gick fel.");
        if (!cancelled) {
          clearInterval(stepTimer);
          setActiveStep(steps.length - 1);
          setPercent(100);
          // En kort stund på 100 % så man hinner se att det blev klart.
          setTimeout(() => router.push("/forslag"), 600);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearInterval(stepTimer);
          setError(e.message);
        }
      });

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center relative font-sans px-6">
      <div className="absolute top-8 left-6 md:left-12">
        <Logo />
      </div>

      {!error && (
        <div className="w-[46px] h-[46px] rounded-full border-[3px] border-[#3A3A3E] animate-spin mb-7" style={{ borderTopColor: "#C6FF5E" }} />
      )}

      <h1 className="text-[28px] md:text-[30px] font-medium mb-2.5 text-center">
        {error
          ? "Något gick fel"
          : siteName
          ? `Bygger ${siteName}s nya sajt`
          : " "}
      </h1>
      <p className="text-[15px] text-[#9E9C97] mb-11">
        {error ? error : siteName ? "Det här brukar ta under en minut." : " "}
      </p>

      {error && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px]"
        >
          Försök igen
        </button>
      )}

      {!error && siteName && (
        <div className="w-full max-w-[420px] mb-9">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-[#9E9C97]">Byggs just nu</span>
            <span className="font-semibold tabular-nums">{Math.round(percent)} %</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-[#2A2A2E] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-[11.5px] text-[#6E6C68] mt-2">Procenten är en uppskattning. Större sajter kan ta lite längre tid.</div>
        </div>
      )}

      {!error && (
        <div className="w-full max-w-[420px] flex flex-col gap-4">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i < activeStep ? (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0C1004" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : i === activeStep ? (
                <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-[#3A3A3E] flex-shrink-0" />
              )}
              <span
                className={`text-[14.5px] ${
                  i < activeStep ? "text-[#E5E4E1]" : i === activeStep ? "text-white font-semibold" : "text-[#6E6C68]"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-accent text-accent-ink font-semibold text-[15px] px-7.5 py-3.5 rounded-[10px]"
        >
          Försök igen
        </button>
      )}
    </div>
  );
}
