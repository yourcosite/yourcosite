"use client";

import { useRef, useState } from "react";

// Egen, tydligt separat uppladdningsknapp för logga — skild från den
// generella "släpp dina bilder här"-ytan så den aldrig blandas ihop med
// ett gäng andra bilder. Helt valfritt, men gör sajten tydligare direkt.
export default function LogoUpload({
  initialUrl,
  onChange,
}: {
  initialUrl?: string;
  onChange?: (url: string | null) => void;
}) {
  const [logoUrl, setLogoUrl] = useState(initialUrl || "");
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/onboarding/logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setLogoUrl(data.logoUrl);
      onChange?.(data.logoUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  // Kör helt i webbläsaren (ingen bild skickas till någon extern tjänst) —
  // tar bort bakgrunden från en redan uppladdad logga och laddar upp
  // resultatet som en ny PNG via samma flöde som vanlig uppladdning. Kan ta
  // några sekunder första gången (hämtar sin egen AI-modell), snabbare
  // efteråt eftersom webbläsaren cachar den.
  const removeBackground = async () => {
    if (!logoUrl) return;
    setRemovingBg(true);
    setError("");
    try {
      const { removeBackground: removeBg } = await import("@imgly/background-removal");
      const resultBlob = await removeBg(logoUrl);
      const file = new File([resultBlob], "logo-friLagd.png", { type: "image/png" });
      await upload(file);
    } catch (e: any) {
      setError("Kunde inte frilägga loggan just nu: " + (e?.message || "okänt fel"));
    } finally {
      setRemovingBg(false);
    }
  };

  const remove = async () => {
    setUploading(true);
    try {
      await fetch("/api/onboarding/logo", { method: "DELETE" });
      setLogoUrl("");
      onChange?.(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-[1.5px] border-line rounded-2xl px-5 py-4 bg-surface flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-bg border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logga" className="max-w-full max-h-full object-contain" />
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9E9C97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01M15 10h.01M8 15c1.1 1 2.4 1.5 4 1.5s2.9-.5 4-1.5" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] mb-0.5">Logga (valfritt)</div>
        <div className="text-[12.5px] text-ink-dim">
          Har du ingen logga är det okej — vi visar företagsnamnet tydligt
          istället. PNG, JPG, SVG eller WEBP, max 2 MB.
        </div>
        {error && <div className="text-[12px] text-red-600 mt-1">{error}</div>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {logoUrl ? (
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={removeBackground}
              disabled={uploading || removingBg}
              title="Tar bort bakgrunden från loggan, helt i din webbläsare"
              className="text-[12.5px] font-semibold text-ink bg-bg border border-line px-3.5 py-2 rounded-lg disabled:opacity-60"
            >
              {removingBg ? "Frilägger …" : "Frilägg bakgrund"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={uploading || removingBg}
              className="text-[12.5px] font-semibold text-ink-dim border border-line px-3.5 py-2 rounded-lg disabled:opacity-60"
            >
              Ta bort
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[12.5px] font-semibold text-ink bg-bg border border-line px-3.5 py-2 rounded-lg flex-shrink-0 disabled:opacity-60"
        >
          {uploading ? "Laddar upp …" : "Ladda upp logga"}
        </button>
      )}
    </div>
  );
}
