"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import SitePreview from "@/components/SitePreview";
import { THEME_VARIANTS } from "@/lib/themeVariants";
import { countImageSlots, type SiteContent } from "@/lib/contentModel";

export default function SuggestionsPage() {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState<string | null>(null);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState<number | null>(null);
  const [relinking, setRelinking] = useState(false);
  const [relinkError, setRelinkError] = useState("");

  useEffect(() => {
    fetch("/api/sites/mine")
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSiteName(data.site.name);
        setContent(data.site.content);
        if (typeof data.uploadedPhotoCount === "number") {
          setUploadedPhotoCount(data.uploadedPhotoCount);
        }
      })
      .catch(() => setError("Kunde inte hämta sajten."));
  }, []);

  const relinkImages = async () => {
    setRelinking(true);
    setRelinkError("");
    try {
      const res = await fetch("/api/sites/relink-images", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      // Hämta sajten på nytt så förhandsvisningarna uppdateras med bilderna.
      const fresh = await fetch("/api/sites/mine").then((r) => r.json());
      if (fresh.site) {
        setContent(fresh.site.content);
        setUploadedPhotoCount(fresh.uploadedPhotoCount ?? uploadedPhotoCount);
      }
    } catch (e: any) {
      setRelinkError(e.message);
    } finally {
      setRelinking(false);
    }
  };

  const choose = async (variantId: string) => {
    const variant = THEME_VARIANTS.find((v) => v.id === variantId);
    if (!variant) return;
    setChoosing(variantId);
    try {
      const res = await fetch("/api/sites/choose-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ font: variant.font, backgroundMode: variant.backgroundMode, buttonStyle: variant.buttonStyle }),
      });
      if (!res.ok) throw new Error("Något gick fel.");
      router.push("/webbplats");
    } catch (e: any) {
      alert(e.message);
      setChoosing(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface">
        <Logo light={false} />
        <Link href="/dashboard" className="text-[14px] text-ink-dim font-medium">
          Avbryt
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-10 md:py-11">
        <div className="w-full max-w-[1040px]">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-medium mb-2.5">
              Här är {siteName ? `${siteName}s` : "din"} nya sajt
            </h1>
            <p className="text-[15.5px] text-ink-dim max-w-[560px] mx-auto">
              Samma innehåll, {THEME_VARIANTS.length} olika utseenden. Välj
              den du gillar bäst — du kan ändra precis allt efteråt.
            </p>
          </div>

          {error && (
            <div className="bg-surface border border-line rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">
              {error}{" "}
              <Link href="/bygger" className="font-semibold underline">
                Försök bygga sajten igen
              </Link>
            </div>
          )}

          {!error && !content && (
            <div className="bg-surface border border-line rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">
              Hämtar din sajt …
            </div>
          )}

          {content && uploadedPhotoCount !== null && uploadedPhotoCount > 0 && countImageSlots(content).used === 0 && (
            <div className="bg-[#FFF4E5] border border-[#F0D9B5] rounded-2xl px-5 py-4 mb-6 text-[13.5px] text-[#6B4A1A] leading-relaxed">
              Du har {uploadedPhotoCount} uppladdade foto{uploadedPhotoCount === 1 ? "" : "n"}, men inget av dem kom
              med i den här sajten — designen visar platshållare istället.{" "}
              <button
                type="button"
                onClick={relinkImages}
                disabled={relinking}
                className="font-semibold underline disabled:opacity-60"
              >
                {relinking ? "Kopplar in bilder …" : "Koppla in bilderna nu"}
              </button>{" "}
              (ingen ny text skrivs, bara bilderna placeras in).
              {relinkError && <div className="text-red-700 mt-1">{relinkError}</div>}
            </div>
          )}

          {content && (
            <div className="grid sm:grid-cols-2 gap-5.5">
              {THEME_VARIANTS.map((v) => (
                <div
                  key={v.id}
                  className={`relative bg-surface rounded-2xl overflow-hidden flex flex-col ${
                    v.recommended
                      ? "border-[1.5px] border-accent shadow-[0_0_0_3px_var(--tw-shadow-color)]"
                      : "border-[1.5px] border-line"
                  }`}
                  style={v.recommended ? ({ "--tw-shadow-color": "#F0FADB" } as React.CSSProperties) : undefined}
                >
                  {v.recommended && (
                    <div className="absolute top-3 right-3 bg-ink text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide z-10">
                      REKOMMENDERAS
                    </div>
                  )}
                  {/* Bredare kort (2 per rad istället för 3) + 16:9-förhållande
                      (samma som de flesta skärmar) gör att förhandsvisningen
                      ser ut som en riktig webbläsarruta oavsett kortbredd —
                      en fast pixelhöjd skulle bara råka stämma vid en enda
                      bredd och bli fel vid alla andra skärmstorlekar. */}
                  <div className="aspect-[16/9] overflow-hidden relative border-b border-line">
                    <div
                      className="absolute top-0 left-0 w-[400%] origin-top-left"
                      style={{ transform: "scale(0.25)" }}
                    >
                      <SitePreview
                        content={content}
                        siteName={siteName}
                        fontOverride={v.font}
                        backgroundModeOverride={v.backgroundMode}
                        buttonStyleOverride={v.buttonStyle}
                      />
                    </div>
                  </div>
                  <div className="px-5 py-5 flex flex-col flex-1">
                    <div className="font-semibold text-[15.5px] mb-1">{v.label}</div>
                    <div className="text-[13px] text-ink-dim mb-4 leading-relaxed flex-1">{v.desc}</div>
                    <button
                      onClick={() => choose(v.id)}
                      disabled={choosing !== null}
                      className="block text-center bg-accent text-accent-ink font-semibold text-[14px] py-2.5 rounded-[9px] disabled:opacity-60"
                    >
                      {choosing === v.id ? "Sparar …" : "Välj den här"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-6.5">
            <Link href="/bygger" className="text-[13.5px] text-ink-dim font-semibold">
              ← Be YourCoSite skriva om alltihop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
