"use client";

import { useState } from "react";
import SitePreview from "@/components/SitePreview";
import type { SiteContent } from "@/lib/contentModel";
import { isArticleLive, type NewsArticle } from "@/lib/newsArticles";

// Visas direkt när Millie skapat en nyhet: kunden ser artikeln som en
// besökare skulle se den och väljer att publicera eller behålla som utkast.
export default function NewsPreviewModal({
  article,
  content,
  siteName,
  siteId,
  onClose,
  onPublished,
}: {
  article: NewsArticle | null;
  content: SiteContent;
  siteName?: string;
  siteId?: string;
  onClose: () => void;
  onPublished: (a: NewsArticle) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!article) return null;
  const live = isArticleLive(article);

  async function publish() {
    if (!article) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, published: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Det gick inte att publicera.");
      onPublished(data.article);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Det gick inte att publicera.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Förhandsgranska nyhet"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[860px] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-[19px] font-medium">Så här ser nyheten ut 📰</h2>
            <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
              {live ? "Nyheten är publicerad och syns för besökarna." : "Nyheten är än så länge ett utkast som bara du ser."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng" className="text-[22px] leading-none text-ink-dim px-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <SitePreview
            content={content}
            siteName={siteName}
            activePath="/"
            previewArticle={article}
            newsArticles={[article]}
            onNavigate={() => {}}
          />
        </div>
        <div className="px-6 py-4 border-t border-line flex flex-wrap items-center justify-end gap-3">
          {error && <span className="text-[13px] text-red-600 mr-auto">{error}</span>}
          <button type="button" onClick={onClose} className="text-[14px] font-semibold px-4 py-2 rounded-lg border border-line">
            {live ? "Stäng" : "Behåll som utkast"}
          </button>
          {!live && (
            <button
              type="button"
              onClick={publish}
              disabled={busy}
              className="text-[14px] font-semibold px-4 py-2 rounded-lg bg-accent text-accent-ink disabled:opacity-60"
            >
              {busy ? "Publicerar…" : "Publicera nu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
