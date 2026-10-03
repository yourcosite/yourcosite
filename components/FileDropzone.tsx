"use client";

import { useEffect, useRef, useState } from "react";

type Asset = {
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  kind: "image" | "document";
};

// Riktig uppladdning av egna foton/Word/PDF i onboardingens steg 3.
// Bilderna som laddas upp här används sedan automatiskt i AI-genereringen
// (se lib/assignUploadedImages.ts) — i hero och i bildrutorna i stället för
// gradient-platshållare.
export default function FileDropzone() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setError("");
    try {
      const body = new FormData();
      list.forEach((f) => body.append("files", f));
      const res = await fetch("/api/onboarding/assets", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setAssets((a) => [...a, ...(data.assets || [])]);
      if (data.skipped?.length) setError(`Hoppade över: ${data.skipped.join(", ")}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
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
          Egna foton (PNG/JPG/WEBP), Word eller PDF, max 10 MB per fil.
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
