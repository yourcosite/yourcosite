"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StockPhotoModal, { type StockPhoto } from "@/components/StockPhotoModal";
import { withCredit } from "@/lib/stockPhotos";

type Asset = {
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  kind: "image" | "document";
};

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB per fil
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Riktig uppladdning av egna foton/Word/PDF i onboardingens steg 3.
// Filerna laddas upp DIREKT till Supabase Storage från webbläsaren — inte
// via vår egen server — så flera filer samtidigt aldrig krockar med
// Vercels gräns för hur stor en request-body får vara. Vi skickar bara
// den färdiga URL:en till vår server för att spara en rad i databasen.
// Bilderna som laddas upp används sedan automatiskt i AI-genereringen (se
// lib/assignUploadedImages.ts) — i hero och i bildrutorna.
export default function FileDropzone({
  onUploadingChange,
}: {
  // Låter föräldrakomponenten (onboarding steg 3) veta när en uppladdning
  // pågår, så den kan spärra "Nästa →" tills den är klar. Utan det här gick
  // det att klicka vidare medan foton fortfarande laddades upp i
  // bakgrunden — sajten byggdes då utan dem, trots att kunden redan sett
  // en bild "laddas upp". Det var den verkliga orsaken till flera
  // buggrapporter om saknade hero-bilder.
  onUploadingChange?: (uploading: boolean) => void;
} = {}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stockOpen, setStockOpen] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/assets")
      .then((r) => r.json())
      .then((data) => setAssets(data.assets || []))
      .catch(() => {});
  }, []);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
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
    const newAssets: Asset[] = [];

    // En fil i taget (inte parallellt) — enklare felhantering och vi
    // slipper överbelasta Supabase Storage med en stor bulk på en gång.
    for (const file of list) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        skipped.push(`${file.name} (filtyp stöds inte)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name} (större än 15 MB)`);
        continue;
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        skipped.push(`${file.name} (gick inte att ladda upp: ${uploadError.message})`);
        continue;
      }

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

      try {
        const res = await fetch("/api/onboarding/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileUrl: pub.publicUrl, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        newAssets.push(data.asset);
      } catch {
        skipped.push(`${file.name} (gick inte att spara)`);
      }
    }

    setAssets((a) => [...a, ...newAssets]);
    if (skipped.length) setError(`Hoppade över: ${skipped.join(", ")}`);
    setUploading(false);
    onUploadingChange?.(false);
  };

  // Ett foto från stockbildssökningen sparas som en vanlig bild-rad —
  // adressen pekar på Unsplash (inte vår lagring) och bär fotografen i sig
  // (se lib/stockPhotos.ts), så den visas i sajtens sidfot sedan.
  const addStock = async (photo: StockPhoto) => {
    setError("");
    onUploadingChange?.(true);
    setUploading(true);
    try {
      const res = await fetch("/api/onboarding/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `Stockbild (${photo.photographer})`.slice(0, 100),
          fileUrl: withCredit(photo.url, { name: photo.photographer, profileUrl: photo.profileUrl }),
          mimeType: "image/jpeg",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets((a) => [...a, data.asset]);
    } catch {
      setError("Kunde inte lägga till stockbilden.");
    }
    setUploading(false);
    onUploadingChange?.(false);
  };

  const remove = async (id: string) => {
    setAssets((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/onboarding/assets/${id}`, { method: "DELETE" });
  };

  return (
    <div className="mb-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-[1.5px] border-dashed rounded-2xl px-10 py-10 text-center mb-3 bg-surface cursor-pointer transition-colors ${
          dragOver ? "border-accent bg-accent-soft" : "border-line"
        }`}
      >
        <div className="w-[46px] h-[46px] rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-3.5">
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#17171A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="font-semibold text-[15.5px]">
          {uploading ? "Laddar upp …" : "Släpp filer här, eller bläddra"}
        </div>
        <div className="text-[13px] text-ink-dim mt-1.5">
          Egna foton (PNG/JPG/WEBP), Word eller PDF, max 15 MB per fil, flera åt gången går bra.
          (Logga? Ladda upp den separat ovanför istället.)
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setStockOpen(true)}
        disabled={uploading}
        className="text-[13px] font-semibold text-ink border border-line bg-surface px-4 py-2 rounded-lg mb-3 disabled:opacity-60"
      >
        Eller sök gratis stockbilder
      </button>
      <StockPhotoModal open={stockOpen} onClose={() => setStockOpen(false)} onPick={addStock} />

      {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-2">
          {assets.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 bg-surface border border-line rounded-full pl-1.5 pr-2.5 py-1.5"
            >
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.file_url} alt={a.file_name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-bg flex items-center justify-center flex-shrink-0 text-[11px]">
                  📄
                </span>
              )}
              <span className="text-[12px] max-w-[140px] truncate">{a.file_name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a.id);
                }}
                aria-label={`Ta bort ${a.file_name}`}
                className="text-ink-dim"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
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
