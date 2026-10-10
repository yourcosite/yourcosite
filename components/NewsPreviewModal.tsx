"use client";

import { useEffect, useState } from "react";
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
  onPublished: (a: NewsArticle, published: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [assisting, setAssisting] = useState(false);
  const articleId = article?.id;

  // Nollställ redigeringsfälten när en ny artikel öppnas.
  useEffect(() => {
    setEditing(false);
    setError("");
    setInstruction("");
    setTitle(article?.title ?? "");
    setExcerpt(article?.excerpt ?? "");
    setText(article?.body ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  if (!article) return null;
  const live = isArticleLive(article);
  const dirty = title !== article.title || excerpt !== (article.excerpt ?? "") || text !== article.body;
  // Förhandsvisningen visar alltid det som just nu står i fälten.
  const shown: NewsArticle = { ...article, title: title || article.title, excerpt, body: text || article.body };

  async function save(publishNow: boolean) {
    if (!article) return;
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { siteId };
      if (dirty) Object.assign(payload, { title, excerpt, body: text });
      if (publishNow) payload.published = true;
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Det gick inte att spara.");
      onPublished(data.article, publishNow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Det gick inte att spara.");
    } finally {
      setBusy(false);
    }
  }

  async function askMillie() {
    if (!article || !instruction.trim()) return;
    setAssisting(true);
    setError("");
    try {
      const res = await fetch("/api/news/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, title, body: text, category: article.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Millie kunde inte hjälpa just nu.");
      if (data.title) setTitle(data.title);
      if (typeof data.excerpt === "string") setExcerpt(data.excerpt);
      if (data.body) setText(data.body);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Millie kunde inte hjälpa just nu.");
    } finally {
      setAssisting(false);
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
            previewArticle={shown}
            newsArticles={[shown]}
            onNavigate={() => {}}
          />
        </div>
        {editing && (
          <div className="px-6 py-4 border-t border-line max-h-[40vh] overflow-y-auto space-y-3">
            <div>
              <label className="text-[12.5px] font-semibold block mb-1">Be Millie skriva om</label>
              <div className="flex gap-2">
                <input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") askMillie(); }}
                  placeholder="T.ex. gör den kortare och mer personlig"
                  className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-[14px]"
                />
                <button
                  type="button"
                  onClick={askMillie}
                  disabled={assisting || !instruction.trim()}
                  className="text-[13.5px] font-semibold px-3 py-2 rounded-lg bg-accent text-accent-ink disabled:opacity-60 whitespace-nowrap"
                >
                  {assisting ? "Skriver…" : "Skriv om"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-semibold block mb-1">Rubrik</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px]" />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold block mb-1">Kort ingress</label>
              <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px]" />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold block mb-1">Text</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] leading-relaxed" />
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-t border-line flex flex-wrap items-center justify-end gap-3">
          {error && <span className="text-[13px] text-red-600 mr-auto">{error}</span>}
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-[14px] font-semibold px-4 py-2 rounded-lg border border-line">
            {editing ? "Dölj redigering" : "✏️ Redigera"}
          </button>
          {dirty && (
            <button type="button" onClick={() => save(false)} disabled={busy} className="text-[14px] font-semibold px-4 py-2 rounded-lg border border-line disabled:opacity-60">
              Spara ändringar
            </button>
          )}
          <button type="button" onClick={onClose} className="text-[14px] font-semibold px-4 py-2 rounded-lg border border-line">
            {live ? "Stäng" : "Behåll som utkast"}
          </button>
          {!live && (
            <button
              type="button"
              onClick={() => save(true)}
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
