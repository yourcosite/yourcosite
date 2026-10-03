"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";
import InspirationImageUpload from "@/components/InspirationImageUpload";

export default function OnboardingStep2() {
  const router = useRouter();
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [u3, setU3] = useState("");
  const [saving, setSaving] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  // Bara för att visa befintliga bilder igen om kunden går fram och
  // tillbaka — själva sparandet sker direkt vid uppladdning/borttagning
  // (se InspirationImageUpload), inte här i steg2-sparningen.
  const [inspirationImageUrls, setInspirationImageUrls] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        const links: string[] = data.site?.inspiration_links || [];
        setU1(links[0] || "");
        setU2(links[1] || "");
        setU3(links[2] || "");
        setInspirationImageUrls(data.site?.inspiration_image_urls || []);
      })
      .catch(() => {});
  }, []);

  const next = async () => {
    // Annars gick det att klicka vidare medan en bild fortfarande laddades
    // upp i bakgrunden — exakt samma bugg som tidigare bet oss med de vanliga
    // foton i steg 3 (se FileDropzone/onboarding/3).
    if (imagesUploading) return;
    setSaving(true);
    try {
      await fetch("/api/onboarding/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: [u1, u2, u3] }),
      });
      router.push("/onboarding/3");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={2} stepLabel="INSPIRATION">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">Vad gillar du?</h1>
        <p className="text-[15.5px] text-ink-dim mb-7">
          Klistra in sajter vars känsla eller stil du gillar. Vi tittar på
          ton, struktur och stämning — aldrig text eller bilder rakt av.
          Helt valfritt.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <div>
            <label htmlFor="u1" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 1
            </label>
            <input
              id="u1"
              type="url"
              value={u1}
              onChange={(e) => setU1(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u2" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 2 (valfritt)
            </label>
            <input
              id="u2"
              type="url"
              value={u2}
              onChange={(e) => setU2(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u3" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 3 (valfritt)
            </label>
            <input
              id="u3"
              type="url"
              value={u3}
              onChange={(e) => setU3(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>

          <div className="mt-2">
            <label className="block text-[13.5px] font-semibold mb-1.5">
              Eller ladda upp bilder (valfritt)
            </label>
            <InspirationImageUpload
              initialUrls={inspirationImageUrls}
              onChange={setInspirationImageUrls}
              onUploadingChange={setImagesUploading}
            />
          </div>

          <div className="flex items-start gap-2.5 bg-accent-soft rounded-xl px-4 py-3.5 mt-2">
            <span className="text-[13.5px] text-ink leading-relaxed">
              Har du ingen favorit? Hoppa över det här steget.
            </span>
          </div>

          <div className="flex justify-between mt-4">
            <Link
              href="/onboarding/1"
              className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5"
            >
              ← Tillbaka
            </Link>
            <button
              type="submit"
              disabled={saving || imagesUploading}
              className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px] disabled:opacity-60"
            >
              {saving ? "Sparar …" : imagesUploading ? "Väntar på bilder …" : "Nästa →"}
            </button>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
