"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";
import LogoUpload from "@/components/LogoUpload";
import FileDropzone from "@/components/FileDropzone";
import SocialLinksFields, { type SocialLinksValue } from "@/components/SocialLinksFields";

type Page = {
  id: string;
  label: string;
  menuName: string;
  brief: string;
  included: boolean;
  removable: boolean;
  isNew?: boolean;
};

const defaultPages: Page[] = [
  { id: "start", label: "Startsida", menuName: "Hem", brief: "Kort presentation, de bästa bilderna, vad vi gör och en tydlig call-to-action.", included: true, removable: false },
  { id: "om", label: "Om oss", menuName: "Om oss", brief: "Vår historia, vilka vi är och varför vi gör det vi gör.", included: true, removable: true },
  { id: "tjanster", label: "Tjänster", menuName: "Vad vi gör", brief: "Lista över tjänster/produkter, med en kort beskrivning av varje.", included: true, removable: true },
  { id: "inspiration", label: "Inspiration / Portfolio", menuName: "Inspiration", brief: "Bildgalleri med tidigare projekt eller referensjobb.", included: false, removable: true },
  { id: "nyheter", label: "Nyheter", menuName: "Nyheter", brief: "Nyheter och erbjudanden, kategoriserat. Kan fyllas på med ett AI-skrivet utkast en gång i månaden.", included: false, removable: true, isNew: true },
  { id: "kontakt", label: "Kontakt", menuName: "Kontakt", brief: "Adress, telefon, e-post, karta och ett kontaktformulär.", included: true, removable: true },
];

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "sida"
  );
}

export default function OnboardingStep3() {
  const router = useRouter();
  const [pages, setPages] = useState(defaultPages);
  const [customCount, setCustomCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [allowAiTextFill, setAllowAiTextFill] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLinksValue>({});

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        if (data.site?.logo_url) setLogoUrl(data.site.logo_url);
        if (typeof data.site?.allow_ai_text_fill === "boolean") {
          setAllowAiTextFill(data.site.allow_ai_text_fill);
        }
        const existingSocial: { platform: string; url: string }[] = data.site?.social_links || [];
        if (existingSocial.length > 0) {
          setSocialLinks(Object.fromEntries(existingSocial.map((s) => [s.platform, s.url])));
        }
        if (data.pages && data.pages.length > 0) {
          setPages(
            data.pages.map((p: any) => ({
              id: p.path === "/" ? "start" : p.path.replace(/^\//, ""),
              label: p.label,
              menuName: p.label,
              brief: p.brief || "",
              included: true,
              removable: p.path !== "/",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const toggle = (id: string) =>
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, included: !p.included } : p)));
  const remove = (id: string) => setPages((ps) => ps.filter((p) => p.id !== id));
  const addPage = () => {
    const n = customCount + 1;
    setPages((ps) => [
      ...ps,
      { id: `custom-${n}`, label: `Ny sida ${n}`, menuName: `Ny sida ${n}`, brief: "", included: true, removable: true },
    ]);
    setCustomCount(n);
  };
  const updateField = (id: string, field: "menuName" | "brief", value: string) =>
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const next = async () => {
    const included = pages.filter((p) => p.included);
    if (included.length === 0) {
      setError("Välj minst en sida.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        pages: included.map((p) => ({
          label: p.menuName || p.label,
          path: p.id === "start" ? "/" : "/" + slugify(p.menuName || p.label),
          brief: p.brief,
        })),
        allowAiTextFill,
        socialLinks: Object.entries(socialLinks).map(([platform, url]) => ({ platform, url })),
      };
      const res = await fetch("/api/onboarding/step3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      router.push("/onboarding/4");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={3} stepLabel="INNEHÅLL">
      <div className="w-full max-w-[680px]">
        <h1 className="text-[34px] font-medium mb-2.5">
          Vilka sidor vill du ha?
        </h1>
        <p className="text-[15.5px] text-ink-dim mb-5">
          Kryssa för de sidor du vill ha med, bestäm vad de ska heta i
          menyn, och skriv en kort brief om vad varje sida ska innehålla.
        </p>

        <div className="flex flex-col gap-2.5 mb-3.5">
          {pages.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl px-4 py-3.5 border ${
                p.included ? "border-line bg-surface" : "border-dashed border-line bg-bg"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-label={`Inkludera ${p.label}`}
                    className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 border-[1.5px] ${
                      p.included ? "bg-accent border-accent" : "bg-surface border-line"
                    }`}
                  >
                    {p.included && (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0C1004" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span className={`font-semibold text-[14.5px] ${p.included ? "text-ink" : "text-ink-dim"}`}>
                    {p.label}
                  </span>
                  {p.isNew && (
                    <span className="text-[10.5px] font-bold text-ink bg-accent-soft px-2 py-0.5 rounded-full">
                      NYTT
                    </span>
                  )}
                </div>
                {p.removable && (
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Ta bort ${p.label}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-dim"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <div className="w-[170px] flex-shrink-0">
                  <label className="block text-[11px] font-semibold text-ink-dim tracking-wide mb-1">
                    NAMN I MENYN
                  </label>
                  <input
                    value={p.menuName}
                    onChange={(e) => updateField(p.id, "menuName", e.target.value)}
                    className="w-full box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] bg-surface"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-ink-dim tracking-wide mb-1">
                    VAD SKA SIDAN INNEHÅLLA?
                  </label>
                  <input
                    value={p.brief}
                    onChange={(e) => updateField(p.id, "brief", e.target.value)}
                    className="w-full box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] bg-surface"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPage}
          className="flex items-center gap-2 text-ink font-semibold text-[13.5px] py-1.5 mb-7"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Lägg till egen sida
        </button>

        <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 mb-7 border border-line bg-surface">
          <button
            type="button"
            onClick={() => setAllowAiTextFill((v) => !v)}
            aria-pressed={allowAiTextFill}
            aria-label="Låt AI:n fylla i text där briefen saknas"
            className={`relative flex-shrink-0 w-[42px] h-[24px] rounded-full transition-colors mt-0.5 ${
              allowAiTextFill ? "bg-accent" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                allowAiTextFill ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
          <div>
            <div className="font-semibold text-[14.5px] mb-1">
              Låt AI:n skriva text där jag inte fyllt i något
            </div>
            <p className="text-[13.5px] text-ink-dim leading-relaxed">
              {allowAiTextFill
                ? "På: saknar en sida brief skriver AI:n ändå genuin, relevant copy utifrån bransch och beskrivning."
                : "Av: AI:n håller sig nära det du faktiskt skrivit och hittar inte på egna detaljer, erbjudanden eller siffror — sidor med tom brief blir kortare och mer allmänt hållna."}
            </p>
          </div>
        </div>

        <div className="h-px bg-line my-1.5 mb-6" />

        <h2 className="text-[27px] font-medium mb-2.5">
          Har du texter eller bilder?
        </h2>
        <p className="text-[15.5px] text-ink-dim mb-5">
          Lägg till det du redan har. Resten skriver och väljer YourCoSite
          åt dig — du godkänner allt innan sajten publiceras.
        </p>

        <div className="mb-5">
          <LogoUpload initialUrl={logoUrl} onChange={(url) => setLogoUrl(url || undefined)} />
        </div>

        <FileDropzone />

        <div className="flex items-start gap-2.5 bg-accent-soft rounded-xl px-4 py-3.5 mb-9">
          <span className="text-[13.5px] text-ink leading-relaxed">
            YourCoSite kan inte generera egna bilder åt dig — av
            upphovsrättsskäl skapar vi aldrig nya foton eller
            illustrationer. Ladda upp dina egna bilder ovan, eller välj
            bland royaltyfria bilder längre fram i processen.
          </span>
        </div>

        <div className="h-px bg-line my-1.5 mb-6" />

        <h2 className="text-[27px] font-medium mb-2.5">Sociala medier</h2>
        <p className="text-[15.5px] text-ink-dim mb-5">
          Lägg till dina konton — vi länkar dit från sidfoten och
          kontaktsidan. Fyll bara i de du faktiskt har, helt valfritt.
        </p>
        <div className="mb-9 rounded-xl border border-line bg-surface px-4 py-4">
          <SocialLinksFields value={socialLinks} onChange={setSocialLinks} />
        </div>

        {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

        <div className="flex justify-between">
          <Link href="/onboarding/2" className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5">
            ← Tillbaka
          </Link>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px] disabled:opacity-60"
          >
            {saving ? "Sparar …" : "Nästa →"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
