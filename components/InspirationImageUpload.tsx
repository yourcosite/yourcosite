"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lägre gräns än de övriga uppladdningarna (15 MB) — de här bilderna
// skickas som bilddata direkt till Claude vid genereringen, och stora
// bilder blir både dyrare (fler tokens) och riskerar att gå över
// AI-tjänstens egen storleksgräns per bild. 5 MB räcker gott för en
// skärmdump eller ett foto.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 6;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Komplement till länkfältet ovanför på onboarding steg 2 — skärmdumpar
// eller foton av sajter/stilar kunden gillar, för referenser som inte går
// att länka till (Pinterest-urklipp, en sajt bakom inloggning, ett foto av
// något de sett). Laddas upp direkt till Supabase Storage (samma mönster
// som övriga uppladdningar), och skickas som riktig bilddata till Claude
// vid genereringen (se app/api/sites/generate) — en säkrare signal om
// t.ex. layout och stämning än att bara läsa textutdrag ur en länk.
export default function InspirationImageUpload({
  initialUrls,
  onChange,
  onUploadingChange,
}: {
  initialUrls?: string[];
  onChange?: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (urls.length >= MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} inspirationsbilder — ta bort någon för att lägga till fler.`);
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Du är inte inloggad längre — ladda om sidan.");
      setUploading(false);
      onUploadingChange?.(false);
      return;
    }

    const skipped: string[] = [];
    let nextUrls = urls;

    for (const file of list) {
      if (nextUrls.length >= MAX_IMAGES) {
        skipped.push(`${file.name} (max ${MAX_IMAGES} bilder)`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        skipped.push(`${file.name} (filtyp stöds inte)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name} (större än 5 MB)`);
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/inspo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        skipped.push(`${file.name} (gick inte att ladda upp: ${uploadError.message})`);
        continue;
      }

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

      try {
        const res = await fetch("/api/onboarding/inspiration-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: pub.publicUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Något gick fel.");
        nextUrls = data.inspirationImageUrls;
      } catch (e: any) {
        skipped.push(`${file.name} (${e.message})`);
      }
    }

    setUrls(nextUrls);
    onChange?.(nextUrls);
    if (skipped.length) setError(`Hoppade över: ${skipped.join(", ")}`);
    setUploading(false);
    onUploadingChange?.(false);
  };

  const remove = async (url: string) => {
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const res = await fetch("/api/onboarding/inspiration-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: url }),
      });
      const data = await res.json();
      if (res.ok) {
        setUrls(data.inspirationImageUrls);
        onChange?.(data.inspirationImageUrls);
      }
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-[1.5px] border-dashed border-line rounded-2xl px-6 py-5 text-center bg-surface cursor-pointer mb-3"
      >
        <div className="font-semibold text-[14.5px]">
          {uploading ? "Laddar upp …" : "Ladda upp skärmdumpar eller bilder du gillar"}
        </div>
        <div className="text-[12.5px] text-ink-dim mt-1">
          PNG/JPG/WEBP, max 5 MB per bild, upp till {MAX_IMAGES} st. Helt valfritt.
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-2">
          {urls.map((url) => (
            <div key={url} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden border border-line flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Inspiration" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(url);
                }}
                aria-label="Ta bort bild"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
