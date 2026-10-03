"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";
import PrivacyPolicyUpload from "@/components/PrivacyPolicyUpload";

type Mode = "uploaded" | "generated" | null;

// Sista onboarding-steget — kundens integritetspolicy för SIN sajt. Helt
// valfritt (precis som inspirationslänkarna i steg 2): man kan antingen
// ladda upp en egen färdig policy, få en enkel standardtext skriven åt sig,
// eller bara hoppa över och lägga till det senare.
export default function OnboardingStep5() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [orgNumber, setOrgNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        const site = data.site;
        if (!site) return;
        if (site.privacy_policy_mode === "uploaded") {
          setMode("uploaded");
          setFileUrl(site.privacy_policy_file_url || null);
        } else if (site.privacy_policy_mode === "generated") {
          setMode("generated");
          setOrgNumber(site.privacy_policy_org_number || "");
          setAddress(site.privacy_policy_address || "");
          setEmail(site.privacy_policy_email || "");
        }
      })
      .catch(() => {});
  }, []);

  const next = async () => {
    if (uploading) return;
    setSaving(true);
    setError("");
    try {
      if (mode === "generated") {
        if (!orgNumber.trim() || !address.trim() || !email.trim()) {
          setError("Fyll i organisationsnummer, adress och e-post — eller välj att hoppa över.");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/onboarding/privacy-policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "generated", orgNumber, address, email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Något gick fel.");
      }
      // Läget "uploaded" har redan sparats direkt av PrivacyPolicyUpload,
      // och "hoppa över" (mode === null) behöver inget sparanrop alls —
      // fältet står redan null tills kunden aktivt väljer något.
      router.push("/bygger");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={5} stepLabel="INTEGRITETSPOLICY">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">Integritetspolicy</h1>
        <p className="text-[15.5px] text-ink-dim mb-7">
          Besökare på din sajt bör kunna läsa hur du hanterar deras
          personuppgifter. Har du redan en policy kan du ladda upp den —
          annars skriver vi en enkel standardtext åt dig. Helt valfritt,
          du kan alltid lägga till det senare.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMode("uploaded")}
            className={`flex-1 text-left px-4 py-3.5 rounded-[10px] border-[1.5px] ${
              mode === "uploaded" ? "border-ink bg-accent-soft" : "border-line"
            }`}
          >
            <div className="font-semibold text-[14.5px]">Jag har redan en</div>
            <div className="text-[12.5px] text-ink-dim mt-0.5">Ladda upp din egen fil</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("generated")}
            className={`flex-1 text-left px-4 py-3.5 rounded-[10px] border-[1.5px] ${
              mode === "generated" ? "border-ink bg-accent-soft" : "border-line"
            }`}
          >
            <div className="font-semibold text-[14.5px]">Skriv en åt mig</div>
            <div className="text-[12.5px] text-ink-dim mt-0.5">Utifrån dina uppgifter</div>
          </button>
        </div>

        {mode === "uploaded" && (
          <div className="mb-6">
            <PrivacyPolicyUpload
              initialFileUrl={fileUrl}
              onChange={setFileUrl}
              onUploadingChange={setUploading}
            />
          </div>
        )}

        {mode === "generated" && (
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label htmlFor="org" className="block text-[13.5px] font-semibold mb-1.5">
                Organisationsnummer
              </label>
              <input
                id="org"
                type="text"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="XXXXXX-XXXX"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="addr" className="block text-[13.5px] font-semibold mb-1.5">
                Adress
              </label>
              <input
                id="addr"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Gatuadress, postnummer, ort"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="mail" className="block text-[13.5px] font-semibold mb-1.5">
                Kontakt-e-post för dataskyddsfrågor
              </label>
              <input
                id="mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dataskydd@dittforetag.se"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div className="bg-accent-soft rounded-xl px-4 py-3.5 text-[13px] text-ink leading-relaxed">
              Texten vi skriver är en enkel standardmall, inte juridisk
              rådgivning — bra att låta någon kunnig granska den innan du
              litar helt på den.
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

        <div className="flex items-start gap-2.5 bg-accent-soft rounded-xl px-4 py-3.5 mt-2 mb-6">
          <span className="text-[13.5px] text-ink leading-relaxed">
            Vill du inte ta ställning nu? Hoppa över det här steget.
          </span>
        </div>

        <div className="flex justify-between">
          <Link href="/onboarding/4" className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5">
            ← Tillbaka
          </Link>
          <button
            type="button"
            onClick={next}
            disabled={saving || uploading}
            className="bg-accent text-accent-ink font-semibold text-[15.5px] px-7.5 py-3.5 rounded-[10px] disabled:opacity-60"
          >
            {saving ? "Sparar …" : uploading ? "Väntar på fil …" : "Bygg min sajt →"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
