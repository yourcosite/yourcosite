"use client";

import { msg } from "@/lib/i18n/config";
import { useT } from "@/components/I18nProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const steps = [
  msg("Läser in din verksamhet och ton"),
  msg("Skriver texter för varje sektion"),
  msg("Designar layout och väljer struktur"),
  msg("Sätter samman din sajt"),
];

export default function GeneratingPage() {
  const t = useT();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [percent, setPercent] = useState(0);
  const [pageInfo, setPageInfo] = useState<{ page: number; pages: number } | null>(null);
  const [error, setError] = useState("");
  // Ingen fallback-text som "din" — hellre visa rubriken en stund senare
  // än att blinka till en felaktig/konstig text innan det riktiga namnet
  // hämtats.
  const [siteName, setSiteName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.site?.name) setSiteName(data.site.name);
      })
      .catch(() => {});

    // Servern strömmar riktiga framsteg (rader med JSON, se
    // app/api/sites/generate/route.ts): först "progress"-rader medan sajten
    // skrivs, sist en "result"-rad med själva resultatet.
    const failText =
      t("Bygget avbröts innan det blev klart, troligen för att det tog för lång tid. Inget har gått förlorat, tryck på Försök igen.");
    fetch("/api/sites/generate", { method: "POST", headers: { "x-progress": "1" } })
      .then(async (res) => {
        if (!res.body) throw new Error(failText);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let result: { status: number; body: any } | null = null;
        const handle = (line: string) => {
          if (!line.trim()) return;
          let msg: any;
          try {
            msg = JSON.parse(line);
          } catch {
            return;
          }
          if (msg.type === "progress" && !cancelled) {
            setPercent((cur) => Math.max(cur, msg.value * 100));
            setPageInfo(msg.page > 0 ? { page: msg.page, pages: msg.pages } : null);
            setActiveStep(msg.value < 0.1 ? 0 : msg.value < 0.88 ? 1 : 2);
          } else if (msg.type === "result") {
            result = { status: msg.status, body: msg.body };
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          lines.forEach(handle);
        }
        handle(buf);
        // Ingen resultatrad = servern avbröts mitt i (t.ex. tidsgränsen).
        if (!result) throw new Error(failText);
        const r = result as { status: number; body: any };
        if (r.status < 200 || r.status >= 300) throw new Error(r.body?.error || t("Något gick fel."));
        if (!cancelled) {
          setActiveStep(steps.length - 1);
          setPercent(100);
          // En kort stund på 100 % så man hinner se att det blev klart.
          setTimeout(() => router.push("/forslag"), 600);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
        }
      });

    return () => {
      cancelled = true;
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
          ? t("Något gick fel")
          : siteName
          ? t("Bygger {siteName}s nya sajt", { siteName })
          : " "}
      </h1>
      <p className="text-[15px] text-[#9E9C97] mb-11">
        {error ? error : siteName ? t("Det här brukar ta under en minut.") : " "}
      </p>

      {error && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px]"
        >
          {t("Försök igen")}
        </button>
      )}

      {!error && siteName && (
        <div className="w-full max-w-[420px] mb-9">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-[#9E9C97]">{percent >= 100 ? "Klart!" : pageInfo ? t("Skriver sidan {page} av {pages}", { page: pageInfo.page, pages: pageInfo.pages }) : t("Förbereder")}</span>
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
                {t(label)}
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
          {t("Försök igen")}
        </button>
      )}
    </div>
  );
}
