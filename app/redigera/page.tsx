"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Millie from "@/components/Millie";
import SitePreview from "@/components/SitePreview";
import ContactSupportModal from "@/components/ContactSupportModal";
import TrackingSettingsModal from "@/components/TrackingSettingsModal";
import { createClient } from "@/lib/supabase/client";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import type { NewsArticle } from "@/lib/newsArticles";

type ChatMessage = {
  from: "user" | "bot";
  text: string;
  attachmentNames?: string[];
  // Satt på bot-svar när Claude flaggat "unsupported" (se
  // /api/sites/edit) — innehållsmodellen stöder helt enkelt inte
  // önskemålet (t.ex. bakgrundsfärg per enskild sida). requestText är
  // kundens ursprungliga önskemål, sparat för att kunna förifylla
  // "Skicka önskemål till oss"-rutan med rätt sammanhang.
  unsupported?: boolean;
  requestText?: string;
};

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

// Något kunden klickat på i förhandsvisningen (se components/SitePreview.tsx,
// "Klicka för att välja") — hålls som en chip ovanför chattrutan tills
// nästa meddelande skickas, så Millie vet exakt vad ett otydligt "byt
// bilden"/"ändra texten här" syftar på (se selection i /api/sites/edit).
// "image" = en specifik bild, "field" = ETT textfält (rubrik, brödtext,
// ett citat …), "section" = hela sektionen (bakgrund eller när ingen av de
// två ovan träffades — t.ex. ett klick mellan två textrader).
type Selection =
  | { target: "image"; key: string; pagePath: string; sectionId: string; kind: "hero" | "gridItem" | "galleryItem"; itemIndex?: number; label: string }
  | { target: "field"; key: string; pagePath: string; sectionId: string; field: string; label: string }
  | { target: "section"; key: string; pagePath: string; sectionId: string; label: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
// Flera bilder på en gång är framförallt till för att fylla ett bildspel/
// galleri i ett svep — ingen anledning att tillåta hur många som helst i
// ett och samma meddelande.
const MAX_ATTACHMENTS = 10;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PLAIN_TEXT_TYPES = ["text/plain", "text/markdown"];
const EXTRACTABLE_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Millie, maskoten som "sköter" redigeringen — texterna växlar medan ett
// svar väntas in så det känns som att hon faktiskt gör något, inte att
// sidan bara hänger (se intervallet i EditorPage nedan).
const THINKING_PHRASES = [
  "Millie tänker…",
  "Millie hjälper dig nu",
  "Millie gör sin magi",
  "Millie uppdaterar sidan",
  "Millie finslipar detaljerna",
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
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "Hej, jag heter Millie! 👋 Enklast är att säga vilken sida du menar och sedan tydligt vad du vill ändra eller lägga till — t.ex. \"På startsidan, byt rubriken till …\" eller \"Lägg till en ruta efter Om oss med texten … och en knapp som länkar till kontaktsidan\". Du kan också klicka direkt på en bild, ett textstycke eller en hel sektion i förhandsvisningen till vänster för att markera precis vad du menar, innan du skriver. Jag uppdaterar sajten åt dig direkt.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);

  // Låter chattrutan växa med texten (upp till max-h i klassen på
  // textarean) istället för att gömma det mesta av ett längre meddelande
  // bakom en enda rad.
  useEffect(() => {
    const el = draftInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // Växlar vilken av THINKING_PHRASES som visas medan Millie jobbar, så det
  // inte känns som samma stillastående text hela vägen — se Millie röra sig
  // i components/Millie.tsx (animate-millie-bounce/-hair, "active"-läget).
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    if (!sending) {
      setPhraseIndex(0);
      return;
    }
    const id = setInterval(() => setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length), 1600);
    return () => clearInterval(id);
  }, [sending]);

  const [selection, setSelection] = useState<Selection | null>(null);

  // Flera bilagor samtidigt (t.ex. en hel hög bilder till ett nytt
  // bildgalleri) — se handleFiles nedan.
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Skicka önskemål till oss"-rutan som dyker upp när Millie stöter på
  // ett önskemål innehållsmodellen inte stöder (se unsupported ovan).
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportDraft, setSupportDraft] = useState({ message: "", context: "" });
  const [trackingOpen, setTrackingOpen] = useState(false);

  // Under md-brytpunkten får förhandsvisningen och chatten inte plats sida
  // vid sida (chattpanelen är 400px fast bredd) — mobilView styr vilken av
  // de två som visas, växlat med flikarna strax under headern. Båda
  // panelerna ligger kvar i DOM:en hela tiden (bara dolda med CSS), så
  // chatthistorik/scrollposition osv. inte tappas när man växlar.
  const [mobileView, setMobileView] = useState<"preview" | "chat">("preview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    // Så "newsList"-sektionen kan visa kundens egna artiklar i
    // förhandsvisningen här också — se app/nyheter/page.tsx där de
    // skrivs och publiceras.
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setNewsArticles(data.articles || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Laddar upp EN fil och returnerar dess Attachment — kastar med ett
  // svenskt felmeddelande om något går fel. handleFiles nedan kör den här
  // för varje vald fil i tur och ordning.
  const uploadOneFile = async (file: File): Promise<Attachment> => {
    const isImage = IMAGE_TYPES.includes(file.type);
    const isPlainText = PLAIN_TEXT_TYPES.includes(file.type) || /\.(txt|md)$/i.test(file.name);
    const isExtractableDoc = EXTRACTABLE_DOC_TYPES.includes(file.type);

    if (!isImage && !isPlainText && !isExtractableDoc) {
      throw new Error(`${file.name}: filtypen stöds inte — använd en bild (PNG/JPG/WEBP/GIF), PDF, Word (.docx) eller en textfil.`);
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    if (file.size > maxBytes) {
      throw new Error(`${file.name}: filen är större än ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Du är inte inloggad längre — ladda om sidan.");

    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw new Error(`Gick inte att ladda upp ${file.name}: ${uploadError.message}`);
    const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);

    if (isImage) {
      return { kind: "image", url: pub.publicUrl, name: file.name, mimeType: file.type };
    }

    if (isPlainText) {
      const text = await file.text();
      return { kind: "document", url: pub.publicUrl, name: file.name, mimeType: file.type || "text/plain", text };
    }

    // PDF/Word kräver serverkod för att läsa ut texten.
    const res = await fetch("/api/sites/attachments/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: pub.publicUrl, mimeType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Kunde inte läsa ${file.name}.`);
    return { kind: "document", url: pub.publicUrl, name: file.name, mimeType: file.type, text: data.text };
  };

  // Tar emot EN ELLER FLERA valda filer på en gång (t.ex. en hög bilder till
  // ett nytt bildgalleri) — laddar upp dem i tur och ordning och lägger till
  // dem i samma bilage-lista. En fil som misslyckas stoppar inte de andra;
  // felet visas, men det som faktiskt gick bra läggs ändå till.
  const handleFiles = async (files: File[]) => {
    setAttachError("");
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachError(`Max ${MAX_ATTACHMENTS} bilagor i samma meddelande.`);
      return;
    }
    const toUpload = files.slice(0, room);
    if (files.length > toUpload.length) {
      setAttachError(`Max ${MAX_ATTACHMENTS} bilagor i samma meddelande — tog med de första ${toUpload.length}.`);
    }

    setAttaching(true);
    const uploaded: Attachment[] = [];
    const errors: string[] = [];
    for (const file of toUpload) {
      try {
        uploaded.push(await uploadOneFile(file));
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    if (uploaded.length > 0) setAttachments((prev) => [...prev, ...uploaded]);
    if (errors.length > 0) setAttachError(errors.join(" "));
    setAttaching(false);
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || sending || attaching) return;
    const history = messages;
    const currentAttachments = attachments;
    const currentSelection = selection;
    setMessages((m) => [
      ...m,
      {
        from: "user",
        text: text || "(bifogad fil)",
        attachmentNames: currentAttachments.length > 0 ? currentAttachments.map((a) => a.name) : undefined,
      },
    ]);
    setDraft("");
    setAttachments([]);
    setSelection(null);
    setSending(true);
    try {
      const res = await fetch("/api/sites/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            text ||
            (currentAttachments.length === 1
              ? `Se bifogad fil: ${currentAttachments[0].name}`
              : `Se bifogade filer: ${currentAttachments.map((a) => a.name).join(", ")}`),
          history,
          attachments: currentAttachments,
          currentPath: activePath,
          selection: currentSelection
            ? currentSelection.target === "image"
              ? {
                  target: "image",
                  pagePath: currentSelection.pagePath,
                  sectionId: currentSelection.sectionId,
                  kind: currentSelection.kind,
                  itemIndex: currentSelection.itemIndex,
                  label: currentSelection.label,
                }
              : currentSelection.target === "field"
              ? {
                  target: "field",
                  pagePath: currentSelection.pagePath,
                  sectionId: currentSelection.sectionId,
                  field: currentSelection.field,
                  label: currentSelection.label,
                }
              : {
                  target: "section",
                  pagePath: currentSelection.pagePath,
                  sectionId: currentSelection.sectionId,
                  label: currentSelection.label,
                }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setContent(data.content);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: data.summary || "Klart!",
          unsupported: !!data.unsupported,
          requestText: text || currentAttachments.map((a) => a.name).join(", "),
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Det gick inte: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between px-3.5 md:px-6 py-3.5 border-b border-line bg-surface flex-shrink-0 relative">
        <div className="flex items-center gap-2.5 md:gap-5 min-w-0">
          <Link
            href="/dashboard"
            title="Tillbaka till kundzonen"
            className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink bg-bg border border-line px-2.5 md:px-3 py-1.5 rounded-full flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {/* Loggan intill räcker som varumärke på en smal skärm — "Kundzon"
                i klartext tar bara plats som den fasta "← Kundzon"-knappen
                redan ger genom ikonen. */}
            <span className="hidden sm:inline">Kundzon</span>
          </Link>
          <div className="hidden md:block w-px h-5.5 bg-line" />
          <div className="hidden md:block">
            <Logo light={false} />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{site?.name || "Din sajt"}</div>
            <div className="text-[11.5px] text-ink-dim truncate">
              {site ? (site.status === "live" ? "Live" : "Utkast") : "…"}
              {site?.domain ? ` · ${site.domain}` : " · ingen domän ännu"}
            </div>
          </div>
        </div>

        {/* Desktop: alla knappar synliga i rad. Under md-brytpunkten finns
            inte plats för fyra separata knappar bredvid sajtnamnet, så de
            samlas istället i en meny (se nedan). */}
        <div className="hidden md:flex items-center gap-3.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setTrackingOpen(true)}
            title="Analys och marknadsföring (Google Analytics, Meta Pixel)"
            aria-label="Sajtinställningar"
            className="w-[34px] h-[34px] rounded-full border border-line bg-bg flex items-center justify-center text-ink-dim flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <Link href="/sidor" className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Sidor
          </Link>
          <Link
            href="/forhandsgranska"
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

        {/* Mobil: samma fyra åtgärder, samlade bakom en enda meny-knapp. */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Fler alternativ"
          aria-expanded={mobileMenuOpen}
          className="md:hidden w-9 h-9 rounded-lg border border-line bg-bg flex items-center justify-center text-ink flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full right-3.5 mt-1.5 w-[230px] bg-surface border border-line rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.14)] p-1.5 z-30">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setTrackingOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              Analys och marknadsföring
            </button>
            <Link
              href="/sidor"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              Sidor
            </Link>
            <Link
              href="/forhandsgranska"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              Förhandsgranska
            </Link>
            <div className="h-px bg-line my-1.5" />
            <div className="px-3 py-2 text-[12.5px] text-ink-dim leading-relaxed">
              Publicera (kommer snart) — publicering till en riktig domän byggs i ett senare steg.
            </div>
          </div>
        )}
      </div>

      {/* Mobil: flikar för att växla mellan förhandsvisning och chatt — de
          får inte plats sida vid sida under md (se mobileView ovan). */}
      <div className="md:hidden flex border-b border-line bg-surface flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          className={`flex-1 text-center text-[13px] font-semibold py-2.5 border-b-2 ${
            mobileView === "preview" ? "border-ink text-ink" : "border-transparent text-ink-dim"
          }`}
        >
          Sajten
        </button>
        <button
          type="button"
          onClick={() => setMobileView("chat")}
          className={`flex-1 text-center text-[13px] font-semibold py-2.5 border-b-2 ${
            mobileView === "chat" ? "border-ink text-ink" : "border-transparent text-ink-dim"
          }`}
        >
          Chatta med Millie
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${mobileView === "preview" ? "flex" : "hidden"} md:flex flex-1 bg-[#E5E3DD] items-center justify-center p-3.5 md:p-7 overflow-hidden`}
        >
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
                    <div className="bg-ink text-white text-[12.5px] font-semibold pl-2 pr-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                      <Millie active size={26} />
                      {THINKING_PHRASES[phraseIndex]}
                    </div>
                  </div>
                )}
                <SitePreview
                  content={content}
                  siteName={site?.name}
                  activePath={activePath}
                  onNavigate={(path) => {
                    // Byter kunden sida medan något är markerat, ta bort
                    // markeringen — den syftade på innehåll på den gamla
                    // sidan, och att låta den "hänga kvar" skulle kunna
                    // ställa chattens nästa ändring på fel sida.
                    setSelection(null);
                    setActivePath(path);
                  }}
                  privacyPolicyMode={site?.privacy_policy_mode}
                  privacyPolicyFileUrl={site?.privacy_policy_file_url}
                  privacyPolicyText={site?.privacy_policy_text}
                  newsArticles={newsArticles}
                  editable
                  selectedImageKey={selection?.target === "image" ? selection.key : null}
                  onSelectImage={(sel) =>
                    setSelection((prev) => (prev?.key === sel.key ? null : { target: "image", ...sel }))
                  }
                  selectedSectionKey={selection?.target === "section" ? selection.key : null}
                  onSelectSection={(sel) =>
                    setSelection((prev) => (prev?.key === sel.key ? null : { target: "section", ...sel }))
                  }
                  selectedFieldKey={selection?.target === "field" ? selection.key : null}
                  onSelectField={(sel) =>
                    setSelection((prev) => (prev?.key === sel.key ? null : { target: "field", ...sel }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div
          className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex w-full md:w-[400px] border-l-0 md:border-l border-line bg-surface flex-col flex-shrink-0`}
        >
          <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
            <Millie size={28} />
            <div>
              <div className="font-semibold text-[14.5px]">Chatta med Millie</div>
              <div className="text-[12px] text-ink-dim mt-0.5">Säg vilken sida du menar, och vad du vill ändra eller lägga till.</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4.5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.from === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                {m.from === "bot" && <Millie size={22} />}
                <div
                  className={`max-w-[260px] text-[13.5px] leading-relaxed px-3.5 py-2.5 ${
                    m.from === "user"
                      ? "bg-accent text-accent-ink rounded-[14px_14px_4px_14px]"
                      : "bg-bg rounded-[14px_14px_14px_4px]"
                  }`}
                >
                  {m.attachmentNames && m.attachmentNames.length > 0 && (
                    <div className={`text-[12px] mb-1 flex items-center gap-1 ${m.from === "user" ? "text-accent-ink/70" : "text-ink-dim"}`}>
                      📎 {m.attachmentNames.join(", ")}
                    </div>
                  )}
                  {m.text}
                  {m.unsupported && (
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDraft({
                          message: m.requestText ? `Jag vill kunna: ${m.requestText}` : "",
                          context: `Önskemål i chattredigeraren: "${m.requestText || ""}"\nMillies svar: "${m.text}"`,
                        });
                        setSupportOpen(true);
                      }}
                      className="mt-2.5 block text-[12.5px] font-semibold underline text-ink"
                    >
                      Skicka önskemålet till oss →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="self-start flex items-end gap-2">
                <Millie active size={22} />
                <div className="bg-bg rounded-[14px_14px_14px_4px] text-[13.5px] text-ink-dim px-3.5 py-2.5">
                  {THINKING_PHRASES[phraseIndex]}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-line">
            {attachError && <p className="text-[12px] text-red-600 mb-2">{attachError}</p>}
            {selection && (
              <div className="flex items-center gap-2 bg-accent-soft border border-line rounded-lg px-3 py-2 mb-2">
                <span className="text-[14px] flex-shrink-0">
                  {selection.target === "image" ? "🖼️" : selection.target === "field" ? "✏️" : "📝"}
                </span>
                <span className="text-[12.5px] truncate flex-1">
                  Vald: {selection.label}
                </span>
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  aria-label="Ta bort markeringen"
                  className="text-[13px] text-ink-dim font-bold flex-shrink-0 px-1"
                >
                  ×
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2">
                    {a.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                    ) : (
                      <span className="text-[14px] flex-shrink-0">📄</span>
                    )}
                    <span className="text-[12.5px] truncate flex-1">{a.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Ta bort bilagan"
                      className="text-[13px] text-ink-dim font-bold flex-shrink-0 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2.5 bg-bg border border-line rounded-xl py-1.5 pl-2 pr-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,text/plain,text/markdown,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) handleFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attaching || !content}
                aria-label="Bifoga filer"
                title="Bifoga en eller flera bilder/textdokument — t.ex. flera bilder på en gång till ett bildgalleri"
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 text-ink-dim disabled:opacity-60 mb-[1px]"
              >
                {attaching ? (
                  <span className="text-[11px]">…</span>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                )}
              </button>
              <textarea
                ref={draftInputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter skickar, Shift+Enter gör en ny rad — precis som i
                  // de flesta chattverktyg.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Skriv till Millie …"
                disabled={sending || !content}
                rows={1}
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim disabled:opacity-60 resize-none py-1.5 leading-[1.4] max-h-[160px] overflow-y-auto"
              />
              <button
                onClick={send}
                disabled={sending || attaching || !content || (!draft.trim() && attachments.length === 0)}
                aria-label="Skicka"
                className="w-[34px] h-[34px] rounded-[9px] bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-60 mb-[1px]"
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

      <ContactSupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        source="chattredigerare"
        context={supportDraft.context}
        defaultMessage={supportDraft.message}
        siteId={site?.id}
        title="Skicka önskemål till oss"
        intro="Millie kan inte fixa det här själv än, men vi läser alla önskemål — skriv gärna lite mer om vad du vill kunna göra."
      />

      <TrackingSettingsModal
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        gaMeasurementId={content?.gaMeasurementId}
        metaPixelId={content?.metaPixelId}
        onSaved={(values) =>
          setContent((c) => (c ? { ...c, gaMeasurementId: values.gaMeasurementId, metaPixelId: values.metaPixelId } : c))
        }
      />
    </div>
  );
}
