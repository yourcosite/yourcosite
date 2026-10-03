"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB, samma gräns som de allmänna fotona
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Egen, dedikerad uppladdning för HUVUDBILDEN (hero) — separat från den
// allmänna bild-dropzonen, precis som loggan. Utan den blev startsidans
// hero-bild bara "den som råkade laddas upp först" bland alla andra foton,
// vilket var otydligt för kunden. Laddas upp direkt till Supabase Storage
// från webbläsaren (samma mönster som FileDropzone) — ingen Vercel-gräns
// för filstorlek att oroa sig för.
export default function HeroImageUpload({
  initialUrl,
  onChange,
  onUploadingChange,
}: {
  initialUrl?: string;
  onChange?: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [imageUrl, setImageUrl] = useState(initialUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Använd PNG, JPG eller WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Filen är större än 15 MB.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Du är inte inloggad längre — ladda om sidan.");
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/hero-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

      const res = await fetch("/api/onboarding/hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: pub.publicUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");

      setImageUrl(data.heroImageUrl);
      onChange?.(data.heroImageUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const remove = async () => {
    setUploading(true);
    onUploadingChange?.(true);
    try {
      await fetch("/api/onboarding/hero-image", { method: "DELETE" });
      setImageUrl("");
      onChange?.(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="border-[1.5px] border-line rounded-2xl px-5 py-4 bg-surface flex items-center gap-4 mb-3.5">
      <div className="w-20 h-14 rounded-xl bg-bg border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Huvudbild" className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9E9C97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="1.8" />
            <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 20" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] mb-0.5">Huvudbild (valfritt)</div>
        <div className="text-[12.5px] text-ink-dim">
          Den stora bilden högst upp på startsidan. Väljer du ingen tar vi
          istället en av dina andra uppladdade bilder.
        </div>
        {error && <div className="text-[12px] text-red-600 mt-1">{error}</div>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {imageUrl ? (
        <button
          type="button"
          onClick={remove}
          disabled={uploading}
          className="text-[12.5px] font-semibold text-ink-dim border border-line px-3.5 py-2 rounded-lg flex-shrink-0 disabled:opacity-60"
        >
          Ta bort
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[12.5px] font-semibold text-ink bg-bg border border-line px-3.5 py-2 rounded-lg flex-shrink-0 disabled:opacity-60"
        >
          {uploading ? "Laddar upp …" : "Ladda upp huvudbild"}
        </button>
      )}
    </div>
  );
}
