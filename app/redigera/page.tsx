"use client";

import MenuStyleThumb, { type MenuStyleId } from "@/components/MenuStyleThumb";
import { rich } from "@/lib/i18n/rich";
import { msg } from "@/lib/i18n/config";
import { useT, useLocale } from "@/components/I18nProvider";
import { BCP47 } from "@/lib/i18n/country";
import { LOCALE_NAMES } from "@/lib/i18n/config";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Millie from "@/components/Millie";
import SitePreview, { FieldEditContext } from "@/components/SitePreview";

// Förhandsvisningen är tung (hela sajten ritas). Den memoiseras så att den
// INTE ritas om för varje tecken man skriver i chatten eller varje tick i
// förloppsstapeln, bara när sajtens innehåll eller markeringen ändras.
const MemoSitePreview = memo(SitePreview);
import ContactSupportModal from "@/components/ContactSupportModal";
import TrackingSettingsModal from "@/components/TrackingSettingsModal";
import MyImagesModal, { type MyImage } from "@/components/MyImagesModal";
import StockPhotoModal, { type StockPhoto } from "@/components/StockPhotoModal";
import ImageEditorModal from "@/components/ImageEditorModal";
import WhatsNewModal, { WHATS_NEW_SEEN_KEY } from "@/components/WhatsNewModal";
import { WHATS_NEW } from "@/lib/whatsNew";
import MillieHelpModal, { MILLIE_HELP_SEEN_KEY } from "@/components/MillieHelpModal";
import { createClient } from "@/lib/supabase/client";
import { isValidSiteContent, GRID_LAYOUTS, GALLERY_LAYOUTS, TEAM_LAYOUTS, MENU_LAYOUTS, MAX_GALLERY_IMAGES, MAX_TEAM_MEMBERS, MAX_MENU_CATEGORIES, MAX_MENU_ITEMS, MENU_TAGS, type GalleryLayout, type GridLayout, type TeamLayout, type MenuLayout, type SiteContent } from "@/lib/contentModel";
import GridLayoutThumb from "@/components/GridLayoutThumb";
import { GridIcon, GRID_ICON_IDS, iconsForItems } from "@/lib/gridIcons";
import type { NewsArticle } from "@/lib/newsArticles";
import NewsPreviewModal from "@/components/NewsPreviewModal";
import { getFieldText, getLinkValue, getNewTab, getStat, linkFieldFor, textFieldFor } from "@/lib/fieldPath";

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
  // Förhandsbild per alternativ (menystilar), samma ordning som options.
  optionPreviews?: MenuStyleId[];
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

const GRID_LAYOUT_LABELS: Record<GridLayout, string> = {
  cards: msg("Kort"),
  "alternating-rows": msg("Växlande rader"),
  list: msg("Lista"),
  numbered: msg("Numrerad"),
  bento: msg("Mosaik"),
  "icon-row": msg("Ikonrad"),
  "divided-columns": msg("Avdelade kolumner"),
  "intro-divided": msg("Intro och kolumner"),
  "icon-cards": msg("Ikonkort"),
  "icon-circles": msg("Ikoncirklar"),
  "icon-list": msg("Ikonlista"),
  "icon-top-rule": msg("Ikoner med linje"),
  "image-cta-cards": msg("Bildkort med knapp"),
};

const MENU_LAYOUT_LABELS: Record<MenuLayout, string> = {
  classic: msg("Klassisk"),
  elegant: msg("Elegant"),
  cards: msg("Kort"),
  tabs: msg("Flikar"),
};

const TEAM_LAYOUT_LABELS: Record<TeamLayout, string> = {
  cards: msg("Kort"),
  round: msg("Runda porträtt"),
  rows: msg("Lista"),
  overlay: msg("Foto med text över"),
};

const GALLERY_LAYOUT_LABELS: Record<GalleryLayout, string> = {
  grid: msg("Två kolumner"),
  tiles: msg("Tätt rutnät"),
  masonry: msg("Murverk"),
  mosaic: msg("Mosaik"),
  carousel: msg("Svepbar rad"),
};

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
  msg("Välkommen tillbaka! Jag har hållit din sajt varm åt dig. 🔥"),
  msg("Där är du ju! Jag har suttit här och polerat rubrikerna medan du var borta."),
  msg("Hej igen! Jag hann nästan sakna dig. Nästan."),
  msg("Tjena! Kaffet är kallt men sajten är redo. ☕ Vad ska vi fixa idag?"),
  msg("Välkommen åter! Jag har inte rört något. Jag lovar. (Okej, jag tittade lite.)"),
  msg("Där satt den! Fint att se dig igen, vad ska vi förbättra den här gången?"),
  msg("Hej och välkommen tillbaka! Jag har värmt upp tangentbordet. ⌨️"),
  msg("Åh, du kom tillbaka! Då kör vi. Berätta vad du vill ändra."),
  msg("Hallå där! Jag låg och drömde om perfekta marginaler. Vad kan jag göra för dig?"),
  msg("Välkommen tillbaka, chefen! Din sajt väntar, och det gör jag också. 😄"),
];

const THINKING_PHRASES = [
  msg("Millie tänker…"),
  msg("Millie hjälper dig nu"),
  msg("Millie gör sin magi"),
  msg("Millie uppdaterar sidan"),
  msg("Millie finslipar detaljerna"),
  msg("Millie sorterar pixlarna"),
  msg("Millie debuggar designen"),
  msg("Millie rätar ut raderna"),
  msg("Millie hittar rätt ord"),
  msg("Millie pysslar lite"),
  msg("Millie optimerar layouten"),
  msg("Millie läser ritningen"),
  msg("Millie mixar färgerna"),
  msg("Millie flyttar på saker"),
  msg("Millie polerar rubrikerna"),
  msg("Millie kompilerar idéerna"),
  msg("Millie dubbelkollar"),
  msg("Millie fixar till det"),
  msg("Millie renderar sidan"),
  msg("Millie snurrar ett varv"),
  msg("Millie trollar med koden"),
  msg("Millie tänker extra noga"),
  msg("Millie synkar med molnet"),
  msg("Millie knådar texten"),
  msg("Millie parsar texten"),
  msg("Millie kör en build"),
  msg("Millie cachar bilderna"),
  msg("Millie komprimerar pixlar"),
  msg("Millie refaktorerar"),
  msg("Millie indexerar sidan"),
  msg("Millie laddar om hjärnan"),
  msg("Millie uppdaterar databasen"),
  msg("Millie validerar sidan"),
  msg("Millie deployar glädje"),
  msg("Millie gör det åt dig"),
  msg("Millie tar hand om det"),
  msg("Millie ger det kärlek"),
  msg("Millie gör det fint"),
  msg("Millie håller tummarna"),
  msg("Millie tänker på dig"),
  msg("Millie satsar helhjärtat"),
  msg("Millie älskar det här"),
  msg("Millie ordnar det snart"),
  msg("Millie fixar det här"),
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
  language?: string | null;
  currency?: string | null;
};

// Chattredigeraren — till skillnad från /webbplats (som bara VISAR sajten,
// i en iframe) renderar den här kundens RIKTIGA SitePreview direkt i
// sidan (ingen iframe), så ett AI-svar kan uppdatera "content"-state och
// förhandsvisningen uppdateras ögonblickligen utan omladdning. Sidbyte i
// menyn sker via onNavigate (se SitePreview/Header) istället för riktiga
// länkar, av samma skäl — annars tappas hela chatt-historiken vid varje
// klick.
export default function EditorPage() {
  const t = useT();
  const locale = useLocale();
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
      text: t("Hej, jag heter Millie! 👋 Enklast är att säga vilken sida du menar och sedan tydligt vad du vill ändra eller lägga till — t.ex. \"På startsidan, byt rubriken till …\" eller \"Lägg till en ruta efter Om oss med texten … och en knapp som länkar till kontaktsidan\". Du kan också klicka direkt på en bild, ett textstycke eller en hel sektion i förhandsvisningen till vänster för att markera precis vad du menar, innan du skriver. Jag uppdaterar sajten åt dig direkt."),
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
    rec.lang = BCP47[locale] ?? "sv-SE";
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
        setMicError(t("Webbläsaren fick inte använda mikrofonen. Tillåt den i adressfältet och försök igen."));
      } else if (e.error === "no-speech") {
        setMicError(t("Jag hörde inget. Försök igen och prata nära mikrofonen."));
      } else if (e.error !== "aborted") {
        setMicError(t("Mikrofonen fungerade inte just nu. Du kan skriva istället."));
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
  const thinkingPhrase = t(THINKING_PHRASES[phraseOrder[phraseIndex % phraseOrder.length]]);
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

  // Stabila callbacks till den memoiserade förhandsvisningen.
  const onPreviewNavigate = useCallback((path: string) => {
    // Byter kunden sida medan något är markerat, ta bort markeringen — den
    // syftade på innehåll på den gamla sidan.
    setSelection(null);
    setActivePath(path);
  }, []);
  const onPreviewSelectImage = useCallback((sel: any) => setSelection((prev) => (prev?.key === sel.key ? null : { target: "image", ...sel })), []);
  const onPreviewSelectSection = useCallback((sel: any) => setSelection((prev) => (prev?.key === sel.key ? null : { target: "section", ...sel })), []);
  const onPreviewSelectField = useCallback((sel: any) => setSelection((prev) => (prev?.key === sel.key ? null : { target: "field", ...sel })), []);

  // Flera bilagor samtidigt (t.ex. en hel hög bilder till ett nytt
  // bildgalleri) — se handleFiles nedan.
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [stockOpen, setStockOpen] = useState(false);
  const [myImagesOpen, setMyImagesOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
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
          setLoadError(t("Hittade ingen genererad sajt ännu."));
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
          setLoadError(t("Sajtens innehåll kunde inte läsas."));
        }
      })
      .catch(() => setLoadError(t("Kunde inte hämta sajten.")));

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
      throw new Error(t("{name}: filtypen stöds inte — använd en bild (PNG/JPG/WEBP/GIF), PDF, Word (.docx) eller en textfil.", { name: file.name }));
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    if (file.size > maxBytes) {
      throw new Error(t("{name}: filen är större än {v2} MB.", { name: file.name, v2: Math.round(maxBytes / (1024 * 1024)) }));
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(t("Du är inte inloggad längre — ladda om sidan."));

    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw new Error(t("Gick inte att ladda upp {name}: {message}", { name: file.name, message: uploadError.message }));
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
    if (!res.ok) throw new Error(data.error || t("Kunde inte läsa {name}.", { name: file.name }));
    return { kind: "document", url: pub.publicUrl, name: file.name, mimeType: file.type, text: data.text };
  };

  // Tar emot EN ELLER FLERA valda filer på en gång (t.ex. en hög bilder till
  // ett nytt bildgalleri) — laddar upp dem i tur och ordning och lägger till
  // dem i samma bilage-lista. En fil som misslyckas stoppar inte de andra;
  // felet visas, men det som faktiskt gick bra läggs ändå till.
  // Bilder kan redigeras efter uppladdning via knappen "Redigera" bredvid
  // filnamnet (se editAtt nedan) — ingen ruta öppnas av sig själv.
  const [editAtt, setEditAtt] = useState<number | null>(null);
  const [savingAtt, setSavingAtt] = useState(false);
  const saveEditedAttachment = async (blob: Blob) => {
    const i = editAtt;
    if (i === null || !attachments[i]) return;
    setSavingAtt(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("Du är inte inloggad längre — ladda om sidan."));
      const png = blob.type === "image/png";
      const path = `${user.id}/chat-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? "png" : "jpg"}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, blob, { contentType: png ? "image/png" : "image/jpeg" });
      if (upErr) throw new Error(t("Gick inte att ladda upp bilden: {message}", { message: upErr.message }));
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      setAttachments((prev) =>
        prev.map((a, j) =>
          j === i
            ? { ...a, url: pub.publicUrl, mimeType: png ? "image/png" : "image/jpeg", name: a.name.replace(/\.[^.]+$/, "") + (png ? ".png" : ".jpg") }
            : a
        )
      );
      setEditAtt(null);
    } catch (e: any) {
      setAttachError(e.message || t("Det gick inte att spara bilden."));
      setEditAtt(null);
    } finally {
      setSavingAtt(false);
    }
  };
  const handleFiles = async (files: File[]) => {
    setAttachError("");
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachError(`Max ${MAX_ATTACHMENTS} bilagor i samma meddelande.`);
      return;
    }
    const toUpload = files.slice(0, room);
    if (files.length > toUpload.length) {
      setAttachError(t("Max {MAX_ATTACHMENTS} bilagor i samma meddelande — tog med de första {length}.", { MAX_ATTACHMENTS, length: toUpload.length }));
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

  // Tidigare uppladdade bilder: bifogas som vanliga egna bilder (samma regler
  // som en ny uppladdning — de ligger redan i kundens egen mapp).
  const pickMyImages = (imgs: MyImage[]) => {
    const room = MAX_ATTACHMENTS - attachments.length;
    setAttachError(imgs.length > room ? `Max ${MAX_ATTACHMENTS} bilagor i samma meddelande.` : "");
    setAttachments((prev) => [
      ...prev,
      ...imgs
        .filter((im) => !prev.some((a) => a.url === im.url))
        .slice(0, Math.max(0, room))
        .map((im): Attachment => ({ kind: "image", url: im.url, name: im.name.slice(0, 100), mimeType: /\.png$/i.test(im.name) ? "image/png" : /\.webp$/i.test(im.name) ? "image/webp" : /\.gif$/i.test(im.name) ? "image/gif" : "image/jpeg" })),
    ]);
    draftInputRef.current?.focus();
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
          next.push({ from: "bot", text: t(WELCOME_BACK[g]), transient: true });
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
          text: t("Obs: förstasidan har exempeltexter som jag lagt dit för att visa vad som går att ha — kundcitat, nyckeltal och vanliga frågor. De är påhittade, så byt ut dem mot era egna eller ta bort dem innan ni publicerar."),
          chips: [
            t("Byt ut exempelcitaten mot mina egna"),
            t("Ta bort alla exempelcitat"),
            t("Ta bort nyckeltalen"),
            t("Ta bort vanliga frågor"),
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
    const toSave = messages.filter((m) => !m.transient).slice(-40).map(({ options, optionPreviews, ...rest }) => rest);
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
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      setContent(data.content);
      setUndoStack((st) => st.slice(0, -1));
      setMessages((m) => [...m, { from: "bot", text: t("Klart, jag har ångrat din senaste ändring.") }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: t("Det gick inte att ångra: {message}", { message: e.message }) }]);
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
      if (!user) throw new Error(t("Du är inte inloggad längre — ladda om sidan."));
      const isPng = blob.type === "image/png";
      const path = `${user.id}/edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${isPng ? "png" : "jpg"}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, blob, { contentType: isPng ? "image/png" : "image/jpeg" });
      if (uploadError) throw new Error(t("Gick inte att ladda upp bilden: {message}", { message: uploadError.message }));
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
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      setUndoStack((st) => [...st.slice(-9), content]);
      setContent(data.content);
      setImageEditorOpen(false);
      setSelection(null);
      setMessages((m) => [...m, { from: "bot", text: t("Klart! Jag har sparat den redigerade bilden ({label}). Du kan ångra med knappen om du ändrar dig.", { label: sel.label }) }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: t("Bilden kunde inte sparas: {message}", { message: e.message }) }]);
      setImageEditorOpen(false);
    } finally {
      setSavingImage(false);
    }
  };

  // Manuell textredigering: kunden skriver om den markerade texten själv,
  // utan Millie. Sparas via /api/sites/edit-text och går att ångra.
  const [textEditOpen, setTextEditOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [savingText, setSavingText] = useState(false);
  const selectedFieldText = (() => {
    if (!content || selection?.target !== "field") return null;
    const section = content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId);
    if (!section) return null;
    const tf = textFieldFor(selection.field);
    return tf ? getFieldText(section, tf) : null;
  })();
  // Nyckeltal har två delar: siffran och texten under.
  const selectedStat = (() => {
    if (!content || selection?.target !== "field") return null;
    const section = content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId);
    return section ? getStat(section, selection.field) : null;
  })();
  const [statValueDraft, setStatValueDraft] = useState("");
  const [statLabelDraft, setStatLabelDraft] = useState("");
  const openTextEditor = () => {
    if (selectedStat) {
      setStatValueDraft(selectedStat.value);
      setStatLabelDraft(selectedStat.label);
      setTextEditOpen(true);
      return;
    }
    if (selectedFieldText === null) return;
    setTextDraft(selectedFieldText);
    setTextEditOpen(true);
  };
  const saveEditedText = async () => {
    if (selection?.target !== "field" || !content) return;
    const sel = selection;
    setSavingText(true);
    try {
      const res = await fetch("/api/sites/edit-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site?.id,
          text: textDraft,
          ...(selectedStat ? { statValue: statValueDraft, statLabel: statLabelDraft } : {}),
          selection: { pagePath: sel.pagePath, sectionId: sel.sectionId, field: textFieldFor(sel.field) || sel.field },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      setUndoStack((st) => [...st.slice(-9), content]);
      setContent(data.content);
      setTextEditOpen(false);
      setSelection(null);
      setMessages((m) => [...m, { from: "bot", text: t("Klart! Din text är sparad. Du kan ångra med knappen om du ändrar dig.") }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: t("Texten kunde inte sparas: {message}", { message: e.message }) }]);
      setTextEditOpen(false);
    } finally {
      setSavingText(false);
    }
  };


  // Visuella väljare: ikon för en ruta och layout för en rutnätssektion.
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [buttonStyleOpen, setButtonStyleOpen] = useState(false);
  const [savingPick, setSavingPick] = useState(false);
  const [customBtnColor, setCustomBtnColor] = useState<string | null>(null);
  const pickedSection = (() => {
    if (!content || !selection) return null;
    return (content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId) as any) ?? null;
  })();
  const iconFieldMatch = selection?.target === "field" ? selection.field.match(/^items\.(\d+)\.icon$/) : null;
  const pickedIconIndex = iconFieldMatch ? Number(iconFieldMatch[1]) : null;
  const pickedIconId =
    pickedIconIndex !== null && pickedSection?.type === "grid" ? iconsForItems(pickedSection.items)[pickedIconIndex] ?? null : null;
  const canPickIcon = pickedIconIndex !== null && pickedSection?.type === "grid";
  const canPickLayout = !!selection && selection.target !== "image" && (pickedSection?.type === "grid" || pickedSection?.type === "gallery" || pickedSection?.type === "team" || pickedSection?.type === "menu");
  const layoutChoices: string[] = pickedSection?.type === "gallery" ? GALLERY_LAYOUTS : pickedSection?.type === "team" ? TEAM_LAYOUTS : pickedSection?.type === "menu" ? MENU_LAYOUTS : GRID_LAYOUTS;
  const layoutLabelOf = (l: string) =>
    pickedSection?.type === "menu"
      ? (MENU_LAYOUT_LABELS as Record<string, string>)[l] ?? l
      : pickedSection?.type === "team"
      ? (TEAM_LAYOUT_LABELS as Record<string, string>)[l] ?? l
      : (GRID_LAYOUT_LABELS as Record<string, string>)[l] ?? (GALLERY_LAYOUT_LABELS as Record<string, string>)[l] ?? l;
  const buttonItemMatch = selection?.target === "field" ? selection.field.match(/^items\.(\d+)\.link$/) : null;
  const buttonItemIndex = buttonItemMatch ? Number(buttonItemMatch[1]) : null;
  const isHeaderBtn = selection?.target === "field" && selection.sectionId === "__header__";
  const canPickButtonStyle = isHeaderBtn || (selection?.target === "field" && !!pickedSection && /(^|\.)(ctaLabel|ctaLink|link)$/.test(selection.field));
  const pickedBtn: any = isHeaderBtn ? content?.theme.headerCta : buttonItemIndex !== null ? pickedSection?.items?.[buttonItemIndex] : pickedSection;
  const pickedBtnStyle: string | null = (isHeaderBtn ? pickedBtn?.style : pickedBtn?.ctaStyle) ?? null;
  const pickedBtnColor: string | null = (isHeaderBtn ? pickedBtn?.color : pickedBtn?.ctaColor) ?? null;
  const btnColorChoices: string[] = Array.from(new Set([
    content?.theme.accentColor, ...((content?.theme.secondaryColors as string[] | undefined) ?? []), "#FFFFFF", "#17171A", "#C0392B", "#2E7D5B", "#2F6FDE", "#E0A526",
  ].filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).map((c) => c.toUpperCase())));
  const BUTTON_STYLE_CHOICES: { id: string | null; label: string }[] = [
    { id: null, label: msg("Som resten av sajten") },
    { id: "pill", label: msg("Rund") },
    { id: "rounded", label: msg("Mjukt rundad") },
    { id: "square", label: msg("Kantig") },
    { id: "soft", label: msg("Mjuk ton") },
    { id: "outline", label: msg("Ram") },
    { id: "gradient", label: msg("Färgton") },
    { id: "underline", label: msg("Understruken") },
  ];
  const savePick = async (url: string, payload: Record<string, unknown>, okText: string) => {
    if (!selection || !content) return;
    setSavingPick(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site?.id, pagePath: selection.pagePath, sectionId: selection.sectionId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      setUndoStack((st) => [...st.slice(-9), content]);
      setContent(data.content);
      setIconPickerOpen(false);
      setLayoutPickerOpen(false);
      setButtonStyleOpen(false);
      setCustomBtnColor(null);
      setTeamOpen(false);
      setEmbedOpen(false);
      setMenuOpen(false);
      setSelection(null);
      setMessages((m) => [...m, { from: "bot", text: okText }]);
    } catch (e: any) {
      setIconPickerOpen(false);
      setLayoutPickerOpen(false);
      setMessages((m) => [...m, { from: "bot", text: t("Ändringen kunde inte sparas: {message}", { message: e.message }) }]);
    } finally {
      setSavingPick(false);
    }
  };
  const saveButtonStyle = (style: string | null) =>
    savePick("/api/sites/edit-button-style", { style, itemIndex: buttonItemIndex, header: isHeaderBtn }, t("Klart! Knappstilen är bytt. Du kan ångra med knappen om du ändrar dig."));
  const saveButtonColor = (color: string | null) =>
    savePick("/api/sites/edit-button-style", { color, itemIndex: buttonItemIndex, header: isHeaderBtn }, t("Klart! Knappfärgen är bytt. Du kan ångra med knappen om du ändrar dig."));
  const saveIcon = (icon: string | null) =>
    savePick("/api/sites/edit-icon", { itemIndex: pickedIconIndex, icon }, t("Klart! Ikonen är bytt. Du kan ångra med knappen om du ändrar dig."));
  // Galleri: lägg till många bilder på en gång (utan AI) och ta bort enskilda.
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const canAddGalleryImages = !!selection && pickedSection?.type === "gallery";
  const selectedGalleryIndex =
    selection?.target === "image" && selection.kind === "galleryItem" && selection.itemIndex !== undefined ? selection.itemIndex : null;
  const addGalleryImages = async (files: File[]) => {
    if (!selection || !content || files.length === 0 || pickedSection?.type !== "gallery") return;
    const have = (pickedSection.items as any[]).length;
    const room = MAX_GALLERY_IMAGES - have + (pickedSection.items as any[]).filter((i) => !i.imageUrl).length;
    if (room <= 0) {
      setMessages((m) => [...m, { from: "bot", text: t("Ett galleri kan ha högst {max} bilder.", { max: MAX_GALLERY_IMAGES }) }]);
      return;
    }
    setGalleryBusy(true);
    const urls: string[] = [];
    const errors: string[] = [];
    for (const file of files.slice(0, Math.min(room, 40))) {
      if (!file.type.startsWith("image/")) { errors.push(t("{name}: filtypen stöds inte — använd en bild (PNG/JPG/WEBP/GIF), PDF, Word (.docx) eller en textfil.", { name: file.name })); continue; }
      try {
        urls.push((await uploadOneFile(file)).url);
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    try {
      if (urls.length > 0) {
        await savePick("/api/sites/edit-gallery", { action: "add", urls }, t("Klart! {n} bilder är tillagda i galleriet. Du kan ångra med knappen om du ändrar dig.", { n: urls.length }));
      }
      if (errors.length > 0) setMessages((m) => [...m, { from: "bot", text: errors.join(" ") }]);
    } finally {
      setGalleryBusy(false);
      if (galleryFileRef.current) galleryFileRef.current.value = "";
    }
  };
  const removeGalleryImage = () =>
    selectedGalleryIndex !== null
      ? savePick("/api/sites/edit-gallery", { action: "remove", index: selectedGalleryIndex }, t("Klart! Bilden är borttagen från galleriet. Du kan ångra med knappen om du ändrar dig."))
      : undefined;
  // Personsektion (team): en egen redigeringsruta för alla personer.
  type TeamDraft = { key: string; imageUrl: string; name: string; title: string; email: string; phone: string; busy?: boolean };
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamDraft, setTeamDraft] = useState<TeamDraft[]>([]);
  const [teamError, setTeamError] = useState("");
  // Inbäddad kod (embed): kunden klistrar in kod från t.ex. sitt bokningssystem.
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [embedHeight, setEmbedHeight] = useState("");
  const [embedError, setEmbedError] = useState("");
  const canEditEmbed = !!selection && pickedSection?.type === "embed";
  const openEmbedEditor = () => {
    if (pickedSection?.type !== "embed") return;
    setEmbedCode(pickedSection.code || "");
    setEmbedHeight(pickedSection.height ? String(pickedSection.height) : "");
    setEmbedError("");
    setEmbedOpen(true);
  };
  const saveEmbed = async () => {
    const h = embedHeight.trim();
    if (h && !(Number(h) >= 100 && Number(h) <= 3000)) {
      setEmbedError(t("Höjden ska vara mellan 100 och 3000 pixlar, eller tom för automatisk höjd."));
      return;
    }
    setEmbedError("");
    await savePick("/api/sites/edit-embed", { code: embedCode, height: h ? Number(h) : null }, t("Klart! Koden är sparad. Du kan ångra med knappen om du ändrar dig."));
  };
  // Meny (menu): en egen redigeringsruta för kategorier och rätter.
  type MenuDraftItem = { key: string; name: string; description: string; price: string; tags: string[] };
  type MenuDraftCat = { key: string; name: string; description: string; items: MenuDraftItem[] };
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDraft, setMenuDraft] = useState<MenuDraftCat[]>([]);
  const [menuNote, setMenuNote] = useState("");
  const [menuError, setMenuError] = useState("");
  const canEditMenu = !!selection && pickedSection?.type === "menu";
  const menuKeyRef = useRef(0);
  const mk = () => `k${++menuKeyRef.current}`;
  const newMenuItem = (it?: any): MenuDraftItem => ({ key: mk(), name: it?.name ?? "", description: it?.description ?? "", price: it?.price ?? "", tags: Array.isArray(it?.tags) ? it.tags : [] });
  const newMenuCat = (c?: any): MenuDraftCat => ({ key: mk(), name: c?.name ?? "", description: c?.description ?? "", items: (c?.items ?? []).map(newMenuItem) });
  const openMenuEditor = () => {
    if (pickedSection?.type !== "menu") return;
    const cats = ((pickedSection.categories as any[]) ?? []).map(newMenuCat);
    setMenuDraft(cats.length ? cats : [newMenuCat()]);
    setMenuNote(pickedSection.note || "");
    setMenuError("");
    setMenuOpen(true);
  };
  const patchMenuCat = (ck: string, patch: Partial<MenuDraftCat>) => setMenuDraft((cs) => cs.map((c) => (c.key === ck ? { ...c, ...patch } : c)));
  const patchMenuItem = (ck: string, ik: string, patch: Partial<MenuDraftItem>) =>
    setMenuDraft((cs) => cs.map((c) => (c.key === ck ? { ...c, items: c.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : c)));
  const moveIn = <T,>(arr: T[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const saveMenu = async () => {
    const cats = menuDraft.filter((c) => c.name.trim() || c.items.some((i) => i.name.trim()));
    for (const c of cats) {
      if (!c.name.trim()) { setMenuError(t("Alla kategorier behöver ett namn.")); return; }
    }
    setMenuError("");
    await savePick(
      "/api/sites/edit-menu",
      {
        note: menuNote,
        categories: cats.map((c) => ({
          name: c.name,
          description: c.description,
          items: c.items.filter((i) => i.name.trim()).map((i) => ({ name: i.name, description: i.description, price: i.price, tags: i.tags })),
        })),
      },
      t("Klart! Menyn är sparad. Du kan ångra med knappen om du ändrar dig.")
    );
  };
  const canEditTeam = !!selection && pickedSection?.type === "team";
  const teamKeyRef = useRef(0);
  const newTeamRow = (m?: Partial<TeamDraft>): TeamDraft => ({
    key: `m${++teamKeyRef.current}`,
    imageUrl: m?.imageUrl ?? "",
    name: m?.name ?? "",
    title: m?.title ?? "",
    email: m?.email ?? "",
    phone: m?.phone ?? "",
  });
  const openTeamEditor = () => {
    if (pickedSection?.type !== "team") return;
    const rows = (pickedSection.items as any[]).map((it) => newTeamRow(it));
    setTeamDraft(rows.length ? rows : [newTeamRow()]);
    setTeamError("");
    setTeamOpen(true);
  };
  const patchTeamRow = (key: string, patch: Partial<TeamDraft>) =>
    setTeamDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const moveTeamRow = (index: number, dir: -1 | 1) =>
    setTeamDraft((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  const uploadTeamPhoto = async (key: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTeamError(t("{name}: filtypen stöds inte — använd en bild (PNG/JPG/WEBP/GIF), PDF, Word (.docx) eller en textfil.", { name: file.name }));
      return;
    }
    patchTeamRow(key, { busy: true });
    setTeamError("");
    try {
      patchTeamRow(key, { imageUrl: (await uploadOneFile(file)).url, busy: false });
    } catch (e: any) {
      patchTeamRow(key, { busy: false });
      setTeamError(e.message);
    }
  };
  const saveTeam = async () => {
    for (let n = 0; n < teamDraft.length; n++) {
      const r = teamDraft[n];
      if (r.busy) { setTeamError(t("Vänta tills fotot är uppladdat.")); return; }
      if (!r.imageUrl || !r.name.trim() || !r.title.trim()) {
        setTeamError(t("Person {n}: foto, namn och titel krävs.", { n: n + 1 }));
        return;
      }
    }
    setTeamError("");
    await savePick(
      "/api/sites/edit-team",
      { members: teamDraft.map((r) => ({ imageUrl: r.imageUrl, name: r.name, title: r.title, email: r.email, phone: r.phone })) },
      t("Klart! Personerna är sparade. Du kan ångra med knappen om du ändrar dig.")
    );
  };
  const saveLayout = (layout: string) =>
    savePick("/api/sites/edit-layout", { layout }, t("Klart! Layouten är bytt. Du kan ångra med knappen om du ändrar dig."));

  // Byta länk för en knapp eller "Läs mer"-rad — samma flöde som texten.
  const [linkEditOpen, setLinkEditOpen] = useState(false);
  const [linkChoice, setLinkChoice] = useState(""); // "", en sidväg eller "__egen"
  const [linkCustom, setLinkCustom] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);
  // Uppladdat dokument som länkmål (PDF, Word, Excel …).
  const [linkDocUrl, setLinkDocUrl] = useState("");
  const [linkDocName, setLinkDocName] = useState("");
  const [linkDocBusy, setLinkDocBusy] = useState(false);
  const [linkDocError, setLinkDocError] = useState("");
  const isUploadedDoc = (url: string) => /^https:\/\/.+\/uploads\/[^/]+\/doc-/.test(url);
  const docNameFromUrl = (url: string) => {
    const last = decodeURIComponent(url.split("/").pop() || "");
    return last.replace(/^doc-\d+-[a-z0-9]+-/, "");
  };
  const uploadLinkDoc = async (file: File) => {
    setLinkDocError("");
    if (file.size > MAX_DOC_BYTES) {
      setLinkDocError(t("Filen är för stor. Max 10 MB."));
      return;
    }
    if (!/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)$/i.test(file.name)) {
      setLinkDocError(t("Den filtypen går inte att länka till. Välj PDF, Word, Excel, PowerPoint, text, CSV eller zip."));
      return;
    }
    setLinkDocBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("Du är inte inloggad längre — ladda om sidan."));
      const dot = file.name.lastIndexOf(".");
      const ext = file.name.slice(dot + 1).toLowerCase();
      const base = file.name.slice(0, dot).toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "dokument";
      const path = `${user.id}/doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw new Error(t("Gick inte att ladda upp filen: {message}", { message: upErr.message }));
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      setLinkDocUrl(pub.publicUrl);
      setLinkDocName(file.name);
      setLinkNewTab(true);
    } catch (e: any) {
      setLinkDocError(e.message);
    } finally {
      setLinkDocBusy(false);
    }
  };
  const selectedLinkField = selection?.target === "field" ? linkFieldFor(selection.field) : null;
  const openLinkEditor = () => {
    if (selection?.target !== "field" || !selectedLinkField || !content) return;
    const section = content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId);
    const current = section ? getLinkValue(section, selectedLinkField) : "";
    const isPage = content.pages.some((p) => p.path === current);
    const isDoc = isUploadedDoc(current);
    setLinkChoice(current === "" ? "" : isPage ? current : isDoc ? "__doc" : "__egen");
    setLinkCustom(current !== "" && !isPage && !isDoc ? current : "https://");
    setLinkDocUrl(isDoc ? current : "");
    setLinkDocName(isDoc ? docNameFromUrl(current) : "");
    setLinkDocError("");
    // Utan eget val: externa adresser öppnas i ett nytt fönster, egna sidor i samma.
    setLinkNewTab((section ? getNewTab(section, selectedLinkField) : undefined) ?? (current !== "" && !isPage));
    setLinkEditOpen(true);
  };
  const saveLink = async () => {
    if (selection?.target !== "field" || !selectedLinkField || !content) return;
    const sel = selection;
    const value = linkChoice === "__egen" ? linkCustom.trim() : linkChoice === "__doc" ? linkDocUrl : linkChoice;
    if (linkChoice === "__doc" && !linkDocUrl) {
      setLinkDocError(t("Välj en fil att ladda upp först."));
      return;
    }
    setSavingText(true);
    try {
      const res = await fetch("/api/sites/edit-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site?.id,
          kind: "link",
          text: value,
          newTab: linkNewTab,
          selection: { pagePath: sel.pagePath, sectionId: sel.sectionId, field: selectedLinkField },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      setUndoStack((st) => [...st.slice(-9), content]);
      setContent(data.content);
      setLinkEditOpen(false);
      setSelection(null);
      setMessages((m) => [...m, { from: "bot", text: t("Klart! Länken är sparad. Du kan ångra med knappen om du ändrar dig.") }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: t("Länken kunde inte sparas: {message}", { message: e.message }) }]);
      setLinkEditOpen(false);
    } finally {
      setSavingText(false);
    }
  };

  // Testa länken: i redigeraren markeras en knapp när man klickar på den,
  // så länken följs bara när kunden uttryckligen ber om det.
  const selectedLinkValue = (() => {
    if (!content || selection?.target !== "field" || !selectedLinkField) return "";
    const section = content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId);
    return section ? getLinkValue(section, selectedLinkField) : "";
  })();
  const testLink = () => {
    if (!selectedLinkValue) return;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(selectedLinkValue)) {
      window.open(selectedLinkValue, "_blank", "noopener,noreferrer");
    } else {
      setSelection(null);
      setActivePath(selectedLinkValue);
    }
  };

  // Stabilt context-värde: funktionerna ovan skapas om varje rendering, men
  // vi anropar alltid senaste versionen via en ref. Utan det skulle varje
  // tecken i chatten få alla textfält i förhandsvisningen att ritas om.
  const fieldEditLatest = useRef({ openTextEditor, openLinkEditor, testLink, openIconPicker: () => setIconPickerOpen(true) });
  fieldEditLatest.current = { openTextEditor, openLinkEditor, testLink, openIconPicker: () => setIconPickerOpen(true) };
  const canEditText = selection?.target === "field" && (selectedFieldText !== null || selectedStat !== null);
  const canEditLink = !!selectedLinkField;
  const canTestLink = selectedLinkValue !== "";
  const fieldEditValue = useMemo(
    () => ({
      canEditText,
      onEditText: () => fieldEditLatest.current.openTextEditor(),
      canEditLink,
      onEditLink: () => fieldEditLatest.current.openLinkEditor(),
      canTestLink,
      onTestLink: () => fieldEditLatest.current.testLink(),
      canPickIcon,
      onPickIcon: () => fieldEditLatest.current.openIconPicker(),
    }),
    [canEditText, canEditLink, canTestLink, canPickIcon]
  );

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
      if (!res.ok) throw new Error(data.error || t("Något gick fel."));
      const isQuestion = Array.isArray(data.options) && data.options.length >= 2;
      if (!isQuestion && !data.noChange) {
        if (content) setUndoStack((st) => [...st.slice(-9), content]);
        setContent(data.content);
      }
      // Millie kan ha skapat en ny nyhetsartikel i samma svar (se
      // app/api/sites/edit/route.ts) — lägg in den i listan direkt så en
      // "newsList"-sektion i förhandsvisningen visar den utan omladdning.
      if (data.siteLanguage) setSite((prev) => (prev ? { ...prev, language: data.siteLanguage } : prev));
      if (data.newsArticle) {
        setNewsArticles((prev) => [data.newsArticle, ...prev.filter((a) => a.id !== data.newsArticle.id)]);
        setPreviewNewsId(data.newsArticle.id);
      }
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: data.summary || t("Klart!"),
          unsupported: !!data.unsupported,
          options: isQuestion ? data.options : Array.isArray(data.nextOptions) && data.nextOptions.length >= 2 ? data.nextOptions : undefined,
          optionPreviews: isQuestion && Array.isArray(data.optionPreviews) && data.optionPreviews.length === data.options.length ? data.optionPreviews : undefined,
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
      setMessages((m) => [...m, { from: "bot", text: t("Det gick inte: {message}", { message: e.message }) }]);
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
            title={t("Tillbaka till kundzonen")}
            className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink bg-bg border border-line px-2.5 md:px-3 py-1.5 rounded-full flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {/* Loggan intill räcker som varumärke på en smal skärm — "Kundzon"
                i klartext tar bara plats som den fasta "← Kundzon"-knappen
                redan ger genom ikonen. */}
            <span className="hidden sm:inline">{t("Kundzon")}</span>
          </Link>
          <div className="hidden md:block w-px h-5.5 bg-line" />
          <div className="hidden md:block">
            <Logo light={false} />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{site?.name || t("Din sajt")}</div>
            <div className="text-[11.5px] text-ink-dim truncate">
              {site ? (site.status === "live" ? t("Live") : t("Utkast")) : "…"}
              {site?.domain ? ` · ${site.domain}` : t(" · ingen domän ännu")}
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
            title={t("Analys och marknadsföring (Google Analytics, Meta Pixel)")}
            aria-label={t("Sajtinställningar")}
            className="w-[34px] h-[34px] rounded-full border border-line bg-bg flex items-center justify-center text-ink-dim flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <Link href={`/sidor${site ? `?site=${site.id}` : ""}`} className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            {t("Sidor")}
          </Link>
          <Link href={`/nyheter${site ? `?site=${site.id}` : ""}`} className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            {t("Nyheter")}
          </Link>
          <Link href={`/bokningar${site ? `?site=${site.id}` : ""}`} className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            {t("Bokningar")}
          </Link>
          <Link
            href={`/forhandsgranska${site ? `?site=${site.id}` : ""}`}
            className="text-[13.5px] font-semibold text-ink border border-line px-4 py-2.5 rounded-lg"
          >
            {t("Förhandsgranska")}
          </Link>
          <button
            type="button"
            disabled
            title={t("Publicering till en riktig domän byggs i ett senare steg")}
            className="text-[13.5px] font-semibold text-ink-dim bg-bg border border-line px-4.5 py-2.5 rounded-lg cursor-not-allowed opacity-70"
          >
            {t("Publicera (kommer snart)")}
          </button>
        </div>

        {/* Mobil: samma fyra åtgärder, samlade bakom en enda meny-knapp. */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={t("Fler alternativ")}
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
              {t("Analys och marknadsföring")}
            </button>
            <Link
              href={`/sidor${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              {t("Sidor")}
            </Link>
            <Link
              href={`/nyheter${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              {t("Nyheter")}
            </Link>
            <Link
              href={`/bokningar${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              {t("Bokningar")}
            </Link>
            <Link
              href={`/forhandsgranska${site ? `?site=${site.id}` : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left"
            >
              {t("Förhandsgranska")}
            </Link>
            <div className="h-px bg-line my-1.5" />
            <div className="px-3 py-2 text-[12.5px] text-ink-dim leading-relaxed">
              {t("Publicera (kommer snart) — publicering till en riktig domän byggs i ett senare steg.")}
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
          {t("Sajten")}
        </button>
        <button
          type="button"
          onClick={() => setMobileView("chat")}
          className={`flex-1 text-center text-[13px] font-semibold py-2.5 border-b-2 ${
            mobileView === "chat" ? "border-ink text-ink" : "border-transparent text-ink-dim"
          }`}
        >
          {t("Chatta med Millie")}
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
                {t("Gå till onboardingen")}
              </Link>
            </div>
          )}

          {!loadError && !content && (
            <div className="bg-white rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">{t("Hämtar din sajt …")}</div>
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
                <FieldEditContext.Provider value={fieldEditValue}>
                <MemoSitePreview
                  bookingPreviewSiteId={site?.id}
                  content={content}
                  siteName={site?.name}
                  lang={site?.language}
                  currency={site?.currency}
                  activePath={activePath}
                  onNavigate={onPreviewNavigate}
                  privacyPolicyMode={site?.privacy_policy_mode}
                  privacyPolicyFileUrl={site?.privacy_policy_file_url}
                  privacyPolicyText={site?.privacy_policy_text}
                  newsArticles={newsArticles}
                  editable
                  selectedImageKey={selection?.target === "image" ? selection.key : null}
                  onSelectImage={onPreviewSelectImage}
                  selectedSectionKey={selection?.target === "section" ? selection.key : null}
                  onSelectSection={onPreviewSelectSection}
                  selectedFieldKey={selection?.target === "field" ? selection.key : null}
                  onSelectField={onPreviewSelectField}
                />
                </FieldEditContext.Provider>
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
              <div className="font-semibold text-[14.5px]">{t("Chatta med Millie")}</div>
              <div className="text-[12px] text-ink-dim mt-0.5">{t("Säg vilken sida du menar, och vad du vill ändra eller lägga till.")}</div>
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={openNews}
                title={t("Se vad som är nytt")}
                className="relative text-[12.5px] font-semibold text-ink bg-bg border border-line rounded-full px-3 py-1.5"
              >
                ✨ Nytt
                {hasUnseenNews && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-surface" aria-label={t("Nya nyheter")} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title={t("Se vad du kan be Millie om")}
                className="text-[12.5px] font-semibold text-ink bg-bg border border-line rounded-full px-3 py-1.5"
              >
                {t("💡 Tips")}
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
                      {m.options.map((o, oi) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => send(o)}
                          className="text-left text-[12.5px] font-semibold bg-surface border border-line rounded-xl px-3 py-2 text-ink hover:border-ink flex items-center gap-3"
                        >
                          {m.optionPreviews?.[oi] && <MenuStyleThumb style={m.optionPreviews[oi]} accent={content?.theme.accentColor} />}
                          <span>{o}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {m.unsupported && (
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDraft({
                          message: m.requestText ? t("Jag vill kunna: {requestText}", { requestText: m.requestText }) : "",
                          context: `Önskemål i chattredigeraren: "${m.requestText || ""}"\nMillies svar: "${m.text}"`,
                          wish: false,
                        });
                        setSupportOpen(true);
                      }}
                      className="mt-2.5 block text-[12.5px] font-semibold underline text-ink"
                    >
                      {t("Skicka önskemålet till oss →")}
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
                {undoing ? t("Ångrar …") : t("↩ Ångra senaste ändringen")}
              </button>
            )}
            {linkEditOpen && content && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-md shadow-xl">
                  <div className="text-[14px] font-semibold mb-2">{t("Ändra länk")}</div>
                  <div className="text-[12px] text-ink-dim mb-2 truncate">{selection?.label}</div>
                  <select
                    value={linkChoice}
                    onChange={(e) => setLinkChoice(e.target.value)}
                    className="w-full bg-bg border border-line rounded-lg p-2 text-[14px]"
                  >
                    <option value="">{t("Ingen länk")}</option>
                    {content.pages.map((p) => (
                      <option key={p.path} value={p.path}>{rich(t, "Sidan “{v1}”", {}, { v1: p.label })}</option>
                    ))}
                    <option value="__egen">{t("Egen webbadress …")}</option>
                    <option value="__doc">{t("Dokument (PDF, Word, Excel …)")}</option>
                  </select>
                  {linkChoice === "__doc" && (
                    <div className="mt-2">
                      {linkDocUrl && (
                        <div className="text-[13px] mb-1.5 flex items-center gap-2">
                          <span>📄</span>
                          <span className="truncate">{linkDocName}</span>
                        </div>
                      )}
                      <label className="inline-block text-[13px] font-semibold border border-line rounded-full px-3.5 py-1.5 cursor-pointer bg-bg">
                        {linkDocBusy ? t("Laddar upp …") : linkDocUrl ? t("Byt dokument") : t("Välj dokument att ladda upp")}
                        <input
                          type="file"
                          className="hidden"
                          disabled={linkDocBusy}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) uploadLinkDoc(f);
                          }}
                        />
                      </label>
                      <div className="text-[11.5px] text-ink-dim mt-1">{t("Max 10 MB. Besökaren kan öppna eller ladda ner filen.")}</div>
                      {linkDocError && <div className="text-[12px] text-red-600 mt-1">{linkDocError}</div>}
                    </div>
                  )}
                  {linkChoice === "__egen" && (
                    <input
                      value={linkCustom}
                      onChange={(e) => setLinkCustom(e.target.value)}
                      placeholder="https://"
                      className="w-full mt-2 bg-bg border border-line rounded-lg p-2 text-[14px] outline-none"
                    />
                  )}
                  {linkChoice !== "" && (
                    <div className="mt-3">
                      <div className="text-[12px] font-semibold text-ink-dim mb-1.5">{t("Hur ska länken öppnas?")}</div>
                      <label className="flex items-center gap-2 text-[13.5px] py-1 cursor-pointer">
                        {rich(t, "{input}I samma fönster", {}, { input: <input type="radio" name="linkTarget" checked={!linkNewTab} onChange={() => setLinkNewTab(false)} /> })}</label>
                      <label className="flex items-center gap-2 text-[13.5px] py-1 cursor-pointer">
                        {rich(t, "{input}I ett nytt fönster", {}, { input: <input type="radio" name="linkTarget" checked={linkNewTab} onChange={() => setLinkNewTab(true)} /> })}</label>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button type="button" onClick={() => setLinkEditOpen(false)} disabled={savingText} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                    <button type="button" onClick={saveLink} disabled={savingText || linkDocBusy} className="text-[13px] font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded-full disabled:opacity-60">
                      {savingText ? t("Sparar …") : t("Spara")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {iconPickerOpen && canPickIcon && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Välj ikon")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">{t("Klicka på en ikon för att använda den i rutan.")}</div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 overflow-y-auto pr-1">
                    {GRID_ICON_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        disabled={savingPick}
                        onClick={() => saveIcon(id)}
                        aria-label={id}
                        className={`aspect-square rounded-xl border flex items-center justify-center disabled:opacity-60 ${id === pickedIconId ? "border-accent bg-accent-soft" : "border-line hover:bg-bg"}`}
                      >
                        <GridIcon id={id} size={24} color="currentColor" />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 mt-3">
                    <button type="button" onClick={() => saveIcon(null)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Välj automatiskt")}
                    </button>
                    <button type="button" onClick={() => setIconPickerOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {menuOpen && canEditMenu && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Meny")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">{t("Lägg till kategorier och rätter. Bara namnet krävs på en rätt. Pris skriver du som text, till exempel 165 kr.")}</div>
                  <div className="overflow-y-auto pr-1 flex flex-col gap-4">
                    {menuDraft.map((c, ci) => (
                      <div key={c.key} className="border border-line rounded-xl p-3">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1 min-w-0 grid gap-2">
                            <input value={c.name} onChange={(e) => patchMenuCat(c.key, { name: e.target.value })} maxLength={80} placeholder={t("Kategori (t.ex. Förrätter)")} aria-label={t("Kategori (t.ex. Förrätter)")} className="bg-bg border border-line rounded-lg p-2 text-[14px] font-semibold outline-none min-w-0" />
                            <input value={c.description} onChange={(e) => patchMenuCat(c.key, { description: e.target.value })} maxLength={300} placeholder={t("Text under kategorin (valfritt)")} aria-label={t("Text under kategorin (valfritt)")} className="bg-bg border border-line rounded-lg p-2 text-[13px] outline-none min-w-0" />
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button type="button" onClick={() => setMenuDraft((cs) => moveIn(cs, ci, -1))} disabled={ci === 0} aria-label={t("Flytta upp")} className="w-7 h-7 rounded-full border border-line text-[13px] disabled:opacity-30">↑</button>
                            <button type="button" onClick={() => setMenuDraft((cs) => moveIn(cs, ci, 1))} disabled={ci === menuDraft.length - 1} aria-label={t("Flytta ner")} className="w-7 h-7 rounded-full border border-line text-[13px] disabled:opacity-30">↓</button>
                            <button type="button" onClick={() => setMenuDraft((cs) => cs.filter((x) => x.key !== c.key))} aria-label={t("Ta bort kategorin")} className="w-7 h-7 rounded-full border border-line text-[13px]">🗑</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-3">
                          {c.items.map((it, ii) => (
                            <div key={it.key} className="rounded-lg bg-bg p-2 flex gap-2 items-start">
                              <div className="flex-1 min-w-0 grid gap-1.5">
                                <div className="flex gap-1.5">
                                  <input value={it.name} onChange={(e) => patchMenuItem(c.key, it.key, { name: e.target.value })} maxLength={120} placeholder={t("Rätt")} aria-label={t("Rätt")} className="flex-1 min-w-0 bg-surface border border-line rounded-md p-1.5 text-[13.5px] outline-none" />
                                  <input value={it.price} onChange={(e) => patchMenuItem(c.key, it.key, { price: e.target.value })} maxLength={40} placeholder={t("Pris")} aria-label={t("Pris")} className="w-24 bg-surface border border-line rounded-md p-1.5 text-[13.5px] outline-none" />
                                </div>
                                <input value={it.description} onChange={(e) => patchMenuItem(c.key, it.key, { description: e.target.value })} maxLength={400} placeholder={t("Beskrivning (valfritt)")} aria-label={t("Beskrivning (valfritt)")} className="bg-surface border border-line rounded-md p-1.5 text-[12.5px] outline-none min-w-0" />
                                <div className="flex flex-wrap gap-1.5">
                                  {MENU_TAGS.map((tg) => {
                                    const on = it.tags.includes(tg);
                                    return (
                                      <button
                                        key={tg}
                                        type="button"
                                        aria-pressed={on}
                                        title={tg === "v" ? t("Vegetarisk") : tg === "vg" ? t("Vegansk") : tg === "gf" ? t("Glutenfri") : tg === "lf" ? t("Laktosfri") : t("Stark")}
                                        onClick={() => patchMenuItem(c.key, it.key, { tags: on ? it.tags.filter((x) => x !== tg) : [...it.tags, tg] })}
                                        className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${on ? "bg-accent text-accent-ink border-accent" : "border-line text-ink-dim"}`}
                                      >
                                        {tg === "hot" ? "🌶" : tg.toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button type="button" onClick={() => patchMenuCat(c.key, { items: moveIn(c.items, ii, -1) })} disabled={ii === 0} aria-label={t("Flytta upp")} className="w-6 h-6 rounded-full border border-line text-[12px] disabled:opacity-30">↑</button>
                                <button type="button" onClick={() => patchMenuCat(c.key, { items: moveIn(c.items, ii, 1) })} disabled={ii === c.items.length - 1} aria-label={t("Flytta ner")} className="w-6 h-6 rounded-full border border-line text-[12px] disabled:opacity-30">↓</button>
                                <button type="button" onClick={() => patchMenuCat(c.key, { items: c.items.filter((x) => x.key !== it.key) })} aria-label={t("Ta bort rätten")} className="w-6 h-6 rounded-full border border-line text-[12px]">🗑</button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => patchMenuCat(c.key, { items: [...c.items, newMenuItem()] })}
                            disabled={c.items.length >= MAX_MENU_ITEMS}
                            className="text-[12.5px] font-semibold border border-dashed border-line rounded-lg py-1.5 disabled:opacity-40"
                          >
                            {t("➕ Lägg till rätt")}
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMenuDraft((cs) => [...cs, newMenuCat()])}
                      disabled={menuDraft.length >= MAX_MENU_CATEGORIES}
                      className="text-[13px] font-semibold border border-dashed border-line rounded-xl py-2 disabled:opacity-40"
                    >
                      {t("➕ Lägg till kategori")}
                    </button>
                    <label className="block">
                      <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Text längst ned, till exempel om allergier (valfritt)")}</span>
                      <textarea value={menuNote} onChange={(e) => setMenuNote(e.target.value)} rows={2} maxLength={500} className="w-full bg-bg border border-line rounded-lg p-2 text-[13px] outline-none resize-y" />
                    </label>
                  </div>
                  {menuError && <div className="text-[12.5px] text-red-600 mt-2" role="alert">{menuError}</div>}
                  <div className="flex justify-end gap-2 mt-3">
                    <button type="button" onClick={() => setMenuOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">{t("Avbryt")}</button>
                    <button type="button" onClick={saveMenu} disabled={savingPick} className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-ink disabled:opacity-60">
                      {savingPick ? t("Sparar …") : t("Spara")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {embedOpen && canEditEmbed && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Inbäddad kod")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">
                    {t("Klistra in koden från ditt bokningssystem eller din widget (script eller iframe), eller bara adressen till sidan som börjar med https://. Koden körs i en säker, isolerad ruta på sidan. Tjänster som kräver cookies eller lagring på din egen sajt kan behöva visas via sin egen länk i stället.")}
                  </div>
                  <textarea
                    value={embedCode}
                    onChange={(e) => setEmbedCode(e.target.value)}
                    rows={9}
                    spellCheck={false}
                    placeholder={'<script src="https://…"></script>'}
                    aria-label={t("Inbäddad kod")}
                    className="w-full bg-bg border border-line rounded-lg p-2 text-[12.5px] font-mono outline-none resize-y"
                  />
                  <label className="flex items-center gap-2 mt-3 text-[12.5px]">
                    <span className="text-ink-dim">{t("Höjd i pixlar (tomt = automatisk)")}</span>
                    <input
                      value={embedHeight}
                      onChange={(e) => setEmbedHeight(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="700"
                      className="w-24 bg-bg border border-line rounded-lg p-1.5 text-[13px] outline-none"
                    />
                  </label>
                  {embedError && <div className="text-[12.5px] text-red-600 mt-2" role="alert">{embedError}</div>}
                  <div className="flex justify-end gap-2 mt-3">
                    <button type="button" onClick={() => setEmbedOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                    <button type="button" onClick={saveEmbed} disabled={savingPick} className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-ink disabled:opacity-60">
                      {savingPick ? t("Sparar …") : t("Spara")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {teamOpen && canEditTeam && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Personer")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">{t("Foto, namn och titel krävs. E-post och telefon är valfria och visas bara om du fyller i dem.")}</div>
                  <div className="overflow-y-auto pr-1 flex flex-col gap-3">
                    {teamDraft.map((r, n) => (
                      <div key={r.key} className="border border-line rounded-xl p-3 flex gap-3">
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <label className="relative w-16 h-16 rounded-full overflow-hidden bg-bg border border-line flex items-center justify-center cursor-pointer text-[11px] text-ink-dim text-center">
                            {r.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <span className="px-1">{r.busy ? t("Laddar upp …") : t("Välj foto")}</span>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              disabled={savingPick || r.busy}
                              onChange={(e) => { uploadTeamPhoto(r.key, e.target.files?.[0]); e.target.value = ""; }}
                            />
                          </label>
                          {r.imageUrl && (
                            <span className="text-[11px] text-ink-dim">{r.busy ? t("Laddar upp …") : t("Klicka för att byta")}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input value={r.name} onChange={(e) => patchTeamRow(r.key, { name: e.target.value })} maxLength={80} placeholder={t("Namn (krävs)")} aria-label={t("Namn (krävs)")} className="bg-bg border border-line rounded-lg p-2 text-[13.5px] outline-none min-w-0" />
                          <input value={r.title} onChange={(e) => patchTeamRow(r.key, { title: e.target.value })} maxLength={100} placeholder={t("Titel (krävs)")} aria-label={t("Titel (krävs)")} className="bg-bg border border-line rounded-lg p-2 text-[13.5px] outline-none min-w-0" />
                          <input type="email" value={r.email} onChange={(e) => patchTeamRow(r.key, { email: e.target.value })} maxLength={120} placeholder={t("E-post (valfritt)")} aria-label={t("E-post (valfritt)")} className="bg-bg border border-line rounded-lg p-2 text-[13.5px] outline-none min-w-0" />
                          <input type="tel" value={r.phone} onChange={(e) => patchTeamRow(r.key, { phone: e.target.value })} maxLength={40} placeholder={t("Telefon (valfritt)")} aria-label={t("Telefon (valfritt)")} className="bg-bg border border-line rounded-lg p-2 text-[13.5px] outline-none min-w-0" />
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button type="button" onClick={() => moveTeamRow(n, -1)} disabled={n === 0} aria-label={t("Flytta upp")} className="w-7 h-7 rounded-full border border-line text-[13px] disabled:opacity-30">↑</button>
                          <button type="button" onClick={() => moveTeamRow(n, 1)} disabled={n === teamDraft.length - 1} aria-label={t("Flytta ner")} className="w-7 h-7 rounded-full border border-line text-[13px] disabled:opacity-30">↓</button>
                          <button type="button" onClick={() => setTeamDraft((rows) => rows.filter((x) => x.key !== r.key))} aria-label={t("Ta bort personen")} className="w-7 h-7 rounded-full border border-line text-[13px]">🗑</button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTeamDraft((rows) => [...rows, newTeamRow()])}
                      disabled={teamDraft.length >= MAX_TEAM_MEMBERS}
                      className="text-[13px] font-semibold border border-dashed border-line rounded-xl py-2 disabled:opacity-40"
                    >
                      {t("➕ Lägg till person")}
                    </button>
                  </div>
                  {teamError && <div className="text-[12.5px] text-red-600 mt-2" role="alert">{teamError}</div>}
                  <div className="flex justify-end gap-2 mt-3">
                    <button type="button" onClick={() => setTeamOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                    <button type="button" onClick={saveTeam} disabled={savingPick || teamDraft.length === 0} className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-ink disabled:opacity-60">
                      {savingPick ? t("Sparar …") : t("Spara")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {buttonStyleOpen && canPickButtonStyle && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Välj knappstil")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">{buttonItemIndex !== null || isHeaderBtn ? t("Gäller bara den här knappen. Resten av sajten påverkas inte.") : t("Gäller knapparna i den här sektionen. Resten av sajten påverkas inte.")}</div>
                  <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
                    {BUTTON_STYLE_CHOICES.map((c) => {
                      const accent = content?.theme.accentColor || "#2E7D5B";
                      const current = pickedBtnStyle === c.id;
                      const sample: React.CSSProperties =
                        c.id === "soft" ? { background: `color-mix(in srgb, ${accent} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`, borderRadius: 12 }
                        : c.id === "outline" ? { border: `1.5px solid ${accent}`, borderRadius: 999 }
                        : c.id === "underline" ? { borderBottom: `2px solid ${accent}`, borderRadius: 0 }
                        : c.id === "square" ? { background: accent, borderRadius: 6 }
                        : c.id === "rounded" ? { background: accent, borderRadius: 12 }
                        : c.id === "gradient" ? { background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, transparent))`, borderRadius: 999 }
                        : c.id === "pill" ? { background: accent, borderRadius: 999 }
                        : { border: "1px dashed #999", borderRadius: 999 };
                      return (
                        <button
                          key={c.id ?? "auto"}
                          type="button"
                          disabled={savingPick}
                          onClick={() => saveButtonStyle(c.id)}
                          className={`rounded-xl border p-3 text-left disabled:opacity-60 ${current ? "border-accent bg-accent-soft" : "border-line hover:bg-bg"}`}
                        >
                          <div className="flex justify-center py-1.5">
                            <span className="inline-block text-[11px] font-semibold px-4 py-1.5" style={{ color: c.id === "pill" || c.id === "square" || c.id === "rounded" || c.id === "gradient" ? "#17171A" : undefined, ...sample }}>{t("Knapp")}</span>
                          </div>
                          <div className="text-[12.5px] font-semibold mt-1">{t(c.label)}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="text-[13px] font-semibold mb-2">{t("Knappfärg")}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={savingPick}
                        onClick={() => saveButtonColor(null)}
                        className={`text-[12px] rounded-full border px-3 py-1.5 disabled:opacity-60 ${pickedBtnColor === null ? "border-accent bg-accent-soft" : "border-line hover:bg-bg"}`}
                      >
                        {t("Sajtens färg")}
                      </button>
                      {btnColorChoices.map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={savingPick}
                          aria-label={c}
                          onClick={() => saveButtonColor(c)}
                          className={`w-8 h-8 rounded-full border-2 disabled:opacity-60 ${pickedBtnColor?.toUpperCase() === c ? "border-accent ring-2 ring-accent" : "border-line"}`}
                          style={{ background: c }}
                        />
                      ))}
                      <label className="text-[12px] flex items-center gap-1.5 rounded-full border border-line px-2 py-1 cursor-pointer">
                        {t("Egen färg")}
                        <input type="color" disabled={savingPick} value={customBtnColor ?? pickedBtnColor ?? content?.theme.accentColor ?? "#2E7D5B"} onChange={(e) => setCustomBtnColor(e.target.value.toUpperCase())} className="w-6 h-6 p-0 border-0 bg-transparent" />
                      </label>
                      {customBtnColor && (
                        <button type="button" disabled={savingPick} onClick={() => saveButtonColor(customBtnColor)} className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-3 py-1.5 disabled:opacity-60">
                          {t("Använd")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <button type="button" onClick={() => setButtonStyleOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {layoutPickerOpen && canPickLayout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
                  <div className="text-[14px] font-semibold mb-1">{t("Välj layout")}</div>
                  <div className="text-[12px] text-ink-dim mb-3">{t("Texterna och ikonerna behålls, bara uppställningen byts.")}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1">
                    {layoutChoices.map((l) => (
                      <button
                        key={l}
                        type="button"
                        disabled={savingPick}
                        onClick={() => saveLayout(l)}
                        className={`rounded-xl border p-2 text-left disabled:opacity-60 ${l === pickedSection?.layout ? "border-accent bg-accent-soft" : "border-line hover:bg-bg"}`}
                      >
                        <GridLayoutThumb layout={l as GridLayout | GalleryLayout | TeamLayout | MenuLayout} accent={content?.theme.accentColor} />
                        <div className="text-[12.5px] font-semibold mt-1.5">{t(layoutLabelOf(l))}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button type="button" onClick={() => setLayoutPickerOpen(false)} disabled={savingPick} className="text-[13px] px-3 py-1.5 rounded-full border border-line">
                      {t("Avbryt")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {textEditOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="bg-surface rounded-2xl p-4 w-full max-w-md shadow-xl">
                  <div className="text-[14px] font-semibold mb-2">{t("Ändra text")}</div>
                  <div className="text-[12px] text-ink-dim mb-2 truncate">{selection?.label}</div>
                  {selectedStat ? (
                    <div className="flex flex-col gap-2">
                      <label className="block">
                        <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Siffra eller värde")}</span>
                        <input
                          value={statValueDraft}
                          onChange={(e) => setStatValueDraft(e.target.value)}
                          maxLength={40}
                          autoFocus
                          placeholder={t("t.ex. 15+")}
                          className="w-full bg-bg border border-line rounded-lg p-2 text-[14px] outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11.5px] font-semibold text-ink-dim mb-1">{t("Text under")}</span>
                        <input
                          value={statLabelDraft}
                          onChange={(e) => setStatLabelDraft(e.target.value)}
                          maxLength={120}
                          placeholder={t("t.ex. års erfarenhet")}
                          className="w-full bg-bg border border-line rounded-lg p-2 text-[14px] outline-none"
                        />
                      </label>
                    </div>
                  ) : (
                  <textarea
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    rows={6}
                    autoFocus
                    className="w-full bg-bg border border-line rounded-lg p-2 text-[14px] outline-none"
                  />
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setTextEditOpen(false)}
                      disabled={savingText}
                      className="text-[13px] px-3 py-1.5 rounded-full border border-line"
                    >
                      {t("Avbryt")}
                    </button>
                    <button
                      type="button"
                      onClick={saveEditedText}
                      disabled={savingText || (selectedStat ? statValueDraft.trim() === "" : textDraft.trim() === "")}
                      className="text-[13px] font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded-full disabled:opacity-60"
                    >
                      {savingText ? t("Sparar …") : t("Spara")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {selection && (
              <div className="flex items-center gap-2 bg-accent-soft border border-line rounded-lg px-3 py-2 mb-2">
                <span className="text-[14px] flex-shrink-0">
                  {selection.target === "image" ? "🖼️" : selection.target === "field" ? "✏️" : "📝"}
                </span>
                <span className="text-[12.5px] truncate flex-1">
                  {t("Vald")}: {selection.label}
                </span>
                {selection.target === "image" && selectedImageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageEditorOpen(true)}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("✂️ Redigera bild")}
                  </button>
                )}
                {canAddGalleryImages && (
                  <>
                    <input
                      ref={galleryFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(e) => addGalleryImages(Array.from(e.target.files || []))}
                    />
                    <button
                      type="button"
                      onClick={() => galleryFileRef.current?.click()}
                      disabled={sending || galleryBusy || savingPick}
                      className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                    >
                      {galleryBusy || savingPick ? t("Laddar upp …") : t("➕ Lägg till bilder")}
                    </button>
                  </>
                )}
                {selectedGalleryIndex !== null && (
                  <button
                    type="button"
                    onClick={removeGalleryImage}
                    disabled={sending || galleryBusy || savingPick}
                    className="text-[12px] font-semibold border border-line rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("🗑 Ta bort bilden")}
                  </button>
                )}
                {canEditEmbed && (
                  <button
                    type="button"
                    onClick={openEmbedEditor}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("</> Klistra in kod")}
                  </button>
                )}
                {canEditMenu && (
                  <button
                    type="button"
                    onClick={openMenuEditor}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("🍽 Redigera meny")}
                  </button>
                )}
                {canEditTeam && (
                  <button
                    type="button"
                    onClick={openTeamEditor}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("👥 Redigera personer")}
                  </button>
                )}
                {canPickButtonStyle && (
                  <button
                    type="button"
                    onClick={() => setButtonStyleOpen(true)}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("🔘 Byt knappstil")}
                  </button>
                )}
                {canPickLayout && (
                  <button
                    type="button"
                    onClick={() => setLayoutPickerOpen(true)}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("🎨 Byt layout")}
                  </button>
                )}
                {canPickIcon && (
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    disabled={sending}
                    className="text-[12px] font-semibold bg-accent text-accent-ink rounded-full px-2.5 py-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {t("✎ Byt ikon")}
                  </button>
                )}
                {selection.target === "image" && !selectedImageUrl && (
                  <span className="text-[11.5px] text-ink-dim flex-shrink-0">{t("Ingen bild att redigera ännu")}</span>
                )}
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  aria-label={t("Ta bort markeringen")}
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
                    {a.kind === "image" && !a.credit && (
                      <button
                        type="button"
                        onClick={() => setEditAtt(i)}
                        disabled={sending}
                        className="text-[12px] font-semibold bg-surface border border-line rounded-full px-2.5 py-1 text-ink flex-shrink-0 disabled:opacity-60"
                      >
                        {t("✂️ Redigera")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={t("Ta bort bilagan")}
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
              <div className="relative flex-shrink-0">
                              <button
                  type="button"
                  onClick={() => setAttachMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={attachMenuOpen}
                  disabled={sending || attaching || !content}
                  aria-label={t("Bifoga filer")}
                  title={t("Bifoga en eller flera bilder/textdokument — t.ex. flera bilder på en gång till ett bildgalleri")}
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
                {attachMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAttachMenuOpen(false)} />
                    <div role="menu" className="absolute bottom-full left-0 mb-2 z-40 w-[230px] bg-surface border border-line rounded-xl shadow-lg p-1.5 flex flex-col">
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }} className="text-left text-[13.5px] px-3 py-2 rounded-lg hover:bg-bg">
                        {t("📎 Ladda upp")}
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); setMyImagesOpen(true); }} className="text-left text-[13.5px] px-3 py-2 rounded-lg hover:bg-bg">
                        {t("🗂 Mina bilder")}
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); setStockOpen(true); }} className="text-left text-[13.5px] px-3 py-2 rounded-lg hover:bg-bg">
                        {t("🖼 Stockbilder")}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={sending || attaching || !content}
                  aria-label={listening ? t("Sluta lyssna") : t("Prata in meddelandet")}
                  aria-pressed={listening}
                  title={listening ? t("Tryck för att sluta lyssna") : t("Prata in ditt meddelande ({språk})", { språk: LOCALE_NAMES[locale] })}
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
                placeholder={listening ? t("Jag lyssnar … prata på") : t("Skriv till Millie …")}
                disabled={sending || !content}
                rows={1}
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim disabled:opacity-60 resize-none py-1.5 leading-[1.4] max-h-[160px] overflow-y-auto"
              />
              <button
                onClick={() => send()}
                disabled={sending || attaching || !content || (!draft.trim() && attachments.length === 0)}
                aria-label={t("Skicka")}
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
          onPublished={(a, published) => {
            setNewsArticles((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            if (published) setMessages((m) => [...m, { from: "bot", text: t("Nyheten är publicerad! 🎉") }]);
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
          setSupportDraft({ message: "", context: t("Önskemål om ny funktion (från Nytt-rutan i redigeraren)"), wish: true });
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
      {editAtt !== null && attachments[editAtt] && (
        <ImageEditorModal
          open
          src={attachments[editAtt].url}
          saving={savingAtt}
          title={t("Redigera bilden")}
          saveLabel={t("Använd den redigerade bilden")}
          onClose={() => setEditAtt(null)}
          onSave={saveEditedAttachment}
        />
      )}
      <MyImagesModal open={myImagesOpen} onClose={() => setMyImagesOpen(false)} onPick={pickMyImages} maxPick={Math.max(0, MAX_ATTACHMENTS - attachments.length)} />
      <StockPhotoModal open={stockOpen} onClose={() => setStockOpen(false)} onPick={pickStockPhoto} />

      <ContactSupportModal
        key={`${supportDraft.wish}-${supportDraft.context}`}
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        source="chattredigerare"
        context={supportDraft.context}
        defaultMessage={supportDraft.message}
        siteId={site?.id}
        title={supportDraft.wish ? t("Önska en ny funktion") : t("Skicka önskemål till oss")}
        intro={
          supportDraft.wish
            ? t("Vad skulle du vilja kunna göra på din sajt som du inte kan idag? Beskriv gärna så konkret du kan – vi läser alla förslag.")
            : t("Millie kan inte fixa det här själv än, men vi läser alla önskemål — skriv gärna lite mer om vad du vill kunna göra.")
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
