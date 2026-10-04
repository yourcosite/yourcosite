"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NEWS_CATEGORIES, DEFAULT_NEWS_CATEGORY, type NewsArticle } from "@/lib/newsArticles";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type ComposerState = {
  id: string | null; // null = ny artikel
  title: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  category: string;
};

const emptyComposer: ComposerState = {
  id: null,
  title: "",
  excerpt: "",
  body: "",
  imageUrl: "",
  category: DEFAULT_NEWS_CATEGORY,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

export default function NewsClient({ initialArticles }: { initialArticles: NewsArticle[] }) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setError("");
    setComposer({ ...emptyComposer });
  };
  const openEdit = (a: NewsArticle) => {
    setError("");
    setComposer({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || "",
      body: a.body,
      imageUrl: a.image_url || "",
      category: a.category || DEFAULT_NEWS_CATEGORY,
    });
  };
  const closeComposer = () => setComposer(null);

  const uploadImage = async (file: File) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Bilden måste vara PNG, JPG, WEBP eller GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Bilden är större än ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du är inte inloggad längre — ladda om sidan.");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/nyhet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(uploadError.message);
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      setComposer((prev) => (prev ? { ...prev, imageUrl: pub.publicUrl } : prev));
    } catch (e: any) {
      setError(e.message || "Kunde inte ladda upp bilden.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    if (!composer) return;
    if (!composer.title.trim()) {
      setError("Artikeln behöver en rubrik.");
      return;
    }
    if (!composer.body.trim()) {
      setError("Artikeln behöver text.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: composer.title,
        excerpt: composer.excerpt,
        body: composer.body,
        imageUrl: composer.imageUrl || null,
        category: composer.category,
        published: publish,
      };
      const res = await fetch(composer.id ? `/api/news/${composer.id}` : "/api/news", {
        method: composer.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte spara artikeln.");
      setArticles((prev) => {
        const next = prev.filter((a) => a.id !== data.article.id);
        return [data.article, ...next].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
      setComposer(null);
    } catch (e: any) {
      setError(e.message || "Kunde inte spara artikeln.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (a: NewsArticle) => {
    const res = await fetch(`/api/news/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !a.published }),
    });
    const data = await res.json();
    if (res.ok) {
      setArticles((prev) => prev.map((x) => (x.id === a.id ? data.article : x)));
    }
  };

  const confirmDelete = async (a: NewsArticle) => {
    const res = await fetch(`/api/news/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setArticles((prev) => prev.filter((x) => x.id !== a.id));
    }
    setPendingDeleteId(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-5">
        {articles.length === 0 && (
          <p className="text-[13.5px] text-ink-dim border border-line rounded-xl px-4 py-5 text-center">
            Inga artiklar än.
          </p>
        )}
        {articles.map((a) => {
          const confirming = pendingDeleteId === a.id;
          return (
            <div key={a.id} className="border border-line rounded-xl px-4 py-3.5 bg-surface">
              <div className="flex items-center gap-3">
                {a.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-accent-soft flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] truncate">{a.title}</div>
                  <div className="text-[12px] text-ink-dim mt-0.5">
                    {a.category} · {a.published ? `Publicerad ${a.published_at ? formatDate(a.published_at) : ""}` : "Utkast"}
                  </div>
                </div>
                {!confirming && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => togglePublished(a)}
                      className="text-[12.5px] font-semibold text-ink px-3 py-1.5 border border-line rounded-lg"
                    >
                      {a.published ? "Avpublicera" : "Publicera"}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="text-[12.5px] font-semibold text-ink px-3 py-1.5 border border-line rounded-lg"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(a.id)}
                      aria-label={`Ta bort ${a.title}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-dim flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                )}
                {confirming && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      className="text-[12.5px] font-semibold text-ink-dim px-3 py-1.5 border border-line rounded-lg"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={() => confirmDelete(a)}
                      className="text-[12.5px] font-bold text-white bg-warm px-3 py-1.5 rounded-lg"
                    >
                      Ta bort permanent
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={openNew} className="flex items-center gap-2 text-ink font-semibold text-[13.5px] py-1.5">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Ny artikel
      </button>

      {composer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={closeComposer}>
          <div
            className="bg-surface rounded-2xl w-full max-w-[560px] max-h-[88vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[18px] font-semibold mb-4">{composer.id ? "Redigera artikel" : "Ny artikel"}</h2>

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">Rubrik</label>
            <input
              value={composer.title}
              onChange={(e) => setComposer({ ...composer, title: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-4"
              placeholder="T.ex. Vi utökar öppettiderna"
            />

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">
              Ingress <span className="font-normal">(kort text som visas i listan, valfritt)</span>
            </label>
            <input
              value={composer.excerpt}
              onChange={(e) => setComposer({ ...composer, excerpt: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-4"
              placeholder="En rad som sammanfattar artikeln"
            />

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">Kategori</label>
            <select
              value={composer.category}
              onChange={(e) => setComposer({ ...composer, category: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-4 bg-bg"
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">Bild (valfri)</label>
            {composer.imageUrl ? (
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={composer.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <button
                  onClick={() => setComposer({ ...composer, imageUrl: "" })}
                  className="text-[12.5px] font-semibold text-ink-dim underline"
                >
                  Ta bort bild
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                disabled={uploading}
                className="text-[13px] mb-4"
              />
            )}

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">Text</label>
            <textarea
              value={composer.body}
              onChange={(e) => setComposer({ ...composer, body: e.target.value })}
              rows={8}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-1.5"
              placeholder="Hela artikeln. Lämna en tom rad mellan stycken."
            />

            {error && <p className="text-[13px] text-warm font-semibold mb-3">{error}</p>}

            <div className="flex items-center justify-end gap-2.5 mt-3">
              <button onClick={closeComposer} className="text-[13px] font-semibold text-ink-dim px-4 py-2">
                Avbryt
              </button>
              <button
                onClick={() => save(false)}
                disabled={saving || uploading}
                className="text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
              >
                Spara utkast
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving || uploading}
                className="text-[13px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-full"
              >
                Publicera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
