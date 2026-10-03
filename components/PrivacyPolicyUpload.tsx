"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Onboarding steg 5 — kunden laddar upp sin EGEN integritetspolicy (t.ex.
// en PDF en jurist skrivit). Vi läser aldrig innehållet eller gör något
// med filen förutom att spara länken — sidfoten på kundens sajt länkar
// sen direkt till den, öppnad i en ny flik (se Footer i SitePreview.tsx).
export default function PrivacyPolicyUpload({
  initialFileUrl,
  onChange,
  onUploadingChange,
}: {
  initialFileUrl?: string | null;
  onChange?: (fileUrl: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(initialFileUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Filtypen stöds inte — använd PDF, Word eller en vanlig textfil.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Filen är större än 10 MB.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Du är inte inloggad längre — ladda om sidan.");
      setUploading(false);
      onUploadingChange?.(false);
      return;
    }

    const ext = file.name.split(".").pop() || "pdf";
    const path = `${user.id}/privacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      setError(`Gick inte att ladda upp: ${uploadError.message}`);
      setUploading(false);
      onUploadingChange?.(false);
      return;
    }

    const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

    try {
      const res = await fetch("/api/onboarding/privacy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "uploaded", fileUrl: pub.publicUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setFileUrl(pub.publicUrl);
      onChange?.(pub.publicUrl);
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
      const res = await fetch("/api/onboarding/privacy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: null }),
      });
      if (res.ok) {
        setFileUrl(null);
        onChange?.(null);
      }
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  if (fileUrl) {
    const fileName = decodeURIComponent(fileUrl.split("/").pop() || "fil");
    return (
      <div className="flex items-center justify-between gap-3 border border-line rounded-[10px] px-4 py-3 bg-surface">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-semibold underline truncate">
          {fileName}
        </a>
        <button type="button" onClick={remove} disabled={uploading} className="text-[12.5px] text-ink-dim font-semibold flex-shrink-0 disabled:opacity-60">
          {uploading ? "…" : "Ta bort"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-[1.5px] border-dashed border-line rounded-2xl px-6 py-5 text-center bg-surface cursor-pointer"
      >
        <div className="font-semibold text-[14.5px]">
          {uploading ? "Laddar upp …" : "Ladda upp din integritetspolicy"}
        </div>
        <div className="text-[12.5px] text-ink-dim mt-1">PDF, Word eller textfil, max 10 MB.</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-[12.5px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
