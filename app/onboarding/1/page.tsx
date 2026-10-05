"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";

const tones = ["Personlig", "Professionell", "Lekfull", "Klassisk"];

export default function OnboardingStep1() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [desc, setDesc] = useState("");
  const [tone, setTone] = useState("Personlig");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        if (data.site) {
          setName(data.site.name === "Min sajt" ? "" : data.site.name);
          setIndustry(data.site.industry || "");
          setDesc(data.site.description || "");
          setTone(data.site.tone || "Personlig");
        }
      })
      .catch(() => {});
  }, []);

  const next = async () => {
    if (!name.trim()) {
      setError("Skriv in företagsnamnet.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, description: desc, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      router.push("/onboarding/2");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={1} stepLabel="VERKSAMHET">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">
          Berätta om din verksamhet
        </h1>
        <p className="text-[15.5px] text-ink-dim mb-8">
          Ju mer du berättar, desto mindre behöver du rätta i efterhand.
        </p>

        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <div>
            <label htmlFor="name" className="block text-[13.5px] font-semibold mb-1.5">
              Företagsnamn
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Vindfälle Musteri AB"
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
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
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
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
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

          {error && <p className="text-[13px] text-red-600 m-0">{error}</p>}

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
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px] flex-shrink-0 disabled:opacity-60"
            >
              {saving ? "Sparar …" : "Nästa →"}
            </button>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
