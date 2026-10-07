"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StockPhotoModal from "@/components/StockPhotoModal";
import { withCredit } from "@/lib/stockPhotos";
import { DEFAULT_NEWS_CATEGORY, type NewsArticle } from "@/lib/newsArticles";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const NEW_CATEGORY_VALUE = "__new__";

type ComposerState = {
  id: string | null; // null = ny artikel
  title: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  category: string;
  // Tomt = ingen schemaläggning. Annars en datetime-local-sträng
  // ("ÅÅÅÅ-MM-DDTTT:mm") kunden valt — se save() för hur den styr vilken
  // åtgärd huvudknappen utför.
  scheduledAt: string;
};

function emptyComposer(defaultCategory: string): ComposerState {
  return { id: null, title: "", excerpt: "", body: "", imageUrl: "", category: defaultCategory, scheduledAt: "" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
// Minsta tillåtna värde för <input type="datetime-local"> (lokal tid, utan
// sekunder/tidszon) — en minut fram, så man inte råkar "schemalägga" något
// som redan är förfallet.
function minDateTimeLocal() {
  const d = new Date(Date.now() + 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function NewsClient({
  initialArticles,
  initialCategories,
  siteId,
}: {
  initialArticles: NewsArticle[];
  initialCategories: string[];
  siteId: string;
}) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [assistOpen, setAssistOpen] = useState(false);
  const [assistInstruction, setAssistInstruction] = useState("");
  const [assisting, setAssisting] = useState(false);
  const [assistError, setAssistError] = useState("");

  const openNew = () => {
    setError("");
    setAddingCategory(false);
    setAssistOpen(false);
    setComposer(emptyComposer(categories[0] || DEFAULT_NEWS_CATEGORY));
  };
  const openEdit = (a: NewsArticle) => {
    setError("");
    setAddingCategory(false);
    setAssistOpen(false);
    setComposer({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || "",
      body: a.body,
      imageUrl: a.image_url || "",
      category: a.category || DEFAULT_NEWS_CATEGORY,
      scheduledAt: a.scheduled_at ? a.scheduled_at.slice(0, 16) : "",
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

  const askMillie = async () => {
    if (!composer) return;
    setAssisting(true);
    setAssistError("");
    try {
      const res = await fetch("/api/news/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: assistInstruction,
          title: composer.title,
          body: composer.body,
          category: composer.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte hämta ett förslag.");
      setComposer((prev) =>
        prev ? { ...prev, title: data.title || prev.title, excerpt: data.excerpt || prev.excerpt, body: data.body || prev.body } : prev
      );
      setAssistOpen(false);
      setAssistInstruction("");
    } catch (e: any) {
      setAssistError(e.message || "Kunde inte hämta ett förslag.");
    } finally {
      setAssisting(false);
    }
  };

  // mode: "draft" avpublicerar/avschemalägger uttryckligen (ett medvetet
  // steg tillbaka), "schedule" kräver att composer.scheduledAt är ifyllt,
  // "publish" går live direkt.
  const save = async (mode: "draft" | "schedule" | "publish") => {
    if (!composer) return;
    if (!composer.title.trim()) {
      setError("Artikeln behöver en rubrik.");
      return;
    }
    if (!composer.body.trim()) {
      setError("Artikeln behöver text.");
      return;
    }
    if (mode === "schedule" && !composer.scheduledAt) {
      setError("Välj ett datum och klockslag att schemalägga till.");
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
        published: mode === "publish",
        scheduledAt: mode === "schedule" ? new Date(composer.scheduledAt).toISOString() : null,
        siteId,
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
      setCategories((prev) => (prev.includes(data.article.category) ? prev : [...prev, data.article.category]));
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
      body: JSON.stringify({ published: !a.published, siteId }),
    });
    const data = await res.json();
    if (res.ok) {
      setArticles((prev) => prev.map((x) => (x.id === a.id ? data.article : x)));
    }
  };

  const confirmDelete = async (a: NewsArticle) => {
    const res = await fetch(`/api/news/${a.id}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
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
          const status = a.published
            ? `Publicerad ${a.published_at ? formatDate(a.published_at) : ""}`
            : a.scheduled_at
            ? `Schemalagd till ${formatDateTime(a.scheduled_at)}`
            : "Utkast";
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
                    {a.category} · {status}
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

            {!composer.id && (
              <div className="bg-accent-soft border border-line rounded-lg px-3.5 py-3 mb-4 text-[12.5px] leading-relaxed">
                <div className="font-semibold mb-0.5">Så skriver du en nyhet</div>
                Börja med att skriva en kort text i rutan längre ner. Behöver du hjälp? Klicka på{" "}
                <b>✨ Be Millie om hjälp med texten</b> och skriv att du vill att hon ska <b>utöka texten</b> eller{" "}
                <b>skriva om den</b> — då sätter hon även en rubrik och en ingress åt dig.
              </div>
            )}

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
            {addingCategory ? (
              <div className="flex items-center gap-2 mb-4">
                <input
                  autoFocus
                  value={composer.category}
                  onChange={(e) => setComposer({ ...composer, category: e.target.value })}
                  className="flex-1 border border-line rounded-lg px-3 py-2 text-[14px]"
                  placeholder="Namnge en ny kategori"
                  maxLength={40}
                />
                <button
                  onClick={() => setAddingCategory(false)}
                  className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg flex-shrink-0"
                >
                  Klar
                </button>
              </div>
            ) : (
              <select
                value={composer.category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY_VALUE) {
                    setComposer({ ...composer, category: "" });
                    setAddingCategory(true);
                  } else {
                    setComposer({ ...composer, category: e.target.value });
                  }
                }}
                className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-4 bg-bg"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>+ Ny kategori…</option>
              </select>
            )}

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
              <>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) uploadImage(file);
                }}
                className={`flex items-center justify-center gap-2.5 border-2 border-dashed rounded-xl px-4 py-5 mb-2 text-[13px] font-semibold cursor-pointer transition-colors ${
                  dragOver ? "border-ink bg-accent-soft text-ink" : "border-line text-ink-dim"
                } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M12 16V4" />
                  <path d="M6.5 9.5 12 4l5.5 5.5" />
                  <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                </svg>
                {uploading ? "Laddar upp…" : "Lägg till bild — klicka eller dra hit en fil"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setStockOpen(true)}
                className="text-[12.5px] font-semibold text-ink-dim underline mb-4"
              >
                Eller sök gratis stockbilder
              </button>
              </>
            )}
            <StockPhotoModal
              open={stockOpen}
              onClose={() => setStockOpen(false)}
              onPick={(photo) =>
                setComposer((prev) =>
                  prev
                    ? { ...prev, imageUrl: withCredit(photo.url, { name: photo.photographer, profileUrl: photo.profileUrl }) }
                    : prev
                )
              }
            />

            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12.5px] font-semibold text-ink-dim">Text</label>
              <button
                onClick={() => setAssistOpen((v) => !v)}
                className="text-[12px] font-semibold text-ink-dim flex items-center gap-1"
              >
                ✨ Be Millie om hjälp med texten
              </button>
            </div>

            {assistOpen && (
              <div className="border border-line rounded-lg p-3 mb-2.5 bg-bg">
                <input
                  value={assistInstruction}
                  onChange={(e) => setAssistInstruction(e.target.value)}
                  placeholder={composer.body ? "T.ex. utöka texten, skriv om den eller gör den kortare" : "Vad ska nyheten handla om?"}
                  className="w-full border border-line rounded-lg px-3 py-2 text-[13.5px] mb-2 bg-surface"
                />
                {composer.body.trim() && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {["Utöka texten", "Skriv om den", "Gör den kortare", "Gör den mer personlig"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAssistInstruction(c)}
                        className="text-[12px] font-semibold bg-surface border border-line rounded-full px-2.5 py-1"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11.5px] text-ink-dim mb-2.5">Millie sätter också rubrik och ingress åt dig.</p>
                {assistError && <p className="text-[12.5px] text-warm font-semibold mb-2">{assistError}</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAssistOpen(false)} className="text-[12.5px] font-semibold text-ink-dim px-3 py-1.5">
                    Avbryt
                  </button>
                  <button
                    onClick={askMillie}
                    disabled={assisting || (!assistInstruction.trim() && !composer.body.trim())}
                    className="text-[12.5px] font-bold text-accent-ink bg-accent px-3.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {assisting ? "Skriver…" : "Skriv med Millie"}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={composer.body}
              onChange={(e) => setComposer({ ...composer, body: e.target.value })}
              rows={8}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-4"
              placeholder="Hela artikeln. Lämna en tom rad mellan stycken."
            />

            <label className="block text-[12.5px] font-semibold text-ink-dim mb-1.5">
              Schemalägg publicering <span className="font-normal">(valfritt)</span>
            </label>
            <input
              type="datetime-local"
              value={composer.scheduledAt}
              min={minDateTimeLocal()}
              onChange={(e) => setComposer({ ...composer, scheduledAt: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-[14px] mb-1.5 bg-bg"
            />

            {error && <p className="text-[13px] text-warm font-semibold mb-3 mt-1.5">{error}</p>}

            <div className="flex items-center justify-end gap-2.5 mt-3">
              <button onClick={closeComposer} className="text-[13px] font-semibold text-ink-dim px-4 py-2">
                Avbryt
              </button>
              <button
                onClick={() => save("draft")}
                disabled={saving || uploading}
                className="text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
              >
                Spara utkast
              </button>
              {composer.scheduledAt ? (
                <button
                  onClick={() => save("schedule")}
                  disabled={saving || uploading}
                  className="text-[13px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-full"
                >
                  Schemalägg
                </button>
              ) : (
                <button
                  onClick={() => save("publish")}
                  disabled={saving || uploading}
                  className="text-[13px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-full"
                >
                  Publicera
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
