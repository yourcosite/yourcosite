"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Millie from "@/components/Millie";
import SitePreview from "@/components/SitePreview";
import ContactSupportModal from "@/components/ContactSupportModal";
import TrackingSettingsModal from "@/components/TrackingSettingsModal";
import StockPhotoModal, { type StockPhoto } from "@/components/StockPhotoModal";
import ImageEditorModal from "@/components/ImageEditorModal";
import WhatsNewModal, { WHATS_NEW_SEEN_KEY } from "@/components/WhatsNewModal";
import { WHATS_NEW } from "@/lib/whatsNew";
import MillieHelpModal, { MILLIE_HELP_SEEN_KEY } from "@/components/MillieHelpModal";
import { createClient } from "@/lib/supabase/client";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import type { NewsArticle } from "@/lib/newsArticles";
import NewsPreviewModal from "@/components/NewsPreviewModal";

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
  // Förslag kunden kan klicka på för att fylla i meddelanderutan.
  chips?: string[];
  // Millies kontrollfråga: svarsalternativ som skickas direkt vid klick.
  // Visas bara på det SISTA meddelandet och sparas inte i historiken.
  options?: string[];
  // Visas men sparas inte i historiken (presentation, hälsning, tips).
  transient?: boolean;
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
  // Bara för stockbilder (Unsplash) — fotografen, som sparas på sajten och
  // visas i sidfoten.
  credit?: { name: string; profileUrl: string };
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
// "Välkommen tillbaka" — en slumpas varje gång man öppnar redigeraren igen.
const WELCOME_BACK = [
  "Välkommen tillbaka! Jag har hållit din sajt varm åt dig. 🔥",
  "Där är du ju! Jag har suttit här och polerat rubrikerna medan du var borta.",
  "Hej igen! Jag hann nästan sakna dig. Nästan.",
  "Tjena! Kaffet är kallt men sajten är redo. ☕ Vad ska vi fixa idag?",
  "Välkommen åter! Jag har inte rört något. Jag lovar. (Okej, jag tittade lite.)",
  "Där satt den! Fint att se dig igen, vad ska vi förbättra den här gången?",
  "Hej och välkommen tillbaka! Jag har värmt upp tangentbordet. ⌨️",
  "Åh, du kom tillbaka! Då kör vi. Berätta vad du vill ändra.",
  "Hallå där! Jag låg och drömde om perfekta marginaler. Vad kan jag göra för dig?",
  "Välkommen tillbaka, chefen! Din sajt väntar, och det gör jag också. 😄",
];

const THINKING_PHRASES = [
  "Millie tänker…",
  "Millie hjälper dig nu",
  "Millie gör sin magi",
  "Millie uppdaterar sidan",
  "Millie finslipar detaljerna",
  "Millie sorterar pixlarna",
  "Millie debuggar designen",
  "Millie rätar ut raderna",
  "Millie hittar rätt ord",
  "Millie pysslar lite",
  "Millie optimerar layouten",
  "Millie läser ritningen",
  "Millie mixar färgerna",
  "Millie flyttar på saker",
  "Millie polerar rubrikerna",
  "Millie kompilerar idéerna",
  "Millie dubbelkollar",
  "Millie fixar till det",
  "Millie renderar sidan",
  "Millie snurrar ett varv",
  "Millie trollar med koden",
  "Millie tänker extra noga",
  "Millie synkar med molnet",
  "Millie knådar texten",
  "Millie parsar texten",
  "Millie kör en build",
  "Millie cachar bilderna",
  "Millie komprimerar pixlar",
  "Millie refaktorerar",
  "Millie indexerar sidan",
  "Millie laddar om hjärnan",
  "Millie uppdaterar databasen",
  "Millie validerar sidan",
  "Millie deployar glädje",
  "Millie gör det åt dig",
  "Millie tar hand om det",
  "Millie ger det kärlek",
  "Millie gör det fint",
  "Millie håller tummarna",
  "Millie tänker på dig",
  "Millie satsar helhjärtat",
  "Millie älskar det här",
  "Millie ordnar det snart",
  "Millie fixar det här",
];

// Slumpad ordning varje gång Millie börjar jobba, så det inte blir samma
// fraser i samma följd. Håll fraserna korta (max ca 25 tecken) — de får
// plats på en rad i den fasta chattbubblan.
function shuffledPhraseOrder(): number[] {
  const order = THINKING_PHRASES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

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
  const [previewNewsId, setPreviewNewsId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      transient: true,
      text: "Hej, jag heter Millie! 👋 Enklast är att säga vilken sida du menar och sedan tydligt vad du vill ändra eller lägga till — t.ex. \"På startsidan, byt rubriken till …\" eller \"Lägg till en ruta efter Om oss med texten … och en knapp som länkar till kontaktsidan\". Du kan också klicka direkt på en bild, ett textstycke eller en hel sektion i förhandsvisningen till vänster för att markera precis vad du menar, innan du skriver. Jag uppdaterar sajten åt dig direkt.",
    },
  ]);
  // De senaste versionerna av sajten före Millies ändringar, för "Ångra".
  const [undoStack, setUndoStack] = useState<SiteContent[]>([]);
  const [undoing, setUndoing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);

  // Diktering: mikrofonknappen låter kunden prata in meddelandet på svenska.
  // Webbläsarens egen taligenkänning (Web Speech API) — gratis, men saknas i
  // t.ex. Firefox; då visas ingen knapp. Texten fylls i rutan så kunden kan
  // läsa igenom och ändra innan hen skickar.
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    const w = window as any;
    setMicSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recognitionRef.current?.abort?.();
  }, []);
  const stopListening = () => {
    recognitionRef.current?.stop?.();
  };
  const toggleListening = () => {
    if (listening) return stopListening();
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return;
    setMicError(null);
    const rec = new Rec();
    rec.lang = "sv-SE";
    rec.continuous = true;
    rec.interimResults = true;
    // Det som redan står i rutan behålls; det som sägs läggs till efter.
    const base = draft && !/\s$/.test(draft) ? draft + " " : draft;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setDraft((base + finalText + interim).replace(/\s+/g, " ").trimStart());
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicError("Webbläsaren fick inte använda mikrofonen. Tillåt den i adressfältet och försök igen.");
      } else if (e.error === "no-speech") {
        setMicError("Jag hörde inget. Försök igen och prata nära mikrofonen.");
      } else if (e.error !== "aborted") {
        setMicError("Mikrofonen fungerade inte just nu. Du kan skriva istället.");
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      draftInputRef.current?.focus();
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

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
  const [phraseOrder, setPhraseOrder] = useState<number[]>(() => THINKING_PHRASES.map((_, i) => i));
  const thinkingPhrase = THINKING_PHRASES[phraseOrder[phraseIndex % phraseOrder.length]];
  useEffect(() => {
    if (!sending) {
      setPhraseIndex(0);
      return;
    }
    setPhraseOrder(shuffledPhraseOrder());
    const id = setInterval(() => setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length), 1600);
    return () => clearInterval(id);
  }, [sending]);

  // Förloppsindikator medan Millie jobbar. Det finns ingen riktig
  // procentsiffra att få från AI:n, så stapeln är en uppskattning: den
  // rör sig snabbt i början och saktar in mot ~93 % (en vanlig ändring
  // tar ungefär en kvart sekunder), och fylls till 100 % när svaret kommer.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!sending) return;
    setProgress(0.03);
    const start = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - start) / 1000;
      setProgress(Math.min(0.93, 0.03 + 0.9 * (1 - Math.exp(-t / 7))));
    }, 200);
    return () => clearInterval(id);
  }, [sending]);

  const [selection, setSelection] = useState<Selection | null>(null);

  // Flera bilagor samtidigt (t.ex. en hel hög bilder till ett nytt
  // bildgalleri) — se handleFiles nedan.
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [stockOpen, setStockOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  // Prick på "Nytt"-knappen tills kunden öppnat rutan efter senaste nyheten.
  const [hasUnseenNews, setHasUnseenNews] = useState(false);
  useEffect(() => {
    try {
      setHasUnseenNews(localStorage.getItem(WHATS_NEW_SEEN_KEY) !== WHATS_NEW[0]?.id);
    } catch {
      setHasUnseenNews(false);
    }
  }, []);
  const openNews = () => {
    setNewsOpen(true);
    setHasUnseenNews(false);
    try {
      localStorage.setItem(WHATS_NEW_SEEN_KEY, WHATS_NEW[0]?.id || "");
    } catch {
      // localStorage kan vara blockerat — pricken visas då igen nästa gång.
    }
  };
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Skicka önskemål till oss"-rutan som dyker upp när Millie stöter på
  // ett önskemål innehållsmodellen inte stöder (se unsupported ovan).
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportDraft, setSupportDraft] = useState({ message: "", context: "", wish: false });
  const [trackingOpen, setTrackingOpen] = useState(false);

  // Under md-brytpunkten får förhandsvisningen och chatten inte plats sida
  // vid sida (chattpanelen är 400px fast bredd) — mobilView styr vilken av
  // de två som visas, växlat med flikarna strax under headern. Båda
  // panelerna ligger kvar i DOM:en hela tiden (bara dolda med CSS), så
  // chatthistorik/scrollposition osv. inte tappas när man växlar.
  const [mobileView, setMobileView] = useState<"preview" | "chat">("preview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Vilken sajt som ska öppnas — skickas med som ?site=<id> från
    // kundzonen (app/dashboard/DashboardClient.tsx) så att varje sajt-kort
    // faktiskt öppnar SIN egen sajt på ett konto med flera. Läses rått ur
    // URL:en av samma skäl som "sida" nedan (slipper ett Suspense-krav).
    let requestedSiteId = "";
    try {
      requestedSiteId = new URLSearchParams(window.location.search).get("site") || "";
    } catch {
      // Ignorera — faller tillbaka på "senaste sajten" som innan.
    }

    fetch(`/api/sites/mine${requestedSiteId ? `?id=${encodeURIComponent(requestedSiteId)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setLoadError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSite(data.site);
        if (isValidSiteContent(data.site.content)) {
          setContent(data.site.content);
          // Satt av "Sidor"-panelen (app/sidor/page.tsx) när kunden precis
          // skapat en ny sida där och klickar sig hit direkt — hoppar
          // förhandsvisningen direkt till den nya (tomma) sidan istället
          // för startsidan, så den är redo för Millie utan ett extra klick
          // i menyn. Läses rått ur URL:en (inte next/navigations
          // useSearchParams) för att slippa ett Suspense-krav på en annars
          // helt statisk sida.
          try {
            const requested = new URLSearchParams(window.location.search).get("sida");
            if (requested && data.site.content.pages.some((p: { path: string }) => p.path === requested)) {
              setActivePath(requested);
            }
          } catch {
            // Ignorera — startsidan visas som vanligt.
          }
        } else {
          setLoadError("Sajtens innehåll kunde inte läsas.");
        }
      })
      .catch(() => setLoadError("Kunde inte hämta sajten."));

    // Så "newsList"-sektionen kan visa kundens egna artiklar i
    // förhandsvisningen här också — se app/nyheter/page.tsx där de
    // skrivs och publiceras.
    fetch(`/api/news${requestedSiteId ? `?siteId=${encodeURIComponent(requestedSiteId)}` : ""}`)
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

  const pickStockPhoto = (photo: StockPhoto) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachError(`Max ${MAX_ATTACHMENTS} bilagor i samma meddelande.`);
      return;
    }
    setAttachError("");
    setAttachments((prev) => [
      ...prev,
      {
        kind: "image",
        url: photo.url,
        name: `Stockbild: ${photo.alt || "foto"} (${photo.photographer})`.slice(0, 100),
        mimeType: "image/jpeg",
        credit: { name: photo.photographer, profileUrl: photo.profileUrl },
      },
    ]);
    draftInputRef.current?.focus();
  };

  // Chattens historia sparas i webbläsaren per sajt (de senaste 20
  // ändringarna, alltså 40 meddelanden) så den finns kvar när man laddar om.
  // Den inledande presentationen, hälsningen och tipsen är "transient" och
  // sparas inte. Finns historik visas en "välkommen tillbaka"-hälsning
  // (en av tio, aldrig samma två gånger i rad) i stället för presentationen.
  const chatKey = site?.id ? `yourcosite-chat-${site.id}` : null;
  const chatRestored = useRef(false);
  // Förra besökets sista "sedd"-tid, läst innan den här sidan hunnit skriva över den.
  const prevSeenRef = useRef(0);
  useEffect(() => {
    if (!chatKey || !content || chatRestored.current || !site?.id) return;
    let cancelled = false;
    (async () => {
      let stored: ChatMessage[] = [];
      const valid = (list: any): ChatMessage[] =>
        Array.isArray(list)
          ? list.filter((m: any) => m && (m.from === "user" || m.from === "bot") && typeof m.text === "string")
          : [];
      // 1) Servern (följer med mellan dator och mobil)
      try {
        const res = await fetch(`/api/sites/chat?siteId=${encodeURIComponent(site.id)}`);
        if (res.ok) {
          const data = await res.json();
          stored = valid(data.messages);
        }
      } catch {
        // Ingen kontakt — prova webbläsarens egen kopia.
      }
      let lastGreeting = -1;
      let hintSeen = false;
      // Var kunden här alldeles nyss (t.ex. tillbaka från Nyheter-fliken)?
      // Då visas bara historiken, utan ny hälsning.
      let justBack = false;
      const last = prevSeenRef.current;
      justBack = last > 0 && Date.now() - last < 30 * 60 * 1000;
      try {
        // 2) Webbläsarens kopia, om servern inte hade något (eller saknar kolumnen)
        if (stored.length === 0) {
          const raw = JSON.parse(localStorage.getItem(chatKey) || "null");
          stored = valid(raw?.messages);
        }
        lastGreeting = Number(localStorage.getItem(`${chatKey}-greeting`) ?? -1);
        hintSeen = localStorage.getItem(`${chatKey}-hint`) === "1";
      } catch {
        // Blockerad lagring — då börjar chatten om som vanligt.
      }
      if (cancelled) return;
      chatRestored.current = true;
      const next: ChatMessage[] = [];
      if (stored.length > 0) {
        next.push(...stored);
        if (!justBack) {
          let g = Math.floor(Math.random() * WELCOME_BACK.length);
          if (g === lastGreeting) g = (g + 1) % WELCOME_BACK.length;
          try {
            localStorage.setItem(`${chatKey}-greeting`, String(g));
          } catch {}
          next.push({ from: "bot", text: WELCOME_BACK[g], transient: true });
        }
      }
      // Förstasidan har exempelinnehåll (citat, nyckeltal, frågor) — Millie
      // nämner det en enda gång per sajt.
      if (content.exampleContent && !hintSeen) {
        try {
          localStorage.setItem(`${chatKey}-hint`, "1");
        } catch {}
        next.push({
          from: "bot",
          transient: true,
          text: "Obs: förstasidan har exempeltexter som jag lagt dit för att visa vad som går att ha — kundcitat, nyckeltal och vanliga frågor. De är påhittade, så byt ut dem mot era egna eller ta bort dem innan ni publicerar.",
          chips: [
            "Byt ut exempelcitaten mot mina egna",
            "Ta bort alla exempelcitat",
            "Ta bort nyckeltalen",
            "Ta bort vanliga frågor",
          ],
        });
      }
      if (next.length > 0) {
        // Finns historik ersätter den presentationen; annars behålls
        // presentationen och ett eventuellt tips läggs efter.
        setMessages((m) => (stored.length > 0 ? next : [...m, ...next]));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey, !!content]);

  // Håller koll på när kunden senast var i redigeraren (se justBack ovan).
  useEffect(() => {
    if (!chatKey) return;
    try {
      prevSeenRef.current = Number(localStorage.getItem(`${chatKey}-lastseen`) ?? 0);
    } catch {}
    const mark = () => {
      try {
        localStorage.setItem(`${chatKey}-lastseen`, String(Date.now()));
      } catch {}
    };
    mark();
    const t = setInterval(mark, 20000);
    window.addEventListener("pagehide", mark);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", mark);
      mark();
    };
  }, [chatKey]);

  useEffect(() => {
    if (!chatKey || !chatRestored.current) return;
    const toSave = messages.filter((m) => !m.transient).slice(-40).map(({ options, ...rest }) => rest);
    if (toSave.length === 0) return; // skriv aldrig över sparad historik med tomt
    try {
      localStorage.setItem(chatKey, JSON.stringify({ messages: toSave }));
    } catch {
      // Full eller blockerad lagring — webbläsarkopian sparas helt enkelt inte.
    }
    // Servern (dator och mobil delar historik) — dröjsmål så flera
    // meddelanden i rad blir ett enda anrop. Misslyckas det är
    // webbläsarkopian fortfarande kvar.
    const siteIdForSave = site?.id;
    const timer = setTimeout(() => {
      fetch("/api/sites/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: siteIdForSave, messages: toSave }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [messages, chatKey]);

  // Hjälpen öppnas av sig själv de tre första gångerna redigeraren visas
  // (räknas i webbläsaren), därefter bara via "Tips"-knappen.
  useEffect(() => {
    if (!content) return;
    try {
      const seen = parseInt(localStorage.getItem(MILLIE_HELP_SEEN_KEY) || "0", 10) || 0;
      if (seen < 3) {
        localStorage.setItem(MILLIE_HELP_SEEN_KEY, String(seen + 1));
        setHelpOpen(true);
      }
    } catch {
      // localStorage kan vara blockerat — då visas hjälpen bara via knappen.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!content]);

  const undo = async () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous || undoing || sending) return;
    setUndoing(true);
    try {
      const res = await fetch("/api/sites/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site?.id, content: previous }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setContent(data.content);
      setUndoStack((st) => st.slice(0, -1));
      setMessages((m) => [...m, { from: "bot", text: "Klart, jag har ångrat din senaste ändring." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Det gick inte att ångra: ${e.message}` }]);
    } finally {
      setUndoing(false);
    }
  };

  // Bildredigeraren: öppnas för den markerade bilden. Resultatet laddas upp
  // till kundens egen mapp och byts in på exakt den bilden — utan AI.
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const selectedImageUrl = (() => {
    if (!content || selection?.target !== "image") return null;
    const section = content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId) as any;
    if (!section) return null;
    if (selection.kind === "hero") return (section.imageUrl as string | undefined) || null;
    return (section.items?.[selection.itemIndex ?? -1]?.imageUrl as string | undefined) || null;
  })();
  const saveEditedImage = async (blob: Blob) => {
    if (selection?.target !== "image" || !content) return;
    const sel = selection;
    setSavingImage(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du är inte inloggad längre — ladda om sidan.");
      const path = `${user.id}/edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw new Error(`Gick inte att ladda upp bilden: ${uploadError.message}`);
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      const res = await fetch("/api/sites/replace-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site?.id,
          imageUrl: pub.publicUrl,
          selection: { pagePath: sel.pagePath, sectionId: sel.sectionId, kind: sel.kind, itemIndex: sel.itemIndex },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setUndoStack((st) => [...st.slice(-9), content]);
      setContent(data.content);
      setImageEditorOpen(false);
      setSelection(null);
      setMessages((m) => [...m, { from: "bot", text: `Klart! Jag har sparat den redigerade bilden (${sel.label}). Du kan ångra med knappen om du ändrar dig.` }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Bilden kunde inte sparas: ${e.message}` }]);
      setImageEditorOpen(false);
    } finally {
      setSavingImage(false);
    }
  };

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if ((!text && attachments.length === 0) || sending || attaching) return;
    recognitionRef.current?.abort?.();
    setListening(false);
    setMicError(null);
    const history = messages.filter((m) => !m.transient);
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
          siteId: site?.id,
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
      const isQuestion = Array.isArray(data.options) && data.options.length >= 2;
      if (!isQuestion) {
        if (content) setUndoStack((st) => [...st.slice(-9), content]);
        setContent(data.content);
      }
      // Millie kan ha skapat en ny nyhetsartikel i samma svar (se
      // app/api/sites/edit/route.ts) — lägg in den i listan direkt så en
      // "newsList"-sektion i förhandsvisningen visar den utan omladdning.
      if (data.newsArticle) {
        setNewsArticles((prev) => [data.newsArticle, ...prev.filter((a) => a.id !== data.newsArticle.id)]);
        setPreviewNewsId(data.newsArticle.id);
      }
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: data.summary || "Klart!",
          unsupported: !!data.unsupported,
          options: isQuestion ? data.options : undefined,
          requestText: text || currentAttachments.map((a) => a.name).join(", "),
        },
        // Varning från servern (t.ex. en nyhet utan nyhetslista att visas i)
        // kommer som ett eget meddelande, med klickbara förslag.
        ...(data.warning
          ? [
              {
                from: "bot" as const,
                text: `⚠️ ${data.warning}`,
                options: Array.isArray(data.followUp) && data.followUp.length > 0 ? data.followUp : undefined,
              },
            ]
          : []),
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Det gick inte: ${e.message}` }]);
    } finally {
      // Fyll stapeln till 100 % en kort stund så det känns avslutat.
      setProgress(1);
      await new Promise((r) => setTimeout(r, 350));
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
          <Link href={`/sidor${site ? `?site=${site.id}` : ""}`} className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Sidor
          </Link>
          <Link href={`/nyheter${site ? `?site=${site.id}` : ""}`} className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Nyheter
          </Link>
          <Link
            href={`/forhandsgranska${site ? `?site=${site.id}` : ""}`}
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
              href={`/sidor${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              Sidor
            </Link>
            <Link
              href={`/nyheter${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              Nyheter
            </Link>
            <Link
              href={`/forhandsgranska${site ? `?site=${site.id}` : ""}`}
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
                      <div className="w-[230px]">
                        <div className="truncate">{thinkingPhrase}</div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-white/25 overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                      </div>
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
            <div className="min-w-0">
              <div className="font-semibold text-[14.5px]">Chatta med Millie</div>
              <div className="text-[12px] text-ink-dim mt-0.5">Säg vilken sida du menar, och vad du vill ändra eller lägga till.</div>
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={openNews}
                title="Se vad som är nytt"
                className="relative text-[12.5px] font-semibold text-ink bg-bg border border-line rounded-full px-3 py-1.5"
              >
                ✨ Nytt
                {hasUnseenNews && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-surface" aria-label="Nya nyheter" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="Se vad du kan be Millie om"
                className="text-[12.5px] font-semibold text-ink bg-bg border border-line rounded-full px-3 py-1.5"
              >
                💡 Tips
              </button>
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
                  {m.chips && m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.chips.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setDraft(c);
                            draftInputRef.current?.focus();
                          }}
                          className="text-[12px] font-semibold bg-surface border border-line rounded-full px-2.5 py-1 text-ink"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.options && m.options.length > 0 && i === messages.length - 1 && !sending && (
                    <div className="flex flex-col gap-1.5 mt-2.5">
                      {m.options.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => send(o)}
                          className="text-left text-[12.5px] font-semibold bg-surface border border-line rounded-xl px-3 py-2 text-ink hover:border-ink"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.unsupported && (
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDraft({
                          message: m.requestText ? `Jag vill kunna: ${m.requestText}` : "",
                          context: `Önskemål i chattredigeraren: "${m.requestText || ""}"\nMillies svar: "${m.text}"`,
                          wish: false,
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
                <div className="bg-bg rounded-[14px_14px_14px_4px] text-[13.5px] text-ink-dim px-3.5 py-2.5 w-[250px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{thinkingPhrase}</span>
                    <span className="text-[12px] font-semibold tabular-nums w-9 text-right flex-shrink-0">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-line">
            {attachError && <p className="text-[12px] text-red-600 mb-2">{attachError}</p>}
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={undo}
                disabled={undoing || sending}
                className="mb-2 text-[12.5px] font-semibold text-ink bg-bg border border-line rounded-full px-3 py-1.5 disabled:opacity-60"
              >
                {undoing ? "Ångrar …" : "↩ Ångra senaste ändringen"}
              </button>
            )}
            {selection && (
              <div className="flex items-center gap-2 bg-accent-soft border border-line rounded-lg px-3 py-2 mb-2">
                <span className="text-[14px] flex-shrink-0">
                  {selection.target === "image" ? "🖼️" : selection.target === "field" ? "✏️" : "📝"}
                </span>
                <span className="text-[12.5px] truncate flex-1">
                  Vald: {selection.label}
                </span>
                {selection.target === "image" && selectedImageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageEditorOpen(true)}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-surface border border-line rounded-full px-2.5 py-1 text-ink flex-shrink-0 disabled:opacity-60"
                  >
                    ✂️ Redigera bild
                  </button>
                )}
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
            {micError && (
              <div className="text-[12px] text-red-600 px-1 pb-1.5" role="status">
                {micError}
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
              <button
                type="button"
                onClick={() => setStockOpen(true)}
                disabled={sending || attaching || !content}
                aria-label="Sök stockbilder"
                title="Sök gratis stockbilder"
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 text-ink-dim disabled:opacity-60 mb-[1px]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={sending || attaching || !content}
                  aria-label={listening ? "Sluta lyssna" : "Prata in meddelandet"}
                  aria-pressed={listening}
                  title={listening ? "Tryck för att sluta lyssna" : "Prata in ditt meddelande (svenska)"}
                  className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 disabled:opacity-60 mb-[1px] ${
                    listening ? "bg-red-500 text-white animate-pulse" : "text-ink-dim"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0014 0" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                </button>
              )}
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
                placeholder={listening ? "Jag lyssnar … prata på" : "Skriv till Millie …"}
                disabled={sending || !content}
                rows={1}
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim disabled:opacity-60 resize-none py-1.5 leading-[1.4] max-h-[160px] overflow-y-auto"
              />
              <button
                onClick={() => send()}
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

      {content && (
        <NewsPreviewModal
          article={newsArticles.find((a) => a.id === previewNewsId) || null}
          content={content}
          siteName={site?.name}
          siteId={site?.id}
          onClose={() => setPreviewNewsId(null)}
          onPublished={(a) => {
            setNewsArticles((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setMessages((m) => [...m, { from: "bot", text: "Nyheten är publicerad! 🎉" }]);
          }}
        />
      )}
      <WhatsNewModal
        open={newsOpen}
        onClose={() => setNewsOpen(false)}
        onTry={(text) => {
          setDraft(text);
          draftInputRef.current?.focus();
        }}
        onWish={() => {
          setSupportDraft({ message: "", context: "Önskemål om ny funktion (från Nytt-rutan i redigeraren)", wish: true });
          setSupportOpen(true);
        }}
      />
      <MillieHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onPick={(text) => {
          setDraft(text);
          draftInputRef.current?.focus();
        }}
      />
      {selectedImageUrl && (
        <ImageEditorModal
          open={imageEditorOpen}
          src={selectedImageUrl}
          saving={savingImage}
          onClose={() => setImageEditorOpen(false)}
          onSave={saveEditedImage}
        />
      )}
      <StockPhotoModal open={stockOpen} onClose={() => setStockOpen(false)} onPick={pickStockPhoto} />

      <ContactSupportModal
        key={`${supportDraft.wish}-${supportDraft.context}`}
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        source="chattredigerare"
        context={supportDraft.context}
        defaultMessage={supportDraft.message}
        siteId={site?.id}
        title={supportDraft.wish ? "Önska en ny funktion" : "Skicka önskemål till oss"}
        intro={
          supportDraft.wish
            ? "Vad skulle du vilja kunna göra på din sajt som du inte kan idag? Beskriv gärna så konkret du kan – vi läser alla förslag."
            : "Millie kan inte fixa det här själv än, men vi läser alla önskemål — skriv gärna lite mer om vad du vill kunna göra."
        }
      />

      <TrackingSettingsModal
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        gaMeasurementId={content?.gaMeasurementId}
        metaPixelId={content?.metaPixelId}
        siteId={site?.id}
        onSaved={(values) =>
          setContent((c) => (c ? { ...c, gaMeasurementId: values.gaMeasurementId, metaPixelId: values.metaPixelId } : c))
        }
      />
    </div>
  );
}
