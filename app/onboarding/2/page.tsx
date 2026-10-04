"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";
import InspirationImageUpload from "@/components/InspirationImageUpload";

const swatches = [
  "#C6FF5E", // lime
  "#E8714A", // warm orange
  "#2F5D50", // forest green
  "#DC2626", // red
  "#2563EB", // blue
  "#0EA5E9", // sky blue
  "#7C3AED", // purple
  "#DB2777", // pink
  "#CA8A04", // gold
  "#0D9488", // teal
  "#17171A", // ink
  "#FFFFFF", // white
];

function isValidHex(v: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function CheckMark({ dark = true }: { dark?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke={dark ? "#17171A" : "#fff"}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.5))" }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ColorCircle({
  value,
  onChange,
  size = 38,
  selected = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  selected?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full border border-line flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: isValidHex(value) ? value : "#ffffff",
          boxShadow: selected ? "0 0 0 2px #fff, 0 0 0 4px #17171A" : undefined,
        }}
      >
        {selected && <CheckMark dark={!isValidHex(value) || value.toLowerCase() === "#ffffff"} />}
      </div>
      <input
        type="color"
        value={isValidHex(value) && value.length === 7 ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Öppna färgväljare"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

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

  // Färgvalet, flyttat hit från det gamla separata "Stil"-steget — känns
  // naturligt att välja direkt efter man visat oss referenser/inspiration.
  const [mainColor, setMainColor] = useState("#C6FF5E");
  const [extraColors, setExtraColors] = useState<string[]>(["#2F5D50"]);
  const [mainHexDraft, setMainHexDraft] = useState("#C6FF5E");
  const [extraHexDraft, setExtraHexDraft] = useState("");

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        const links: string[] = data.site?.inspiration_links || [];
        setU1(links[0] || "");
        setU2(links[1] || "");
        setU3(links[2] || "");
        setInspirationImageUrls(data.site?.inspiration_image_urls || []);
        if (data.site?.accent_color) setMain(data.site.accent_color);
        if (data.site?.secondary_colors?.length) setExtraColors(data.site.secondary_colors);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMain = (hex: string) => {
    setMainColor(hex);
    setMainHexDraft(hex);
  };

  const toggleExtra = (hex: string) => {
    setExtraColors((cur) => {
      if (cur.includes(hex)) return cur.filter((c) => c !== hex);
      if (cur.length >= 2) return cur;
      return [...cur, hex];
    });
  };

  const removeExtra = (hex: string) =>
    setExtraColors((cur) => cur.filter((c) => c !== hex));

  const addExtraHex = () => {
    if (!isValidHex(extraHexDraft)) return;
    if (extraColors.length >= 2) return;
    if (extraColors.includes(extraHexDraft)) return;
    setExtraColors((cur) => [...cur, extraHexDraft]);
    setExtraHexDraft("");
  };

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
        body: JSON.stringify({
          links: [u1, u2, u3],
          accentColor: mainColor,
          secondaryColors: extraColors,
        }),
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

          <div className="h-px bg-line my-1.5 mt-5" />

          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[13.5px] font-semibold">Huvudfärg</div>
              <div className="flex items-center gap-1.5 bg-accent-soft rounded-full pl-1 pr-3 py-1">
                <span
                  className="w-[18px] h-[18px] rounded-full border border-line flex-shrink-0"
                  style={{ background: isValidHex(mainColor) ? mainColor : "#fff" }}
                />
                <span className="text-[12px] font-mono font-semibold">{mainColor.toUpperCase()}</span>
                <span className="text-[11px] text-ink-dim">vald</span>
              </div>
            </div>
            <p className="text-[12px] text-ink-dim mb-2.5">
              Den färg som syns mest — knappar, länkar och accenter. Du kan
              alltid ändra den senare.
            </p>
            <div className="flex items-center gap-2.5 mb-6 flex-wrap">
              {swatches.map((hex) => {
                const selected = mainColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    type="button"
                    key={hex}
                    aria-label={hex}
                    onClick={() => setMain(hex)}
                    className="w-[34px] h-[34px] rounded-full flex-shrink-0 border border-line flex items-center justify-center"
                    style={{
                      background: hex,
                      boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px #17171A` : "none",
                    }}
                  >
                    {selected && <CheckMark dark={hex.toLowerCase() === "#ffffff"} />}
                  </button>
                );
              })}
              <div className="w-px h-6.5 bg-line mx-1 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <ColorCircle
                  value={mainColor}
                  onChange={(hex) => setMain(hex)}
                  selected={!swatches.some((s) => s.toLowerCase() === mainColor.toLowerCase())}
                />
                <input
                  value={mainHexDraft}
                  onChange={(e) => setMainHexDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValidHex(mainHexDraft)) setMain(mainHexDraft);
                  }}
                  maxLength={7}
                  placeholder="#000000"
                  className="w-[100px] box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => isValidHex(mainHexDraft) && setMain(mainHexDraft)}
                  disabled={!isValidHex(mainHexDraft)}
                  className="text-[12.5px] font-semibold px-3.5 py-2 rounded-lg border border-line disabled:opacity-40"
                >
                  Använd
                </button>
              </div>
            </div>

            <div className="text-[13.5px] font-semibold mb-1">
              Fler färger <span className="text-ink-dim font-normal">(valfritt, max 2)</span>
            </div>
            <p className="text-[12px] text-ink-dim mb-2.5">
              Komplementfärger till bakgrunder, kort och detaljer.
            </p>
            <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
              {swatches
                .filter((hex) => hex !== mainColor)
                .map((hex) => {
                  const selected = extraColors.includes(hex);
                  const disabled = !selected && extraColors.length >= 2;
                  return (
                    <button
                      type="button"
                      key={hex}
                      aria-label={hex}
                      disabled={disabled}
                      onClick={() => toggleExtra(hex)}
                      className="w-[34px] h-[34px] rounded-full flex-shrink-0 border border-line flex items-center justify-center"
                      style={{
                        background: hex,
                        opacity: disabled ? 0.35 : 1,
                        boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px #17171A` : "none",
                      }}
                    >
                      {selected && <CheckMark dark={hex.toLowerCase() === "#ffffff"} />}
                    </button>
                  );
                })}
              <div className="w-px h-6.5 bg-line mx-1 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <ColorCircle value={extraHexDraft || "#ffffff"} onChange={setExtraHexDraft} />
                <input
                  value={extraHexDraft}
                  onChange={(e) => setExtraHexDraft(e.target.value)}
                  placeholder="#000000"
                  maxLength={7}
                  className="w-[100px] box-border px-2.5 py-2 border border-line rounded-lg text-[13.5px] font-mono"
                />
                <button
                  type="button"
                  onClick={addExtraHex}
                  disabled={!isValidHex(extraHexDraft) || extraColors.length >= 2}
                  className="text-[12.5px] font-semibold px-3.5 py-2 rounded-lg border border-line disabled:opacity-40"
                >
                  Lägg till
                </button>
              </div>
            </div>

            {extraColors.length > 0 && (
              <div className="flex items-center gap-2.5 flex-wrap">
                {extraColors.map((hex) => (
                  <div
                    key={hex}
                    className="flex items-center gap-2 bg-surface border border-line rounded-full pl-1.5 pr-3 py-1.5"
                  >
                    <div
                      className="w-[20px] h-[20px] rounded-full border border-line flex-shrink-0"
                      style={{ background: hex }}
                    />
                    <span className="text-[12.5px] font-mono">{hex.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => removeExtra(hex)}
                      aria-label={`Ta bort ${hex}`}
                      className="text-ink-dim"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
