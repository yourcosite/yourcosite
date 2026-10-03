"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SitePreview from "@/components/SitePreview";
import { createClient } from "@/lib/supabase/client";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";

type ChatMessage = { from: "user" | "bot"; text: string; attachmentName?: string };

// Bilagor i chatten: bilder skickas till Claude som en riktig bild (den kan
// t.ex. föreslå var den passar, eller — ber kunden om det uttryckligen —
// sättas som en sektions imageUrl, se attachmentNote i /api/sites/edit).
// Textdokument (.txt/.md läses direkt i webbläsaren, .pdf/.docx via
// /api/sites/attachments/extract eftersom de kräver serverkod) skickas som
// ren text — aldrig som rå fil till AI:n.
type Attachment = {
  kind: "image" | "document";
  url: string;
  name: string;
  mimeType: string;
  text?: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PLAIN_TEXT_TYPES = ["text/plain", "text/markdown"];
const EXTRACTABLE_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type SiteMeta = {
  id: string;
  name: string;
  domain: string | null;
  status: "draft" | "live" | "pausad";
  privacy_policy_mode: "uploaded" | "generated" | null;
  privacy_policy_file_url: string | null;
  privacy_policy_text: string | null;
};

// Chattredigeraren — till skillnad från /webbplats (som bara VISAR sajten,
// i en iframe) renderar den här kundens RIKTIGA SitePreview direkt i
// sidan (ingen iframe), så ett AI-svar kan uppdatera "content"-state och
// förhandsvisningen uppdateras ögonblickligen utan omladdning. Sidbyte i
// menyn sker via onNavigate (se SitePreview/Header) istället för riktiga
// länkar, av samma skäl — annars tappas hela chatt-historiken vid varje
// klick.
export default function EditorPage() {
  const [site, setSite] = useState<SiteMeta | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activePath, setActivePath] = useState("/");
  const [loadError, setLoadError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "Hej! Skriv vad du vill ändra — t.ex. \"byt rubriken på startsidan\" eller \"lägg till en sektion om våra tjänster\". Jag uppdaterar sajten åt dig direkt.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/sites/mine")
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setLoadError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSite(data.site);
        if (isValidSiteContent(data.site.content)) setContent(data.site.content);
        else setLoadError("Sajtens innehåll kunde inte läsas.");
      })
      .catch(() => setLoadError("Kunde inte hämta sajten."));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleFile = async (file: File) => {
    setAttachError("");
    const isImage = IMAGE_TYPES.includes(file.type);
    const isPlainText = PLAIN_TEXT_TYPES.includes(file.type) || /\.(txt|md)$/i.test(file.name);
    const isExtractableDoc = EXTRACTABLE_DOC_TYPES.includes(file.type);

    if (!isImage && !isPlainText && !isExtractableDoc) {
      setAttachError("Filtypen stöds inte — använd en bild (PNG/JPG/WEBP/GIF), PDF, Word (.docx) eller en textfil.");
      return;
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    if (file.size > maxBytes) {
      setAttachError(`Filen är större än ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      return;
    }

    setAttaching(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du är inte inloggad längre — ladda om sidan.");

      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(`Gick inte att ladda upp: ${uploadError.message}`);
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

      if (isImage) {
        setAttachment({ kind: "image", url: pub.publicUrl, name: file.name, mimeType: file.type });
        return;
      }

      if (isPlainText) {
        const text = await file.text();
        setAttachment({ kind: "document", url: pub.publicUrl, name: file.name, mimeType: file.type || "text/plain", text });
        return;
      }

      // PDF/Word kräver serverkod för att läsa ut texten.
      const res = await fetch("/api/sites/attachments/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: pub.publicUrl, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte läsa filen.");
      setAttachment({ kind: "document", url: pub.publicUrl, name: file.name, mimeType: file.type, text: data.text });
    } catch (e: any) {
      setAttachError(e.message);
    } finally {
      setAttaching(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachment) || sending || attaching) return;
    const history = messages;
    const currentAttachment = attachment;
    setMessages((m) => [
      ...m,
      { from: "user", text: text || "(bifogad fil)", attachmentName: currentAttachment?.name },
    ]);
    setDraft("");
    setAttachment(null);
    setSending(true);
    try {
      const res = await fetch("/api/sites/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || `Se bifogad fil: ${currentAttachment?.name}`,
          history,
          attachment: currentAttachment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setContent(data.content);
      setMessages((m) => [...m, { from: "bot", text: data.summary || "Klart!" }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Det gick inte: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">{site?.name || "Din sajt"}</div>
            <div className="text-[11.5px] text-ink-dim">
              {site ? (site.status === "live" ? "Live" : "Utkast") : "…"}
              {site?.domain ? ` · ${site.domain}` : " · ingen domän ännu"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <Link href="/sidor" className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Sidor
          </Link>
          <Link
            href="/webbplats"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13.5px] font-semibold text-ink border border-line px-4 py-2.5 rounded-lg"
          >
            Förhandsgranska
          </Link>
          <button
            type="button"
            disabled
            title="Publicering till en riktig domän byggs i ett senare steg"
            className="text-[13.5px] font-semibold text-ink-dim bg-bg border border-line px-4.5 py-2.5 rounded-lg cursor-not-allowed opacity-70"
          >
            Publicera (kommer snart)
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-[#E5E3DD] flex items-center justify-center p-7 overflow-hidden">
          {loadError && (
            <div className="bg-white rounded-2xl p-10 text-center text-ink-dim text-[14.5px] max-w-[420px]">
              {loadError}{" "}
              <Link href="/onboarding/1" className="font-semibold underline">
                Gå till onboardingen
              </Link>
            </div>
          )}

          {!loadError && !content && (
            <div className="bg-white rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">Hämtar din sajt …</div>
          )}

          {content && (
            <div className="w-full h-full max-w-[1400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
              <div className="h-[38px] bg-[#F1EFE9] flex items-center gap-1.5 px-3.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
                <div className="flex-1 text-center text-[11.5px] text-ink-dim truncate px-2">
                  {site?.name?.toLowerCase().replace(/\s+/g, "")}.yourcosite.com{activePath !== "/" ? activePath : ""}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto relative">
                {sending && (
                  <div className="absolute inset-0 bg-white/40 z-40 flex items-start justify-center pt-10 pointer-events-none">
                    <div className="bg-ink text-white text-[12.5px] font-semibold px-4 py-2 rounded-full shadow-lg">
                      Uppdaterar sajten …
                    </div>
                  </div>
                )}
                <SitePreview
                  content={content}
                  siteName={site?.name}
                  activePath={activePath}
                  onNavigate={setActivePath}
                  privacyPolicyMode={site?.privacy_policy_mode}
                  privacyPolicyFileUrl={site?.privacy_policy_file_url}
                  privacyPolicyText={site?.privacy_policy_text}
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-[400px] border-l border-line bg-surface flex flex-col flex-shrink-0">
          <div className="px-5 py-4 border-b border-line">
            <div className="font-semibold text-[14.5px]">Be om ändringar</div>
            <div className="text-[12px] text-ink-dim mt-0.5">Skriv precis som du skulle till en kollega.</div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4.5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-[13.5px] leading-relaxed px-3.5 py-2.5 ${
                  m.from === "user"
                    ? "self-end bg-accent text-accent-ink rounded-[14px_14px_4px_14px]"
                    : "self-start bg-bg rounded-[14px_14px_14px_4px]"
                }`}
              >
                {m.attachmentName && (
                  <div className={`text-[12px] mb-1 flex items-center gap-1 ${m.from === "user" ? "text-accent-ink/70" : "text-ink-dim"}`}>
                    📎 {m.attachmentName}
                  </div>
                )}
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="self-start bg-bg rounded-[14px_14px_14px_4px] text-[13.5px] text-ink-dim px-3.5 py-2.5">
                Tänker …
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-line">
            {attachError && <p className="text-[12px] text-red-600 mb-2">{attachError}</p>}
            {attachment && (
              <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2 mb-2">
                {attachment.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                ) : (
                  <span className="text-[14px] flex-shrink-0">📄</span>
                )}
                <span className="text-[12.5px] truncate flex-1">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Ta bort bilagan"
                  className="text-[13px] text-ink-dim font-bold flex-shrink-0 px-1"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl py-1.5 pl-2 pr-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,text/plain,text/markdown,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attaching || !content}
                aria-label="Bifoga fil"
                title="Bifoga en bild eller ett textdokument"
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 text-ink-dim disabled:opacity-60"
              >
                {attaching ? (
                  <span className="text-[11px]">…</span>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                )}
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Be om en ändring …"
                disabled={sending || !content}
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim disabled:opacity-60"
              />
              <button
                onClick={send}
                disabled={sending || attaching || !content || (!draft.trim() && !attachment)}
                aria-label="Skicka"
                className="w-[34px] h-[34px] rounded-[9px] bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0C1004" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
