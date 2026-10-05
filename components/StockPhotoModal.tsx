"use client";

import { useState } from "react";

export type StockPhoto = {
  id: string;
  thumbUrl: string;
  url: string;
  alt: string;
  photographer: string;
  profileUrl: string;
  downloadLocation: string;
};

// Sökruta + rutnät med licensfria foton från Unsplash. Ett klick på ett foto
// lämnas till föräldern (onPick) som bilaga i chatten — sedan ber kunden
// Millie placera den ("använd den som hero-bild").
export default function StockPhotoModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (photo: StockPhoto) => void;
}) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const search = async (q: string, p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}&page=${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sökningen misslyckades.");
      setPhotos((prev) => (p === 1 ? data.photos : [...prev, ...data.photos]));
      setPage(p);
      setTotalPages(data.totalPages || 0);
      setSearched(q);
    } catch (e: any) {
      setError(e.message || "Sökningen misslyckades.");
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sök stockbilder"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[760px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="text-[15px] font-semibold">Stockbilder</div>
            <div className="text-[12px] text-ink-dim">Gratis foton från Unsplash — fotografen anges i sajtens sidfot.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng" className="text-[20px] text-ink-dim px-2">×</button>
        </div>

        <form
          className="flex gap-2 px-5 py-3 border-b border-line"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) search(query.trim(), 1);
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök t.ex. äppelträd, kontor, kaffe …"
            className="flex-1 border border-line rounded-lg px-3 py-2 text-[14px] bg-bg"
          />
          <button type="submit" disabled={loading || !query.trim()} className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4 rounded-lg disabled:opacity-60">
            Sök
          </button>
        </form>

        <div className="overflow-y-auto p-5 flex-1">
          {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}
          {!error && !loading && searched && photos.length === 0 && (
            <p className="text-[13.5px] text-ink-dim">Inga bilder hittades för "{searched}". Prova ett annat sökord — gärna på engelska.</p>
          )}
          {!searched && !loading && !error && (
            <p className="text-[13.5px] text-ink-dim">Sök på det du vill ha bilder av. Engelska sökord ger ofta fler träffar.</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onPick(p); onClose(); }}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-bg text-left"
                title={`Använd fotot av ${p.photographer}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbUrl} alt={p.alt} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.photographer}
                </span>
              </button>
            ))}
          </div>
          {loading && <p className="text-[13px] text-ink-dim mt-3">Söker …</p>}
          {!loading && page < totalPages && (
            <button type="button" onClick={() => search(searched, page + 1)} className="mt-4 text-[13.5px] font-semibold underline">
              Visa fler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
