"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import type { SiteContent, Section, SocialLink, BackgroundMode, ThemeFont, ButtonStyle, HeaderLayout, ContactFormSection } from "@/lib/contentModel";
import { socialPlatformLabel, socialPlatformColor } from "@/lib/socialPlatforms";
import { SocialGlyph } from "@/lib/socialIcons";
import { isArticleLive, type NewsArticle } from "@/lib/newsArticles";

// Varje stilvariant bygger en gradient-"bild" av kundens egna färger istället
// för ett grått platshållarfält. Så fort kunden laddar upp egna foton är det
// här exakt de ytor som byts ut (se lib/assignUploadedImages.ts) — vi lovar
// aldrig AI-genererade bilder, men layouten ska se stor och proffsig ut
// även innan fotona finns.
function artBackground(mode: BackgroundMode, accent: string, secondary: string[]) {
  const c2 = secondary[0] || accent;
  const c3 = secondary[1] || accent;
  if (mode === "dark") {
    return `radial-gradient(circle at 20% 20%, ${accent}33, transparent 55%), radial-gradient(circle at 80% 70%, ${c2}29, transparent 55%), linear-gradient(160deg, #17171A 0%, #221F1C 100%)`;
  }
  if (mode === "warm") {
    return `radial-gradient(circle at 15% 15%, ${accent}3d, transparent 55%), radial-gradient(circle at 85% 80%, ${c3}30, transparent 55%), linear-gradient(160deg, #FBF2EC 0%, #F0E0CF 100%)`;
  }
  return `radial-gradient(circle at 10% 10%, ${accent}35, transparent 55%), radial-gradient(circle at 90% 85%, ${c2}28, transparent 55%), linear-gradient(160deg, #FFFFFF 0%, #F3F2EE 100%)`;
}

const PALETTES: Record<BackgroundMode, { bg: string; bgAlt: string; text: string; textDim: string; cardBg: string; cardBorder: string }> = {
  light: { bg: "#FFFFFF", bgAlt: "#F7F6F3", text: "#17171A", textDim: "#6E6C68", cardBg: "#FFFFFF", cardBorder: "#ECEAE6" },
  warm: { bg: "#FBF2EC", bgAlt: "#F3E6DA", text: "#3E2A1C", textDim: "#8A6F57", cardBg: "#FFFBF7", cardBorder: "#F0E3DA" },
  dark: { bg: "#17171A", bgAlt: "#1F1F23", text: "#F5F4F1", textDim: "#9E9C97", cardBg: "#232327", cardBorder: "#2E2E33" },
};

type Palette = (typeof PALETTES)[BackgroundMode];

// Fast sökväg för kundens egen integritetspolicy (onboarding steg 5) — en
// "virtuell" sida som INTE finns i content.pages (AI:n väljer den aldrig)
// och därför heller inte dyker upp i huvudmenyn, bara länkad från
// sidfoten — precis som juridiska sidor brukar vara.
const PRIVACY_POLICY_PATH = "/integritetspolicy";

export default function SitePreview({
  content,
  siteName,
  siteId,
  fontOverride,
  backgroundModeOverride,
  buttonStyleOverride,
  headerLayoutOverride,
  activePath,
  basePath,
  onNavigate,
  privacyPolicyMode,
  privacyPolicyFileUrl,
  privacyPolicyText,
  newsArticles,
  editable,
  selectedImageKey,
  onSelectImage,
  selectedSectionKey,
  onSelectSection,
  selectedFieldKey,
  onSelectField,
}: {
  content: SiteContent;
  siteName?: string;
  // Sajtens id i databasen — bara för vår egen, cookiefria besöksstatistik
  // (PageviewBeacon nedan). Valfri eftersom den bara ska skickas med från
  // den RIKTIGA, publikt nåbara renderingen (se basePath/showCookieBanner),
  // aldrig från /forslag-miniatyrerna eller chattredigerarens egen
  // förhandsvisning — annars skulle ägarens egna klick räknas som besök.
  siteId?: string;
  fontOverride?: ThemeFont;
  backgroundModeOverride?: BackgroundMode;
  // Samma idé som ovan, för knappformen (pill/square/underline) — används
  // av /forslag-miniatyrerna så en stilvariant kan förhandsvisas innan
  // kunden valt den (se lib/themeVariants.ts).
  buttonStyleOverride?: ButtonStyle;
  // Samma idé, för headerns uppbyggnad (vänster/centrerad-staplad/delad) —
  // se lib/themeVariants.ts.
  headerLayoutOverride?: HeaderLayout;
  // Vilken sida (content.pages[].path) som ska visas — default förstasidan.
  activePath?: string;
  // Satt när sidan ska gå att klicka runt på (se app/webbplats). Utan den
  // (t.ex. i /forslag-miniatyrerna) är menyn bara text, inte länkar, och
  // cookiebannern visas inte (se nedan).
  basePath?: string;
  // Satt av chattredigeraren (/redigera) för sidbyte UTAN full
  // sidladdning (annars tappas chatt-historiken vid varje klick i menyn)
  // — se Header nedan.
  onNavigate?: (path: string) => void;
  // Kundens egen integritetspolicy, satt i onboarding steg 5. "uploaded"
  // länkar sidfoten direkt till filen (ny flik); "generated" renderas som
  // en egen sida på PRIVACY_POLICY_PATH utifrån den sparade texten.
  privacyPolicyMode?: "uploaded" | "generated" | null;
  privacyPolicyFileUrl?: string | null;
  privacyPolicyText?: string | null;
  // Kundens egna nyhetsartiklar (utkast + publicerade, se
  // lib/newsArticles.ts) — behövs för att rendera "newsList"-sektionen
  // och för att hitta rätt artikel när besökaren klickar sig in på en
  // egen läsvy (se newsDetailMatch nedan). Saknas den (t.ex. i
  // /forslag-miniatyrerna) visas "newsList"-sektionen bara tom.
  newsArticles?: NewsArticle[];
  // Satt av chattredigeraren (/redigera) ENDAST — låter kunden klicka på
  // en bild i förhandsvisningen istället för att beskriva vilken bild de
  // menar i ord (se ImageOrArt/SectionBlock ovan). Aldrig satt från
  // /webbplats, /forhandsgranska, /forslag eller dashboard-miniatyrerna —
  // där ska en klick i förhandsvisningen aldrig göra något annat än det
  // den redan gör (navigera/inget).
  editable?: boolean;
  selectedImageKey?: string | null;
  onSelectImage?: (sel: { key: string; pagePath: string; sectionId: string; kind: "hero" | "gridItem" | "galleryItem"; itemIndex?: number; label: string }) => void;
  // Samma koncept som ovan, för att välja en HEL sektion (text) istället
  // för en enskild bild — se sectionLabel/SectionBlock nedan.
  selectedSectionKey?: string | null;
  onSelectSection?: (sel: { key: string; pagePath: string; sectionId: string; label: string }) => void;
  // Samma koncept igen, fast för ETT ENSKILT textfält (rubrik, brödtext,
  // ett citat …) — se Field/fieldSel ovan.
  selectedFieldKey?: string | null;
  onSelectField?: (sel: { key: string; pagePath: string; sectionId: string; field: string; label: string }) => void;
}) {
  const isPrivacyPolicyPage =
    activePath === PRIVACY_POLICY_PATH && privacyPolicyMode === "generated" && !!privacyPolicyText;

  // En artikels egen läsvy ligger inte på en egen "sida" i content.pages —
  // det är EXAKT den sökväg som nyhetssidan själv har, plus "/<slug>" (se
  // NewsListSection i lib/contentModel.ts). Hittar vi en sida med en
  // "newsList"-sektion vars path är den direkta föräldern till activePath,
  // och en PUBLICERAD artikel med den slugen, visar vi artikeln istället
  // för sidans vanliga sektioner (se renderingen nedan).
  const newsDetailMatch = (() => {
    if (!activePath || activePath === "/" || isPrivacyPolicyPage) return null;
    for (const p of content.pages) {
      if (!p.sections.some((s) => s.type === "newsList")) continue;
      const prefix = p.path === "/" ? "/" : `${p.path}/`;
      if (!activePath.startsWith(prefix)) continue;
      const slug = activePath.slice(prefix.length);
      if (!slug) continue;
      const article = (newsArticles || []).find((a) => a.slug === slug && isArticleLive(a));
      if (article) return { page: p, article };
    }
    return null;
  })();

  const page = isPrivacyPolicyPage
    ? { path: PRIVACY_POLICY_PATH, label: "Integritetspolicy", sections: [] }
    : newsDetailMatch
    ? newsDetailMatch.page
    : content.pages.find((p) => p.path === activePath) || content.pages[0];
  const font = fontOverride ?? content.theme.font;
  // Prioritet: en uttrycklig förhandsvisnings-override (t.ex. /forslag, som
  // tvingar fram ett läge oavsett innehåll) vinner alltid. Annars används
  // sidans EGEN bakgrund om kunden bett om en annan bakgrund på just den
  // här sidan (SitePageContent.backgroundMode, se lib/contentModel.ts) —
  // annars sajtens vanliga tema, precis som innan det fältet fanns.
  const mode = backgroundModeOverride ?? page.backgroundMode ?? content.theme.backgroundMode ?? "light";
  // Saknas den (sajter skapade innan knappform fanns) faller vi tillbaka på
  // "pill" — den ursprungliga, enda formen som fanns innan.
  const buttonShape = buttonStyleOverride ?? content.theme.buttonStyle ?? "pill";
  // Samma princip, för headerns uppbyggnad — se HeaderLayout i
  // lib/contentModel.ts och Header nedan.
  const headerLayout: HeaderLayout = headerLayoutOverride ?? content.theme.headerLayout ?? "left";
  const fontClass = font === "serif" ? "font-serif" : "font-sans";
  const accent = content.theme.accentColor;
  const secondary = content.theme.secondaryColors || [];
  const palette = PALETTES[mode];

  // Startsidans "overlay-bottom"-hero är tänkt att vara en riktig, fullbred
  // "wow"-ingång — då låter vi menyn FLYTA transparent ovanpå bilden
  // (istället för en egen solid stapel ovanför) för ett intryck likt stora
  // hotell-/spa-sajter, med headline och CTA liggande direkt i fotot.
  const firstSection = page.sections[0];
  const overlayHeader =
    page.path === "/" && firstSection?.type === "hero" && (firstSection.layout || "centered") === "overlay-bottom";
  const restSections = overlayHeader ? page.sections.slice(1) : page.sections;

  // Sektionen direkt under hero fick annars ALLTID samma mekaniska
  // grå/vit-växling (jämnt/udda sektionsindex) — vilket i praktiken innebar
  // att nästan varje sajt fick exakt samma "hero, sen en grå ruta"-känsla
  // rakt av. Den här stabila (inte slumpad vid varje visning — den måste ge
  // samma resultat i chattredigeraren som på den publicerade sajten) men
  // per-SIDA varierande förskjutningen gör att ungefär hälften av
  // sidorna/sajterna istället får en vit (inte grå) sektion direkt efter
  // hero. Baseras på sidans path, inte sajtens övriga innehåll, så den
  // håller sig stabil även när Millie ändrar texten på sidan.
  let altSeed = 0;
  for (let i = 0; i < page.path.length; i++) altSeed = (altSeed * 31 + page.path.charCodeAt(i)) >>> 0;
  const altOffset = altSeed % 2;

  // Cookiebannern ska synas automatiskt på en RIKTIG sajt (alla sidor,
  // besökaren klickar runt) men aldrig i de små, icke-interaktiva
  // /forslag-miniatyrerna (sex stycken på samma skärm samtidigt) — basePath
  // är satt precis när förhandsvisningen är den klickbara, "riktiga"
  // varianten (se app/webbplats), så den används som villkor här. Samma
  // villkor styr om Google Analytics/Meta Pixel och vår egen
  // besöksräkning över huvud taget kan bli aktuella (se nedan) — ingen
  // anledning att ladda in spårning i en miniatyr eller i kundens egen
  // redigeringsvy.
  const showCookieBanner = !!basePath;

  // Cookie-samtycket ägs här (inte i CookieBanner) eftersom
  // TrackingScripts nedan också behöver veta det — båda ska reagera
  // direkt när besökaren klickar "Alla cookies", utan omladdning.
  const [cookieChoice, setCookieChoice] = useState<"pending" | "necessary" | "all">("pending");
  useEffect(() => {
    if (!showCookieBanner) return;
    try {
      const saved = window.localStorage.getItem("yc_cookie_consent");
      if (saved === "all" || saved === "necessary") setCookieChoice(saved);
    } catch {
      // Privat läge/blockerad lagring — bannern visas då varje gång,
      // spårning förblir avstängd tills besökaren uttryckligen godkänner
      // den i just den här sessionen.
    }
  }, [showCookieBanner]);
  const decideCookies = (value: "all" | "necessary") => {
    try {
      window.localStorage.setItem("yc_cookie_consent", value);
    } catch {
      // Se kommentaren ovan — valet gäller då bara den här sidvisningen.
    }
    setCookieChoice(value);
  };

  return (
    // "@container": gör att alla @3xl:-klasser nedan (ersätter de gamla
    // md:-klasserna) mäter mot DEN HÄR rutans egen bredd istället för hela
    // webbläsarfönstret. Annars gissade layouten fel i chattredigerarens
    // smalare förhandsvisningsruta (/redigera) — en bred/högupplöst skärm
    // kunde trigga "stor skärm"-layouten (höga hero-bilder, datormeny)
    // trots att rutan själv var mycket smalare än fönstret, vilket klippte
    // bilder hårt med object-cover och gav en "inzoomad", instängd känsla
    // istället för den tänkta breda, maffiga bilden. På den riktiga,
    // publika sajten (där rutan alltid är lika bred som fönstret) ger detta
    // exakt samma resultat som förut.
    <div className={`${fontClass} @container`} style={{ background: palette.bg, color: palette.text }}>
      <div className={overlayHeader ? "relative" : undefined}>
        <Header
          siteName={siteName}
          logoUrl={content.logoUrl}
          pages={content.pages}
          palette={palette}
          activePath={page.path}
          basePath={basePath}
          onNavigate={onNavigate}
          overlay={overlayHeader}
          layout={headerLayout}
        />
        {overlayHeader && firstSection && (
          <SectionBlock
            section={firstSection}
            accent={accent}
            secondary={secondary}
            mode={mode}
            palette={palette}
            alt={false}
            socialLinks={content.socialLinks}
            buttonShape={buttonShape}
            heroEmphasis
            basePath={basePath}
            siteId={siteId}
            onNavigate={onNavigate}
            pagePath={page.path}
            editable={editable}
            selectedImageKey={selectedImageKey}
            onSelectImage={onSelectImage}
            selectedSectionKey={selectedSectionKey}
            onSelectSection={onSelectSection}
            selectedFieldKey={selectedFieldKey}
            onSelectField={onSelectField}
          />
        )}
      </div>
      {isPrivacyPolicyPage ? (
        <PrivacyPolicyBlock text={privacyPolicyText!} palette={palette} />
      ) : newsDetailMatch ? (
        <NewsArticleDetail
          article={newsDetailMatch.article}
          listPath={newsDetailMatch.page.path}
          palette={palette}
          basePath={basePath}
          onNavigate={onNavigate}
        />
      ) : restSections.length === 0 ? (
        // En nyss skapad sida (via "Sidor" i redigeraren) har inget
        // innehåll än — precis som den tomma nyhetslistan (se newsList
        // nedan) visar vi en vänlig platshållartext istället för en helt
        // tom yta mellan header och sidfot, tills kunden bett Millie
        // fylla den.
        <div className="px-10 py-24 text-center" style={{ color: palette.textDim }}>
          <p className="text-[14.5px]">Den här sidan har inget innehåll än — berätta för Millie vad den ska handla om.</p>
        </div>
      ) : (
        restSections.map((section, i) => (
          <SectionBlock
            key={section.id}
            section={section}
            accent={accent}
            secondary={secondary}
            mode={mode}
            palette={palette}
            alt={((overlayHeader ? i + 1 : i) + altOffset) % 2 === 1}
            socialLinks={content.socialLinks}
            buttonShape={buttonShape}
            // Startsidans första sektion är besökarens allra första intryck —
            // ska kännas som en "wow"-ingång. Gäller bara hero överst på "/".
            heroEmphasis={!overlayHeader && page.path === "/" && i === 0}
            basePath={basePath}
            siteId={siteId}
            onNavigate={onNavigate}
            pagePath={page.path}
            editable={editable}
            selectedImageKey={selectedImageKey}
            onSelectImage={onSelectImage}
            selectedSectionKey={selectedSectionKey}
            onSelectSection={onSelectSection}
            selectedFieldKey={selectedFieldKey}
            onSelectField={onSelectField}
            newsArticles={newsArticles}
          />
        ))
      )}
      <Footer
        siteName={siteName}
        logoUrl={content.logoUrl}
        pages={content.pages}
        activePath={page.path}
        palette={palette}
        socialLinks={content.socialLinks}
        basePath={basePath}
        onNavigate={onNavigate}
        privacyPolicyMode={privacyPolicyMode}
        privacyPolicyFileUrl={privacyPolicyFileUrl}
      />
      {showCookieBanner && cookieChoice === "pending" && (
        <CookieBanner
          palette={palette}
          policyHref={
            privacyPolicyMode === "generated"
              ? `${basePath}${PRIVACY_POLICY_PATH}`
              : privacyPolicyMode === "uploaded"
              ? privacyPolicyFileUrl || undefined
              : undefined
          }
          onDecide={decideCookies}
        />
      )}
      {showCookieBanner && cookieChoice === "all" && (
        <TrackingScripts gaMeasurementId={content.gaMeasurementId} metaPixelId={content.metaPixelId} />
      )}
      {showCookieBanner && siteId && <PageviewBeacon siteId={siteId} path={page.path} />}
    </div>
  );
}

// Minimal "markdown-lite"-rendering av den genererade policytexten (se
// lib/privacyPolicyTemplate.ts) — bara "## "-rubriker och
// tomrad-separerade stycken, det är allt mallen någonsin producerar.
function PrivacyPolicyBlock({ text, palette }: { text: string; palette: Palette }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="px-8 @3xl:px-14 py-14 max-w-[720px] mx-auto">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <h2 key={i} className="font-serif text-[22px] mt-9 mb-3 first:mt-0">
            {block.slice(3)}
          </h2>
        ) : (
          <p key={i} className="text-[14.5px] leading-relaxed mb-3" style={{ color: palette.textDim }}>
            {block}
          </p>
        )
      )}
    </div>
  );
}

// Läsvyn för EN artikel — öppnas när activePath pekar på
// "<nyhetssidans path>/<slug>" för en publicerad artikel (se
// newsDetailMatch i SitePreview ovan). Artiklar lever i sin egen tabell
// (site_news_articles), inte i content.pages, så den här vyn renderas
// direkt i SitePreview istället för att gå via den vanliga
// sektions-switchen i SectionBlockInner.
function NewsArticleDetail({
  article,
  listPath,
  palette,
  basePath,
  onNavigate,
}: {
  article: NewsArticle;
  listPath: string;
  palette: Palette;
  basePath?: string;
  onNavigate?: (path: string) => void;
}) {
  const paragraphs = article.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })
    : null;
  return (
    <div className="px-8 @3xl:px-14 py-14 max-w-[720px] mx-auto">
      <CtaLink
        link={listPath}
        basePath={basePath}
        onNavigate={onNavigate}
        className="text-[13px] font-semibold mb-6 inline-block"
        style={{ color: palette.textDim }}
      >
        ← Alla nyheter
      </CtaLink>
      {article.image_url && (
        <div className="rounded-2xl overflow-hidden mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image_url} alt={article.title} className="w-full h-auto object-cover" />
        </div>
      )}
      <h1 className="font-serif text-[30px] @3xl:text-[36px] leading-tight mb-2">{article.title}</h1>
      {publishedDate && (
        <div className="text-[13px] mb-7" style={{ color: palette.textDim }}>
          {publishedDate}
        </div>
      )}
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[15px] leading-relaxed mb-4" style={{ color: palette.textDim }}>
          {p}
        </p>
      ))}
    </div>
  );
}

// Enkel cookiebanner, visas automatiskt (se showCookieBanner ovan) tills
// besökaren gjort ett val — valet (och var det faktiskt sparas i
// localStorage) ägs av SitePreview, inte här, eftersom TrackingScripts
// också behöver känna till det, se cookieChoice ovan.
function CookieBanner({
  palette,
  policyHref,
  onDecide,
}: {
  palette: Palette;
  policyHref?: string;
  onDecide: (value: "all" | "necessary") => void;
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 sm:px-8"
      style={{ background: palette.cardBg, borderTop: `1px solid ${palette.cardBorder}`, boxShadow: "0 -8px 24px rgba(0,0,0,0.08)" }}
    >
      <p className="text-[12.5px] leading-relaxed max-w-[560px]" style={{ color: palette.textDim }}>
        Vi använder cookies för att ge dig en bättre upplevelse.{" "}
        {policyHref && (
          <a href={policyHref} target={policyHref.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="underline" style={{ color: palette.text }}>
            Läs mer i vår integritetspolicy
          </a>
        )}
      </p>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onDecide("necessary")}
          className="text-[12.5px] font-semibold px-4 py-2 rounded-lg border"
          style={{ borderColor: palette.cardBorder, color: palette.text }}
        >
          Endast nödvändiga
        </button>
        <button
          type="button"
          onClick={() => onDecide("all")}
          className="text-[12.5px] font-semibold px-4 py-2 rounded-lg bg-accent text-accent-ink"
        >
          Acceptera alla
        </button>
      </div>
    </div>
  );
}

// Kundens egen Google Analytics/Meta Pixel (se SiteContent.gaMeasurementId
// i lib/contentModel.ts) — renderas bara efter att besökaren uttryckligen
// godkänt "Alla cookies" (se cookieChoice ovan), aldrig innan. Så fort
// kunden kopplar ett ID (sajtinställningarna i chattredigeraren, eller
// genom att be Millie om det) börjar de dyka upp här automatiskt, utan
// någon ytterligare kod.
function TrackingScripts({ gaMeasurementId, metaPixelId }: { gaMeasurementId?: string; metaPixelId?: string }) {
  return (
    <>
      {gaMeasurementId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`} strategy="afterInteractive" />
          <Script id="yc-ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}');`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <>
          <Script id="yc-meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`} alt="" />
          </noscript>
        </>
      )}
    </>
  );
}

// Vårt eget, cookiefria sidvisningsräknare — se app/api/analytics/track och
// /statistik (kundportalen). Till skillnad från GA/Pixel ovan kräver den
// INGET samtycke: ingen cookie, inget sparat besökar-id, bara en siffra
// per sida och dag i vår egen databas. "fire and forget" — misslyckas
// anropet (nätverk nere, adblocker) stör det aldrig besökarens sidvisning.
function PageviewBeacon({ siteId, path }: { siteId: string; path: string }) {
  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, path, referrer: document.referrer || undefined }),
      keepalive: true,
    }).catch(() => {});
  }, [siteId, path]);
  return null;
}

function Header({
  siteName,
  logoUrl,
  pages,
  palette,
  activePath,
  basePath,
  onNavigate,
  overlay,
  layout = "left",
}: {
  siteName?: string;
  logoUrl?: string;
  pages: SiteContent["pages"];
  palette: Palette;
  activePath?: string;
  basePath?: string;
  // Satt av chattredigeraren (/redigera) istället för basePath — sidbyte
  // ska där ske utan en full sidladdning (annars tappas chatt-historiken),
  // så menyn blir klickbara knappar som uppdaterar activePath i
  // förälderns state istället för en vanlig länk.
  onNavigate?: (path: string) => void;
  // true när headern "flyter" transparent ovanpå startsidans fullbreda
  // hero-bild (se overlay-bottom-layouten i SitePreview) istället för att
  // vara en egen solid stapel ovanför — det där "wow"-intrycket kunden
  // efterfrågade, med menyn indragen i själva bilden.
  overlay?: boolean;
  // Headerns uppbyggnad — se HeaderLayout i lib/contentModel.ts, bunden
  // till sajtens stilvariant (lib/themeVariants.ts). "left" om inget annat
  // anges, samma som innan den här axeln fanns.
  layout?: HeaderLayout;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const homeHref = (p: string) => (basePath ? `${basePath}${p === "/" ? "" : p}` : "#");
  const linkColor = (active: boolean) =>
    overlay ? (active ? "#FFFFFF" : "rgba(255,255,255,0.8)") : active ? palette.text : palette.textDim;
  const hamburgerColor = overlay ? "#FFFFFF" : palette.text;

  const logoEl = logoUrl ? (
    // Loggan är kundens egen bild — ska vara ett tydligt kännetecken i
    // headern, inte en liten ikon. ~3x tidigare storlek (h-8 → h-24).
    // Ovanpå en foto-hero får den en ljus platta bakom sig så den
    // alltid syns oavsett hur ljus/mörk loggan själv är.
    <div className={overlay ? "bg-white/90 rounded-lg px-3 py-1.5" : ""}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={siteName || "Logga"}
        className={overlay ? "h-12 @3xl:h-16 max-w-[220px] object-contain" : "h-16 @3xl:h-24 max-w-[320px] object-contain"}
      />
    </div>
  ) : (
    <span className={`font-serif italic text-[19px] ${overlay ? "text-white" : ""}`}>
      {siteName || "Ditt företag"}
    </span>
  );

  // Tak på antal länkar i toppmenyn — höjt från 5 till 8 (matchar
  // footerns gräns nedan) så en nytillagd sida inte "försvinner" ur
  // menyn bara därför att sajten redan hade fem sidor sedan onboardingen.
  const navLinksEl = pages.slice(0, 8).map((p) =>
    onNavigate ? (
      <button
        key={p.path}
        type="button"
        onClick={() => onNavigate(p.path)}
        style={{ color: linkColor(p.path === activePath) }}
      >
        {p.label}
      </button>
    ) : basePath ? (
      // Vanlig <a> istället för next/link — denna förhandsvisning är
      // bara en lekstuga-webbläsare, ingen riktig SPA, och ett klick
      // ska alltid ge en helt färsk sidladdning. next/link kunde i
      // vissa fall återanvända en cachad klient-navigering även med
      // staleTimes satt till 0 (känt Next.js-beteende), vilket var
      // orsaken till att en del undersidors bilder bara syntes efter
      // en manuell omladdning.
      <a key={p.path} href={homeHref(p.path)} style={{ color: linkColor(p.path === activePath) }}>
        {p.label}
      </a>
    ) : (
      <span key={p.path} style={{ color: linkColor(p.path === activePath) }}>
        {p.label}
      </span>
    )
  );

  // Hamburgarmeny — syns bara under brytpunkten, fäller ut en enkel lista
  // med sidorna. Container-query (@3xl, se tailwind.config.ts) istället
  // för md: — menyn ska reagera på RUTANS egen bredd, inte hela fönstrets,
  // annars blir den felaktigt "desktop" i t.ex. den smalare
  // webbläsarrutan i /redigera trots gott om utrymme i fönstret.
  const hamburgerBtn = (
    <button
      type="button"
      onClick={() => setMenuOpen((v) => !v)}
      aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
      aria-expanded={menuOpen}
      className="@3xl:hidden flex flex-col items-center justify-center gap-[5px] w-9 h-9 flex-shrink-0"
    >
      <span
        className="block w-[18px] h-[2px] rounded-full transition-transform"
        style={{ background: hamburgerColor, transform: menuOpen ? "translateY(3.5px) rotate(45deg)" : undefined }}
      />
      <span
        className="block w-[18px] h-[2px] rounded-full transition-transform"
        style={{ background: hamburgerColor, transform: menuOpen ? "translateY(-3.5px) rotate(-45deg)" : undefined }}
      />
    </button>
  );

  // Utfällbar mobilpanel — positioneras "absolute" mot HELA headern (den
  // yttersta div:en i varje layout-gren nedan är alltid en positionerad
  // förälder, se outerBase), oavsett om headern i övrigt är en eller två
  // rader.
  const mobileMenuEl = menuOpen && (
    <div
      className="@3xl:hidden absolute top-full left-0 right-0 z-20 flex flex-col py-2 shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
      style={{ background: palette.cardBg, borderBottom: `1px solid ${palette.cardBorder}` }}
    >
      {pages.slice(0, 8).map((p) =>
        onNavigate ? (
          <button
            key={p.path}
            type="button"
            onClick={() => {
              onNavigate(p.path);
              setMenuOpen(false);
            }}
            className="px-8 py-3 text-[14px] font-semibold text-left"
            style={{ color: p.path === activePath ? palette.text : palette.textDim }}
          >
            {p.label}
          </button>
        ) : basePath ? (
          <a
            key={p.path}
            href={homeHref(p.path)}
            onClick={() => setMenuOpen(false)}
            className="px-8 py-3 text-[14px] font-semibold"
            style={{ color: p.path === activePath ? palette.text : palette.textDim }}
          >
            {p.label}
          </a>
        ) : (
          <span
            key={p.path}
            className="px-8 py-3 text-[14px] font-semibold"
            style={{ color: p.path === activePath ? palette.text : palette.textDim }}
          >
            {p.label}
          </span>
        )
      )}
    </div>
  );

  // OBS: "relative"/"absolute" väljs som ETT ENDA uttryck, aldrig båda
  // klasserna samtidigt — Tailwinds genererade CSS-ordning låter annars
  // "relative" vinna över "absolute" oavsett klassordning i strängen,
  // vilket en gång redan orsakade en osynlig hero-bild (se ImageOrArt).
  const outerBase = overlay ? "absolute top-0 left-0 right-0 z-10" : "relative";
  const outerStyle = overlay
    ? { background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)" }
    : { borderBottom: `1px solid ${palette.cardBorder}` };

  if (layout === "centered-stacked") {
    // Loggan centrerad på en egen rad, menyn centrerad på raden under —
    // grid med symmetriska yttre kolumner (1fr/auto/1fr) håller loggan
    // visuellt centrerad oavsett om hamburgarknappen syns eller ej.
    return (
      <div className={`${outerBase} px-8 @3xl:px-12 py-5`} style={outerStyle}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <div className="justify-self-center">{logoEl}</div>
          <div className="justify-self-end">{hamburgerBtn}</div>
        </div>
        <nav className="hidden @3xl:flex items-center justify-center gap-7 text-[13px] font-semibold mt-3">
          {navLinksEl}
        </nav>
        {mobileMenuEl}
      </div>
    );
  }

  if (layout === "split") {
    // Logga vänster, menyn centrerad i mitten (inte högerjusterad som i
    // "left") — samma symmetriska 1fr/auto/1fr-grid som ovan, fast på en
    // enda rad.
    return (
      <div className={`${outerBase} grid grid-cols-[1fr_auto_1fr] items-center px-8 @3xl:px-12 py-4`} style={outerStyle}>
        <div className="flex items-center gap-2.5">{logoEl}</div>
        <nav className="hidden @3xl:flex items-center gap-7 text-[13px] font-semibold justify-self-center">
          {navLinksEl}
        </nav>
        <div className="flex justify-end">{hamburgerBtn}</div>
        {mobileMenuEl}
      </div>
    );
  }

  // "left" (standard) — logga vänster, meny höger, som innan den här
  // stilaxeln fanns.
  return (
    <div className={`${outerBase} flex items-center justify-between px-8 @3xl:px-12 py-4`} style={outerStyle}>
      <div className="flex items-center gap-2.5">{logoEl}</div>
      <nav className="hidden @3xl:flex items-center gap-7 text-[13px] font-semibold">{navLinksEl}</nav>
      {hamburgerBtn}
      {mobileMenuEl}
    </div>
  );
}

function Footer({
  siteName,
  logoUrl,
  pages,
  activePath,
  palette,
  socialLinks,
  basePath,
  onNavigate,
  privacyPolicyMode,
  privacyPolicyFileUrl,
}: {
  siteName?: string;
  logoUrl?: string;
  // Hela sajtens sidlista — sidfotsmenyn visar samma sidor som
  // huvudmenyn (se Header ovan), så besökaren alltid kan ta sig vidare
  // härifrån också, inte bara via toppen av sidan.
  pages: SiteContent["pages"];
  activePath?: string;
  palette: Palette;
  socialLinks?: SocialLink[];
  basePath?: string;
  onNavigate?: (path: string) => void;
  privacyPolicyMode?: "uploaded" | "generated" | null;
  privacyPolicyFileUrl?: string | null;
}) {
  // "uploaded" länkar rakt till kundens egen fil (ny flik); "generated" går
  // till den genererade sidan på /integritetspolicy. Finns ingen policy
  // alls (mode null/ej satt) visas ingen länk — det finns inget att länka
  // till.
  const policyHref =
    privacyPolicyMode === "uploaded"
      ? privacyPolicyFileUrl || undefined
      : privacyPolicyMode === "generated"
      ? `${basePath || ""}/integritetspolicy`
      : undefined;
  const homeHref = (p: string) => (basePath ? `${basePath}${p === "/" ? "" : p}` : "#");
  const linkClass = "text-[12.5px] font-semibold";

  return (
    <div style={{ borderTop: `1px solid ${palette.cardBorder}` }}>
      {/* Sidfotsmenyn — samma sidor, samma tre-vägs länklogik som
          huvudmenyn (onNavigate i chattredigeraren, riktig <a href> på en
          publicerad sida, annars bara text i /forslag-miniatyrerna). */}
      <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-8 @3xl:px-12 py-5 text-[12.5px]">
        {pages.slice(0, 8).map((p) =>
          onNavigate ? (
            <button
              key={p.path}
              type="button"
              onClick={() => onNavigate(p.path)}
              className={linkClass}
              style={{ color: p.path === activePath ? palette.text : palette.textDim }}
            >
              {p.label}
            </button>
          ) : basePath ? (
            <a
              key={p.path}
              href={homeHref(p.path)}
              className={linkClass}
              style={{ color: p.path === activePath ? palette.text : palette.textDim }}
            >
              {p.label}
            </a>
          ) : (
            <span key={p.path} className={linkClass} style={{ color: p.path === activePath ? palette.text : palette.textDim }}>
              {p.label}
            </span>
          )
        )}
      </nav>

      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 @3xl:px-12 py-6 text-[12px]"
        style={{ borderTop: `1px solid ${palette.cardBorder}`, color: palette.textDim }}
      >
        <span className="flex items-center gap-4 flex-wrap justify-center">
          <span className="flex items-center gap-2">
            {/* Samma logga som headern, bara litet skalad ner — en liten,
                diskret upprepning är det kunder faktiskt förväntar sig i en
                sidfot, inte en kopia i headerstorlek. */}
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName || "Logga"} className="h-5 max-w-[90px] object-contain" />
            )}
            <span>{siteName || "Ditt företag"} · Byggd med YourCoSite</span>
          </span>
          {policyHref && (
            <a
              href={policyHref}
              target={privacyPolicyMode === "uploaded" ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="underline"
            >
              Integritetspolicy
            </a>
          )}
        </span>
        {socialLinks && socialLinks.length > 0 && <SocialIcons socialLinks={socialLinks} palette={palette} />}
      </div>
    </div>
  );
}

// Kundens egna sociala medier-länkar (satta i kod från onboarding steg 2,
// aldrig valda av AI:n). Rund badge i plattformens egen färg med en
// igenkännbar logotyp-glyf för varje plattform.
function SocialIcons({ socialLinks, palette }: { socialLinks: SocialLink[]; palette: Palette }) {
  return (
    <div className="flex items-center gap-2">
      {socialLinks.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          title={socialPlatformLabel(s.platform)}
          aria-label={socialPlatformLabel(s.platform)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ background: socialPlatformColor(s.platform) }}
        >
          <SocialGlyph id={s.platform} size={15} />
        </a>
      ))}
    </div>
  );
}

// "fill" = true när boxen själv ska vara absolut positionerad och fylla sin
// förälder (t.ex. startsidans fullbreda "overlay-bottom"-hero), istället för
// att ha en egen explicit höjd. VIKTIGT: måste vara en egen prop, inte bara
// skickas in via className som "absolute inset-0" — Tailwind låter annars
// klassen "relative" (som boxen alltid har som grundklass) vinna över
// "absolute" oavsett vilken ordning klasserna står i, så boxen (och bilden i
// den) kollapsade till 0 pixlars höjd och blev osynlig. Det var den faktiska
// orsaken till att startsidans hero-bild aldrig syntes.
// selectable/selected/onSelect: bara satta när förhandsvisningen körs INUTI
// chattredigeraren (se SitePreview-proppen "editable" nedan) — låter kunden
// klicka direkt på en bild i förhandsvisningen istället för att beskriva
// den i ord ("byt bilden på A2…"). Det löste en verklig förväxlingsrisk:
// ett otydligt "byt bilden" i chatten gav AI:n inget sätt att veta VILKEN
// bild på sidan kunden menade (se selection-fältet i app/api/sites/edit).
function ImageOrArt({
  imageUrl,
  art,
  className,
  dark,
  fill,
  selectable,
  selected,
  onSelect,
}: {
  imageUrl?: string;
  art: string;
  className?: string;
  dark?: boolean;
  fill?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`${fill ? "absolute inset-0" : "relative"} overflow-hidden group ${selectable ? "cursor-pointer" : ""} ${className || ""}`}
      style={{ background: art, outline: selected ? "3px solid #C6FF5E" : undefined, outlineOffset: selected ? "-3px" : undefined }}
      onClick={selectable ? (e) => { e.stopPropagation(); onSelect?.(); } : undefined}
      role={selectable ? "button" : undefined}
      aria-pressed={selectable ? !!selected : undefined}
    >
      {imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {dark && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.18)" }} />}
        </>
      )}
      {selectable && (
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ background: selected ? "rgba(12,16,4,0.28)" : "rgba(12,16,4,0.38)" }}
        >
          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: selected ? "#C6FF5E" : "#FFFFFF", color: "#0C1004" }}
          >
            {selected ? "✓ Vald" : "Klicka för att välja"}
          </span>
        </div>
      )}
    </div>
  );
}

// Gör en CTA-knapp/text klickbar om sektionen har en ctaLink, enligt samma
// mönster som Header redan använder för menyn: onNavigate (chattredigeraren,
// ingen sidladdning) går först, annars en riktig <a href> mot basePath (en
// publicerad sida), annars en ren <span> — exakt som innan ctaLink fanns.
function CtaLink({
  link,
  basePath,
  onNavigate,
  className,
  style,
  children,
}: {
  link?: string;
  basePath?: string;
  onNavigate?: (path: string) => void;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (!link) {
    return <span className={className} style={style}>{children}</span>;
  }
  const isExternal = /^https?:\/\//i.test(link);
  if (onNavigate && !isExternal) {
    return (
      <button type="button" onClick={() => onNavigate(link)} className={className} style={style}>
        {children}
      </button>
    );
  }
  const href = isExternal ? link : basePath ? `${basePath}${link === "/" ? "" : link}` : "#";
  return (
    <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className={className} style={style}>
      {children}
    </a>
  );
}

// Tre knappformer, valda per stilvariant (se lib/themeVariants.ts) —
// bestämmer hur varje call-to-action-knapp på sajten ser ut, inte bara
// hero-knappen. "pill"/"square" är fyllda (samma som den ursprungliga,
// enda formen som fanns innan), "underline" är en nedtonad textlänk med en
// accentfärgad linje under — håller textfärgen i sajtens vanliga bläckton
// (textColor) istället för accentfärgen själv, så den alltid är läsbar
// oavsett hur ljus/mörk kundens valda accentfärg råkar vara.
function CtaPill({
  accent,
  children,
  link,
  basePath,
  onNavigate,
  shape = "pill",
  textColor,
}: {
  accent: string;
  children: React.ReactNode;
  link?: string;
  basePath?: string;
  onNavigate?: (path: string) => void;
  shape?: ButtonStyle;
  textColor?: string;
}) {
  if (shape === "underline") {
    return (
      <CtaLink
        link={link}
        basePath={basePath}
        onNavigate={onNavigate}
        className="inline-flex items-center font-semibold text-[13.5px] uppercase tracking-[0.07em] pb-1 border-b-2"
        style={{ borderColor: accent, color: textColor }}
      >
        {children}
      </CtaLink>
    );
  }
  return (
    <CtaLink
      link={link}
      basePath={basePath}
      onNavigate={onNavigate}
      className={`inline-block font-semibold text-[14px] px-7 py-3.5 ${shape === "square" ? "rounded-md" : "rounded-full"}`}
      style={{ background: accent, color: "#17171A" }}
    >
      {children}
    </CtaLink>
  );
}

// Beskrivs i SitePreview-kommentaren nedan (samma "editable"-koncept) —
// pekar exakt ut en bild i innehållsmodellen, se ImageSelection i
// app/api/sites/edit/route.ts (samma form, hålls i synk för hand).
type ImageSelection = {
  pagePath: string;
  sectionId: string;
  kind: "hero" | "gridItem" | "galleryItem";
  itemIndex?: number;
  label: string;
};

// Samma idé, fast för ETT ENSKILT textfält (rubrik, brödtext, ett citat …)
// istället för en hel sektion — "field" matchar EXAKT fältnamnet i
// innehållsmodellen (lib/contentModel.ts), t.ex. "headline" eller
// "items.1.title" för en rad i en lista, så /api/sites/edit kan peka
// Claude rakt på rätt JSON-nod utan att behöva gissa.
type FieldSelection = {
  pagePath: string;
  sectionId: string;
  field: string;
  label: string;
};

function snippet(text: string, max = 44): string {
  const t = (text || "").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

// Tunt klickbart omslag runt ETT textfält — samma grundmönster som
// ImageOrArt (hover visar "Klicka för att välja", vald visar en bock),
// fast ritat som en ram runt texten istället för ovanpå en bild. "as"
// väljer vilken tagg själva texten renderas med (h1/h2/p/div …) så
// typografin blir exakt densamma som innan fältet blev klickbart.
function Field({
  editable,
  selected,
  onSelect,
  as: Tag = "div",
  className,
  style,
  children,
}: {
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (!editable) {
    const Plain = Tag;
    return <Plain className={className} style={style}>{children}</Plain>;
  }
  const Inner = Tag;
  return (
    <div
      className="relative group/fld cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <Inner className={className} style={style}>
        {children}
      </Inner>
      <div
        className={`pointer-events-none absolute -inset-1 rounded transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/fld:opacity-100"
        }`}
        style={{ outline: selected ? "2px solid #4A90D9" : "2px dashed #4A90D9", outlineOffset: "1px" }}
      />
    </div>
  );
}

// Samma idé som Field, fast för en KNAPPTEXT (CtaPill/CtaLink) — en knapp
// gör redan något när man klickar på den (navigerar till länken, eller
// inget om den saknar länk), så att lägga Fields klick-för-att-markera
// direkt på knappen skulle krocka med det och göra det omöjligt att
// testa länken. Istället läggs en liten, alltid svagt synlig
// pennknapp i hörnet — klickar man DEN markeras knapptexten, klickar
// man knappen själv gör den precis vad den alltid gjort. Alltid svagt
// synlig (inte bara vid hover) så den går att upptäcka på mobil också,
// där det inte finns någon hover-status.
function FieldBadge({
  editable,
  selected,
  onSelect,
  children,
}: {
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  if (!editable) return <>{children}</>;
  return (
    // onClick (utan stopPropagation) på själva KNAPPEN (CtaPill/CtaLink)
    // skulle annars bubbla vidare upp till sektionens egen
    // klicka-för-att-välja (SectionBlock) och sätta en sektionsmarkering
    // EFTER att knappens egen onNavigate redan hunnit nollställa
    // markeringen i samma klick — nettot blev att man navigerade dit man
    // skulle, men satt kvar med en spökmarkering på den gamla sidan.
    // Stoppar bubblingen här, oavsett om klicket landade på knappen eller
    // pennan.
    <span className="relative inline-block group/ctafld" onClick={(e) => e.stopPropagation()}>
      {children}
      <span
        className={`pointer-events-none absolute -inset-1.5 rounded-full transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/ctafld:opacity-100"
        }`}
        style={{ outline: selected ? "2px solid #4A90D9" : "2px dashed #4A90D9", outlineOffset: "2px" }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSelect?.();
        }}
        aria-label="Markera knapptexten"
        title="Markera knapptexten (utan att klicka på knappen)"
        className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow transition-opacity ${
          selected ? "opacity-100" : "opacity-45"
        }`}
        style={{ background: selected ? "#C6FF5E" : "#FFFFFF", color: "#0C1004", border: "1px solid rgba(0,0,0,0.15)" }}
      >
        ✎
      </button>
    </span>
  );
}

// Det RIKTIGA, ifyllbara kontaktformuläret (ContactFormSection) — en egen
// toppnivåkomponent (inte en nästlad funktion inne i SectionBlockInner)
// eftersom den har sitt eget useState för fälten/skickat-status: en
// nästlad komponent skulle få en NY komponent-identitet varje render av
// den omgivande sektionen och tappa sitt tillstånd (bli "osänt" igen) vid
// varje orelaterad omrendering av sidan.
function ContactFormBlock({
  section,
  palette,
  accent,
  pagePath,
  siteId,
  active,
  editable,
  selected,
  onSelect,
}: {
  section: ContactFormSection;
  palette: Palette;
  accent: string;
  pagePath?: string;
  siteId?: string;
  // true bara på den RIKTIGA, publikt nåbara sajten (se siteId-kommentaren
  // i SectionBlockInner) — annars sparas inget skarpt vid "Skicka", bara
  // en lokal bekräftelse (för att kunna visa/testa utseendet i
  // chattredigeraren och /forslag-miniatyrerna).
  active: boolean;
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !siteId) {
      setStatus("sent");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/public/form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pagePath, sectionId: section.id, name, email, message }),
      });
      if (!res.ok) throw new Error("fel");
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div
        className="rounded-2xl border p-6 text-center text-[14px]"
        style={{ background: palette.cardBg, borderColor: palette.cardBorder, color: palette.textDim }}
      >
        Tack, ditt meddelande har skickats!
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border text-[14px] outline-none";
  const inputStyle = { borderColor: palette.cardBorder, background: palette.cardBg, color: palette.text };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Namn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="E-post"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />
      <textarea
        placeholder="Meddelande"
        required
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={`${inputClass} resize-none`}
        style={inputStyle}
      />
      <FieldBadge editable={editable} selected={selected} onSelect={onSelect}>
        <button
          type="submit"
          disabled={status === "sending"}
          className="font-semibold text-[14px] px-7 py-3.5 rounded-full disabled:opacity-60"
          style={{ background: accent, color: "#17171A" }}
        >
          {status === "sending" ? "Skickar…" : section.submitLabel || "Skicka"}
        </button>
      </FieldBadge>
      {status === "error" && (
        <p className="text-[12.5px] text-center" style={{ color: "#C0392B" }}>
          Något gick fel — försök igen.
        </p>
      )}
    </form>
  );
}

// Läsbar svensk etikett för en HEL sektion (inte en enskild bild) — visas i
// hover-/val-pillen nedan och skickas som selection.label till
// /api/sites/edit, så kunden kan klicka på t.ex. rubriken eller
// brödtexten i en sektion ("Om oss", en hero osv.) istället för att behöva
// beskriva i ord vilken del av sidan de menar — samma grundidé som
// bild-markeringen ovan, fast för text/hela sektionen.
function sectionLabel(section: Section): string {
  switch (section.type) {
    case "hero":
      return section.headline ? `hero-sektionen ("${section.headline}")` : "hero-sektionen";
    case "about":
      return `sektionen "${section.heading}"`;
    case "grid":
      return `sektionen "${section.heading}"`;
    case "testimonials":
      return `sektionen "${section.heading}"`;
    case "cta":
      return `sektionen "${section.heading}"`;
    case "contact":
      return `sektionen "${section.heading}"`;
    case "gallery":
      return `sektionen "${section.heading}"`;
    case "faq":
      return `sektionen "${section.heading}"`;
    case "map":
      return section.heading ? `kartsektionen "${section.heading}"` : "kartsektionen";
    case "contactForm":
      return `sektionen "${section.heading}"`;
    case "newsList":
      return `nyhetssektionen "${section.heading}"`;
    default:
      return "den här sektionen";
  }
}

function SectionBlockInner({
  section,
  accent,
  secondary,
  mode,
  palette,
  alt,
  socialLinks,
  buttonShape,
  heroEmphasis,
  basePath,
  siteId,
  onNavigate,
  pagePath,
  editable,
  selectedImageKey,
  onSelectImage,
  selectedFieldKey,
  onSelectField,
  newsArticles,
}: {
  section: Section;
  accent: string;
  secondary: string[];
  mode: BackgroundMode;
  palette: Palette;
  alt: boolean;
  socialLinks?: SocialLink[];
  // Sajtens knappform (pill/square/underline, se lib/themeVariants.ts) —
  // vidarebefordras bara till CtaPill-anropen nedan.
  buttonShape: ButtonStyle;
  // true för startsidans första sektion — ger hero-layouterna en större,
  // mer dramatisk bild/rubrik oavsett vilken layout AI:n valt.
  heroEmphasis?: boolean;
  // Vidarebefordras bara till CTA-knappen (se CtaLink) — samma
  // basePath/onNavigate som Header redan använder för menyn.
  basePath?: string;
  // Sajtens id i databasen — bara för att veta VART ett riktigt
  // kontaktformulär-inskick ska sparas (se ContactFormBlock nedan). Satt
  // ENDAST på den riktiga, publikt nåbara renderingen (se
  // SitePreview-kommentaren om siteId högre upp), aldrig i
  // chattredigerarens egen förhandsvisning eller /forslag-miniatyrerna —
  // annars skulle ett testklick i förhandsvisningen spara en skarp rad i
  // kundens formulärsvar.
  siteId?: string;
  onNavigate?: (path: string) => void;
  // Vilken sida sektionen tillhör — bara satt när editable (se nedan),
  // skickas med i selection-objektet så /api/sites/edit vet vilken sida
  // den markerade bilden ligger på.
  pagePath?: string;
  // Klicka-för-att-välja-bild, bara aktivt i chattredigeraren (/redigera)
  // — se SitePreview-proppen med samma namn.
  editable?: boolean;
  selectedImageKey?: string | null;
  onSelectImage?: (sel: ImageSelection & { key: string }) => void;
  selectedFieldKey?: string | null;
  onSelectField?: (sel: FieldSelection & { key: string }) => void;
  // Bara använt av "newsList" nedan — se NewsArticleDetail-kommentaren
  // för varför artiklarna inte ligger i content.pages.
  newsArticles?: NewsArticle[];
}) {
  const sectionBg = alt ? palette.bgAlt : undefined;
  const art = artBackground(mode, accent, secondary);

  // Stabil nyckel för en bild inom sidan — hero finns högst en gång per
  // sektion, grid-rutor är index-adresserade (ingen egen id i
  // lib/contentModel.ts).
  const heroKey = `${pagePath}::hero::${section.id}`;
  const gridItemKey = (i: number) => `${pagePath}::grid::${section.id}::${i}`;
  const heroSelection: (ImageSelection & { key: string }) | undefined =
    editable && pagePath
      ? { key: heroKey, pagePath, sectionId: section.id, kind: "hero", label: "hero-bilden" }
      : undefined;
  const gridItemSelection = (i: number, title: string): (ImageSelection & { key: string }) | undefined =>
    editable && pagePath
      ? { key: gridItemKey(i), pagePath, sectionId: section.id, kind: "gridItem", itemIndex: i, label: `bilden i rutan "${title}"` }
      : undefined;
  // Samma idé, för en bild i ett bildspel/galleri (gallery-sektionen) —
  // bildrutorna saknar egen titel att peka ut med, så etiketten räknar
  // bara upp vilken bild i galleriet det är.
  const galleryItemKey = (i: number) => `${pagePath}::gallery::${section.id}::${i}`;
  const galleryItemSelection = (i: number): (ImageSelection & { key: string }) | undefined =>
    editable && pagePath
      ? { key: galleryItemKey(i), pagePath, sectionId: section.id, kind: "galleryItem", itemIndex: i, label: `bild ${i + 1} i galleriet` }
      : undefined;

  // field matchar EXAKT egenskapsnamnet i innehållsmodellen (se
  // FieldSelection-kommentaren ovan) — "items.1.title" för rad 2 i en
  // lista, annars bara fältnamnet rakt av. desc är den svenska
  // människoläsbara delen av etiketten ("rubriken", "brödtexten" …).
  const fieldSel = (field: string, text: string | undefined, desc: string, itemIndex?: number): (FieldSelection & { key: string }) | undefined => {
    if (!editable || !pagePath || !text) return undefined;
    const fullField = itemIndex !== undefined ? `items.${itemIndex}.${field}` : field;
    return {
      key: `${pagePath}::field::${section.id}::${fullField}`,
      pagePath,
      sectionId: section.id,
      field: fullField,
      label: `${desc} ("${snippet(text)}")`,
    };
  };

  // Bara använd av "faq" nedan — vilken fråga som är utfälld just nu.
  // Ligger ovillkorat här (inte i case "faq") eftersom React Hooks måste
  // anropas i samma ordning varje render, oavsett sektionstyp.
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  // Bara använd av "newsList" nedan — vilken kategori besökaren filtrerat
  // till (null = alla). Samma skäl som ovan till att den ligger ovillkorat.
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string | null>(null);

  switch (section.type) {
    case "hero": {
      const layout = section.layout || "centered";

      if (layout === "split-left" || layout === "split-right") {
        const imageFirst = layout === "split-left";
        const imageCol = (
          <ImageOrArt
            imageUrl={section.imageUrl}
            art={art}
            className={heroEmphasis ? "h-[420px] @3xl:h-[600px]" : "h-[320px] @3xl:h-[440px]"}
            selectable={editable}
            selected={!!heroSelection && selectedImageKey === heroSelection.key}
            onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
          />
        );
        const textCol = (
          <div className={`flex flex-col justify-center px-8 @3xl:px-14 ${heroEmphasis ? "py-10 @3xl:py-0" : "py-10"} ${imageFirst ? "@3xl:text-left" : "@3xl:text-right @3xl:items-end"}`}>
            {section.eyebrow && (
              <Field
                editable={editable}
                as="div"
                className="text-[12px] tracking-[0.12em] font-semibold mb-3"
                style={{ color: accent }}
                selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
              >
                {section.eyebrow.toUpperCase()}
              </Field>
            )}
            <Field
              editable={editable}
              as="h1"
              className={`font-serif leading-[1.1] mb-4 ${heroEmphasis ? "text-[38px] @3xl:text-[48px]" : "text-[30px] @3xl:text-[36px]"}`}
              selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.headline}
            </Field>
            <Field
              editable={editable}
              as="p"
              className={`leading-relaxed mb-6 max-w-[420px] ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}
              style={{ color: palette.textDim }}
              selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
              onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
            >
              {section.body}
            </Field>
            {section.ctaLabel && (
              <FieldBadge
                editable={editable}
                selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
                onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
              >
                <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor={palette.text}>
                  {section.ctaLabel}
                </CtaPill>
              </FieldBadge>
            )}
          </div>
        );
        return (
          <div className="grid @3xl:grid-cols-2">
            {imageFirst ? (
              <>
                {imageCol}
                {textCol}
              </>
            ) : (
              <>
                {textCol}
                {imageCol}
              </>
            )}
          </div>
        );
      }

      if (layout === "overlay-bottom") {
        return (
          <div className={`relative ${heroEmphasis ? "h-[560px] @3xl:h-[720px]" : "h-[460px] @3xl:h-[560px]"}`}>
            <ImageOrArt
              imageUrl={section.imageUrl}
              art={art}
              fill
              dark
              selectable={editable}
              selected={!!heroSelection && selectedImageKey === heroSelection.key}
              onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
            />
            {/* pointer-events-none: rent dekorativt mörkertonings-lager — utan
                detta låg det OVANPÅ bilden i DOM-ordningen och fångade alla
                klick själv, så "Klicka för att välja"-rutan ovan aldrig gick
                att klicka (bilden fick aldrig klicket, bara det här lagret). */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.05) 75%)" }}
            />
            <div className={`absolute bottom-0 left-0 right-0 px-8 @3xl:px-14 pb-10 @3xl:pb-14 text-white ${heroEmphasis ? "max-w-[680px]" : "max-w-[560px]"}`}>
              {section.eyebrow && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[12px] tracking-[0.12em] font-semibold mb-3"
                  style={{ color: accent }}
                  selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                  onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                >
                  {section.eyebrow.toUpperCase()}
                </Field>
              )}
              <Field
                editable={editable}
                as="h1"
                className={`font-serif leading-[1.08] mb-4 ${heroEmphasis ? "text-[40px] @3xl:text-[56px]" : "text-[32px] @3xl:text-[42px]"}`}
                selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.headline}
              </Field>
              <Field
                editable={editable}
                as="p"
                className={`leading-relaxed mb-6 opacity-85 ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
              {section.ctaLabel && (
              <FieldBadge
                editable={editable}
                selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
                onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
              >
                {/* Fast vitt här, inte palette.text — den här knappen ligger
                    alltid ovanpå en mörk gradient/bild (text-white-lagret
                    ovan), oavsett om sajtens läge är ljust/varmt/mörkt. */}
                <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor="#FFFFFF">
                  {section.ctaLabel}
                </CtaPill>
              </FieldBadge>
            )}
            </div>
          </div>
        );
      }

      if (layout === "fade-bottom") {
        // Bilden tonar mjukt ut i sidans egen bakgrundsfärg istället för att
        // sluta med en hård kant (som "centered" nedan) eller ligga bakom en
        // mörk gradient (som "overlay-bottom" ovan) — texten ligger sedan på
        // vanlig bakgrund under, ingen egen kortruta. Ett lugnare, mer
        // organiskt alternativ som också gör att besökarens blick leds
        // naturligt vidare ner på sidan istället för att stanna i en ruta.
        return (
          <div>
            <div className={`relative ${heroEmphasis ? "h-[420px] @3xl:h-[560px]" : "h-[300px] @3xl:h-[400px]"}`}>
              <ImageOrArt
                imageUrl={section.imageUrl}
                art={art}
                fill
                dark={mode === "dark"}
                selectable={editable}
                selected={!!heroSelection && selectedImageKey === heroSelection.key}
                onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
              />
              {/* pointer-events-none: rent dekorativt uttoningslager, se
                  motsvarande kommentar vid overlay-bottom ovan. */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
                style={{ background: `linear-gradient(0deg, ${palette.bg} 0%, transparent 100%)` }}
              />
            </div>
            <div
              className={`px-8 @3xl:px-14 max-w-[620px] relative ${
                heroEmphasis ? "-mt-10 @3xl:-mt-14 pb-14" : "-mt-8 @3xl:-mt-10 pb-10"
              }`}
            >
              {section.eyebrow && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[12px] tracking-[0.12em] font-semibold mb-3"
                  style={{ color: accent }}
                  selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                  onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                >
                  {section.eyebrow.toUpperCase()}
                </Field>
              )}
              <Field
                editable={editable}
                as="h1"
                className={`font-serif leading-[1.1] mb-4 ${heroEmphasis ? "text-[36px] @3xl:text-[46px]" : "text-[28px] @3xl:text-[34px]"}`}
                selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.headline}
              </Field>
              <Field
                editable={editable}
                as="p"
                className={`leading-relaxed mb-6 ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
              {section.ctaLabel && (
                <FieldBadge
                  editable={editable}
                  selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
                  onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
                >
                  <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor={palette.text}>
                    {section.ctaLabel}
                  </CtaPill>
                </FieldBadge>
              )}
            </div>
          </div>
        );
      }

      // centered (default) — texten ligger i ett eget kort med egen
      // bakgrund som bara pekar upp i bilden en bit, istället för att
      // "sväva fritt" ovanpå den. Oavsett hur mycket text som kommer in
      // (kort eller lång rubrik/body) hamnar den alltid INUTI kortets
      // färgade yta, och aldrig utanför eller in i bilden ovanför.
      return (
        <div className="relative pb-6">
          <ImageOrArt
            imageUrl={section.imageUrl}
            art={art}
            className={heroEmphasis ? "h-[420px] @3xl:h-[580px]" : "h-[300px] @3xl:h-[380px]"}
            dark={mode === "dark"}
            selectable={editable}
            selected={!!heroSelection && selectedImageKey === heroSelection.key}
            onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
          />
          <div
            className={`max-w-2xl mx-auto text-center px-8 @3xl:px-12 relative rounded-2xl ${
              heroEmphasis ? "py-12 @3xl:py-16 -mt-16 @3xl:-mt-20" : "py-10 @3xl:py-12 -mt-14 @3xl:-mt-16"
            }`}
            style={{ background: palette.cardBg, boxShadow: "0 16px 40px rgba(0,0,0,0.10)" }}
          >
            {section.eyebrow && (
              <Field
                editable={editable}
                as="div"
                className="text-[12px] tracking-[0.12em] font-semibold mb-4"
                style={{ color: accent }}
                selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
              >
                {section.eyebrow.toUpperCase()}
              </Field>
            )}
            <Field
              editable={editable}
              as="h1"
              className={`font-serif leading-[1.12] mb-5 ${heroEmphasis ? "text-[38px] @3xl:text-[48px]" : "text-[32px] @3xl:text-[40px]"}`}
              selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.headline}
            </Field>
            <Field
              editable={editable}
              as="p"
              className={`leading-relaxed mb-7 ${heroEmphasis ? "text-[16.5px]" : "text-[15.5px]"}`}
              style={{ color: palette.textDim }}
              selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
              onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
            >
              {section.body}
            </Field>
            {section.ctaLabel && (
              <FieldBadge
                editable={editable}
                selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
                onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
              >
                <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor={palette.text}>
                  {section.ctaLabel}
                </CtaPill>
              </FieldBadge>
            )}
          </div>
        </div>
      );
    }

    case "about": {
      const layout = section.layout || "text-left";

      if (layout === "centered") {
        // Smalare och centrerad — känns mer redaktionell/luftig än den
        // vänsterställda standardversionen nedan. Se lib/siteContentSchema.ts.
        return (
          <div className="px-10 py-16 max-w-[560px] mx-auto text-center" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-4"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <Field
              editable={editable}
              as="p"
              className="text-[15px] leading-relaxed"
              style={{ color: palette.textDim }}
              selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
              onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
            >
              {section.body}
            </Field>
          </div>
        );
      }

      // text-left (default) — vänsterställd, bredare text.
      return (
        <div className="px-10 py-14 max-w-[680px] mx-auto" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-4"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <Field
            editable={editable}
            as="p"
            className="text-[15px] leading-relaxed"
            style={{ color: palette.textDim }}
            selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
            onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
          >
            {section.body}
          </Field>
        </div>
      );
    }

    case "grid": {
      const layout = section.layout || "cards";

      if (layout === "alternating-rows") {
        return (
          <div className="py-4" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-2 text-center pt-10"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              const imageFirst = i % 2 === 0;
              const itemSel = gridItemSelection(i, item.title);
              const imageCol = (
                <ImageOrArt
                  imageUrl={item.imageUrl}
                  art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                  className="h-[220px] @3xl:h-[300px]"
                  selectable={editable}
                  selected={!!itemSel && selectedImageKey === itemSel.key}
                  onSelect={() => itemSel && onSelectImage?.(itemSel)}
                />
              );
              const textCol = (
                <div className="flex flex-col justify-center px-8 @3xl:px-14 py-8 max-w-[440px]">
                  <Field
                    editable={editable}
                    as="div"
                    className="font-serif text-[20px] mb-2.5"
                    selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.title}
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[14px] leading-relaxed"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.body}
                  </Field>
                </div>
              );
              return (
                <div key={i} className="grid @3xl:grid-cols-2">
                  {imageFirst ? (
                    <>
                      {imageCol}
                      {textCol}
                    </>
                  ) : (
                    <>
                      {textCol}
                      {imageCol}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      if (layout === "list") {
        return (
          <div className="px-10 py-16 max-w-[640px] mx-auto" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-7"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <div className="flex flex-col gap-6">
              {section.items.map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ background: [accent, secondary[0], secondary[1]][i % 3] || accent }}
                  />
                  <div>
                    <Field
                      editable={editable}
                      as="div"
                      className="font-semibold text-[15.5px] mb-1"
                      selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                      onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                    >
                      {item.title}
                    </Field>
                    <Field
                      editable={editable}
                      as="div"
                      className="text-[13.5px] leading-relaxed"
                      style={{ color: palette.textDim }}
                      selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                      onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                    >
                      {item.body}
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (layout === "numbered") {
        return (
          <div className="px-10 py-16 max-w-[920px] mx-auto" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-9 text-center"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <div className="grid @3xl:grid-cols-3 gap-8">
              {section.items.map((item, i) => (
                <div key={i} className="relative pt-2">
                  <div className="text-[13px] font-bold tracking-[0.08em] mb-2" style={{ color: accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <Field
                    editable={editable}
                    as="div"
                    className="font-serif text-[17px] mb-2"
                    selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.title}
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[13.5px] leading-relaxed"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.body}
                  </Field>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // cards (default)
      return (
        <div className="px-10 py-16 max-w-[980px] mx-auto" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-8 text-center"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <div className="grid @3xl:grid-cols-3 gap-7">
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              const itemSel = gridItemSelection(i, item.title);
              return (
                <div key={i}>
                  <ImageOrArt
                    imageUrl={item.imageUrl}
                    art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                    className="h-[140px] rounded-2xl mb-4"
                    selectable={editable}
                    selected={!!itemSel && selectedImageKey === itemSel.key}
                    onSelect={() => itemSel && onSelectImage?.(itemSel)}
                  />
                  <Field
                    editable={editable}
                    as="div"
                    className="font-serif text-[17px] mb-2"
                    selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.title}
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[13.5px] leading-relaxed"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.body}
                  </Field>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "testimonials": {
      const layout = section.layout || "single-quote";

      if (layout === "carousel-row") {
        return (
          <div className="px-10 py-16" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-8 text-center"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <div className="grid @3xl:grid-cols-2 gap-5 max-w-[760px] mx-auto">
              {section.items.map((t, i) => (
                <div key={i} className="rounded-2xl p-5 border" style={{ background: palette.cardBg, borderColor: palette.cardBorder }}>
                  <Field
                    editable={editable}
                    as="p"
                    className="text-[14px] italic mb-3"
                    selected={selectedFieldKey === fieldSel("quote", t.quote, "citatet", i)?.key}
                    onSelect={() => { const s = fieldSel("quote", t.quote, "citatet", i); s && onSelectField?.(s); }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[12.5px] font-semibold"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("author", t.author, "namnet", i)?.key}
                    onSelect={() => { const s = fieldSel("author", t.author, "namnet", i); s && onSelectField?.(s); }}
                  >
                    {t.author}
                  </Field>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (layout === "side-by-side") {
        const [first, ...rest] = section.items;
        return (
          <div className="grid @3xl:grid-cols-2" style={{ background: sectionBg }}>
            <div className="flex flex-col justify-center px-10 py-14">
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[27px] mb-2"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <div className="text-[13.5px]" style={{ color: palette.textDim }}>
                Vad kunder säger om oss.
              </div>
            </div>
            <div className="flex flex-col justify-center px-10 py-14" style={{ background: palette.bgAlt }}>
              {first && (
                <>
                  <Field
                    editable={editable}
                    as="p"
                    className="font-serif italic text-[20px] leading-relaxed mb-3"
                    selected={selectedFieldKey === fieldSel("quote", first.quote, "citatet", 0)?.key}
                    onSelect={() => { const s = fieldSel("quote", first.quote, "citatet", 0); s && onSelectField?.(s); }}
                  >
                    &ldquo;{first.quote}&rdquo;
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[13px] font-semibold"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("author", first.author, "namnet", 0)?.key}
                    onSelect={() => { const s = fieldSel("author", first.author, "namnet", 0); s && onSelectField?.(s); }}
                  >
                    — {first.author}
                  </Field>
                </>
              )}
              {rest.length > 0 && (
                <div className="flex flex-col gap-2 mt-5">
                  {rest.map((t, i) => (
                    <div key={i} className="text-[12.5px]" style={{ color: palette.textDim }}>
                      &ldquo;{t.quote.slice(0, 70)}{t.quote.length > 70 ? "…" : ""}&rdquo; — {t.author}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      // single-quote (default) — stort citat över en bild/konstbakgrund
      const [first, ...rest] = section.items;
      return (
        <div className="relative px-8 @3xl:px-10 py-20 text-center" style={{ background: art }}>
          <h2 className="sr-only">{section.heading}</h2>
          {first && (
            <div className="max-w-xl mx-auto relative">
              <Field
                editable={editable}
                as="p"
                className="font-serif italic text-[24px] @3xl:text-[27px] leading-relaxed mb-4"
                selected={selectedFieldKey === fieldSel("quote", first.quote, "citatet", 0)?.key}
                onSelect={() => { const s = fieldSel("quote", first.quote, "citatet", 0); s && onSelectField?.(s); }}
              >
                &ldquo;{first.quote}&rdquo;
              </Field>
              <Field
                editable={editable}
                as="div"
                className="text-[13.5px]"
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("author", first.author, "namnet", 0)?.key}
                onSelect={() => { const s = fieldSel("author", first.author, "namnet", 0); s && onSelectField?.(s); }}
              >
                — {first.author}
              </Field>
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl mx-auto">
              {rest.map((t, i) => (
                <div key={i} className="text-[12.5px] px-4 py-2.5 rounded-xl border" style={{ background: palette.cardBg, borderColor: palette.cardBorder, color: palette.textDim }}>
                  &ldquo;{t.quote.slice(0, 60)}{t.quote.length > 60 ? "…" : ""}&rdquo; — {t.author}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "cta": {
      const layout = section.layout || "centered";
      const darkArt = artBackground("dark", accent, secondary);

      if (layout === "split") {
        return (
          <div className="grid @3xl:grid-cols-2">
            <div className="flex flex-col justify-center px-10 @3xl:px-14 py-14" style={{ background: sectionBg }}>
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[27px] mb-3"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed"
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
            </div>
            <div className="flex items-center justify-center px-10 py-14" style={{ background: accent }}>
              <FieldBadge
                editable={editable}
                selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
                onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
              >
                <CtaLink
                  link={section.ctaLink}
                  basePath={basePath}
                  onNavigate={onNavigate}
                  className="font-semibold text-[15px] text-[#17171A] text-center"
                >
                  {section.ctaLabel}
                </CtaLink>
              </FieldBadge>
            </div>
          </div>
        );
      }

      // centered (default)
      return (
        <div className="relative px-8 @3xl:px-10 py-20 text-center text-white" style={{ background: darkArt }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[29px] mb-4"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <Field
            editable={editable}
            as="p"
            className="text-[14.5px] mb-7 opacity-80 max-w-[480px] mx-auto"
            selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
            onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
          >
            {section.body}
          </Field>
          <FieldBadge
            editable={editable}
            selected={selectedFieldKey === fieldSel("ctaLabel", section.ctaLabel, "knapptexten")?.key}
            onSelect={() => { const s = fieldSel("ctaLabel", section.ctaLabel, "knapptexten"); s && onSelectField?.(s); }}
          >
            {/* Fast vitt, inte palette.text — sektionen är alltid mörk
                (darkArt) med text-white oavsett sajtens läge. */}
            <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor="#FFFFFF">
              {section.ctaLabel}
            </CtaPill>
          </FieldBadge>
        </div>
      );
    }

    case "contact": {
      const layout = section.layout || "centered";

      if (layout === "split-info") {
        return (
          <div className="grid @3xl:grid-cols-2 max-w-[880px] mx-auto px-10 py-16 gap-10" style={{ background: sectionBg }}>
            <div>
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[27px] mb-4"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed"
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
            </div>
            <div className="rounded-2xl border p-6 flex flex-col gap-3" style={{ background: palette.cardBg, borderColor: palette.cardBorder }}>
              {section.email && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13.5px]"
                  selected={selectedFieldKey === fieldSel("email", section.email, "e-postadressen")?.key}
                  onSelect={() => { const s = fieldSel("email", section.email, "e-postadressen"); s && onSelectField?.(s); }}
                >
                  <span className="font-semibold">E-post: </span>
                  <span style={{ color: palette.textDim }}>{section.email}</span>
                </Field>
              )}
              {section.phone && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13.5px]"
                  selected={selectedFieldKey === fieldSel("phone", section.phone, "telefonnumret")?.key}
                  onSelect={() => { const s = fieldSel("phone", section.phone, "telefonnumret"); s && onSelectField?.(s); }}
                >
                  <span className="font-semibold">Telefon: </span>
                  <span style={{ color: palette.textDim }}>{section.phone}</span>
                </Field>
              )}
              {section.address && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13.5px]"
                  selected={selectedFieldKey === fieldSel("address", section.address, "adressen")?.key}
                  onSelect={() => { const s = fieldSel("address", section.address, "adressen"); s && onSelectField?.(s); }}
                >
                  <span className="font-semibold">Adress: </span>
                  <span style={{ color: palette.textDim }}>{section.address}</span>
                </Field>
              )}
              {socialLinks && socialLinks.length > 0 && (
                <div className="pt-2">
                  <SocialIcons socialLinks={socialLinks} palette={palette} />
                </div>
              )}
            </div>
          </div>
        );
      }

      // centered (default)
      return (
        <div className="px-10 py-16 max-w-[560px] mx-auto text-center" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-4"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <Field
            editable={editable}
            as="p"
            className="text-[14.5px] mb-5"
            style={{ color: palette.textDim }}
            selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
            onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
          >
            {section.body}
          </Field>
          <div className="text-[13.5px] flex flex-col gap-1 mb-4" style={{ color: palette.textDim }}>
            {section.email && (
              <Field
                editable={editable}
                as="span"
                selected={selectedFieldKey === fieldSel("email", section.email, "e-postadressen")?.key}
                onSelect={() => { const s = fieldSel("email", section.email, "e-postadressen"); s && onSelectField?.(s); }}
              >
                {section.email}
              </Field>
            )}
            {section.phone && (
              <Field
                editable={editable}
                as="span"
                selected={selectedFieldKey === fieldSel("phone", section.phone, "telefonnumret")?.key}
                onSelect={() => { const s = fieldSel("phone", section.phone, "telefonnumret"); s && onSelectField?.(s); }}
              >
                {section.phone}
              </Field>
            )}
            {section.address && (
              <Field
                editable={editable}
                as="span"
                selected={selectedFieldKey === fieldSel("address", section.address, "adressen")?.key}
                onSelect={() => { const s = fieldSel("address", section.address, "adressen"); s && onSelectField?.(s); }}
              >
                {section.address}
              </Field>
            )}
          </div>
          {socialLinks && socialLinks.length > 0 && (
            <div className="flex justify-center">
              <SocialIcons socialLinks={socialLinks} palette={palette} />
            </div>
          )}
        </div>
      );
    }

    case "gallery": {
      const layout = section.layout || "grid";

      if (layout === "carousel") {
        return (
          <div className="py-16" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-8 text-center px-10"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            {/* Rent CSS-horisontalskroll med snap, inget JS-tillstånd
                behövs — fungerar direkt som ett svep-bildspel på mobil. */}
            <div className="flex gap-4 overflow-x-auto px-10 pb-2" style={{ scrollSnapType: "x mandatory" }}>
              {section.items.map((item, i) => {
                const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
                const itemSel = galleryItemSelection(i);
                return (
                  <div key={i} className="flex-shrink-0 w-[260px] @3xl:w-[320px]" style={{ scrollSnapAlign: "start" }}>
                    <ImageOrArt
                      imageUrl={item.imageUrl}
                      art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                      className="h-[200px] @3xl:h-[240px] rounded-2xl"
                      selectable={editable}
                      selected={!!itemSel && selectedImageKey === itemSel.key}
                      onSelect={() => itemSel && onSelectImage?.(itemSel)}
                    />
                    {item.caption && (
                      <Field
                        editable={editable}
                        as="div"
                        className="text-[12.5px] mt-2"
                        style={{ color: palette.textDim }}
                        selected={selectedFieldKey === fieldSel("caption", item.caption, "bildtexten", i)?.key}
                        onSelect={() => { const s = fieldSel("caption", item.caption, "bildtexten", i); s && onSelectField?.(s); }}
                      >
                        {item.caption}
                      </Field>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // grid (default)
      return (
        <div className="px-10 py-16 max-w-[980px] mx-auto" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-8 text-center"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <div className="grid grid-cols-2 @3xl:grid-cols-3 gap-4">
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              const itemSel = galleryItemSelection(i);
              return (
                <div key={i}>
                  <ImageOrArt
                    imageUrl={item.imageUrl}
                    art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                    className="aspect-square rounded-xl"
                    selectable={editable}
                    selected={!!itemSel && selectedImageKey === itemSel.key}
                    onSelect={() => itemSel && onSelectImage?.(itemSel)}
                  />
                  {item.caption && (
                    <Field
                      editable={editable}
                      as="div"
                      className="text-[12.5px] mt-2"
                      style={{ color: palette.textDim }}
                      selected={selectedFieldKey === fieldSel("caption", item.caption, "bildtexten", i)?.key}
                      onSelect={() => { const s = fieldSel("caption", item.caption, "bildtexten", i); s && onSelectField?.(s); }}
                    >
                      {item.caption}
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "faq": {
      const layout = section.layout || "stacked";
      // "two-column" får en bredare container (som map/gallery) så två
      // spalter får plats sida vid sida — "stacked" håller sig smalare och
      // lättläst som en enda lång lista.
      const renderFaqItem = (item: typeof section.items[number], i: number) => {
        const open = faqOpenIndex === i;
        return (
          <div
            key={i}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: palette.cardBorder, background: palette.cardBg }}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <Field
                editable={editable}
                as="div"
                className="font-semibold text-[14.5px] flex-1"
                selected={selectedFieldKey === fieldSel("question", item.question, "frågan", i)?.key}
                onSelect={() => { const s = fieldSel("question", item.question, "frågan", i); s && onSelectField?.(s); }}
              >
                {item.question}
              </Field>
              {/* Egen knapp för att fälla ut/ihop svaret, skild från
                  Field ovan — annars skulle ett klick på frågan
                  både markera den FÖR REDIGERING och växla
                  utfällningen i samma klick (samma princip som
                  FieldBadge för knapptexter ovan). */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFaqOpenIndex(open ? null : i);
                }}
                aria-label={open ? "Dölj svaret" : "Visa svaret"}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: palette.bgAlt, color: palette.textDim }}
              >
                {open ? "–" : "+"}
              </button>
            </div>
            {open && (
              <div className="px-5 pb-4">
                <Field
                  editable={editable}
                  as="p"
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("answer", item.answer, "svaret", i)?.key}
                  onSelect={() => { const s = fieldSel("answer", item.answer, "svaret", i); s && onSelectField?.(s); }}
                >
                  {item.answer}
                </Field>
              </div>
            )}
          </div>
        );
      };

      return (
        <div
          className={`px-10 py-16 mx-auto ${layout === "two-column" ? "max-w-[920px]" : "max-w-[680px]"}`}
          style={{ background: sectionBg }}
        >
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-7 text-center"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          <div className={layout === "two-column" ? "grid @3xl:grid-cols-2 gap-2.5 items-start" : "flex flex-col gap-2.5"}>
            {section.items.map(renderFaqItem)}
          </div>
        </div>
      );
    }

    case "map": {
      const mapQuery = encodeURIComponent(section.address || "");
      const layout = section.layout || "inline";

      if (layout === "full-bleed") {
        // Kartan går ut i hela sidans bredd, utan ram/rundade hörn — mer
        // dramatiskt än det inramade "inline"-kortet nedan. Rubrik/adress
        // ligger ändå i en begränsad läsbredd ovanpå/under.
        return (
          <div style={{ background: sectionBg }}>
            {section.heading && (
              <div className="px-10 pt-16 pb-5 max-w-[880px] mx-auto">
                <Field
                  editable={editable}
                  as="h2"
                  className="font-serif text-[27px] text-center"
                  selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                  onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
                >
                  {section.heading}
                </Field>
              </div>
            )}
            <iframe
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              width="100%"
              height="480"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={section.heading || "Karta"}
            />
            {section.address && (
              <div className="px-10 py-5 max-w-[880px] mx-auto">
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13px] text-center"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("address", section.address, "adressen")?.key}
                  onSelect={() => { const s = fieldSel("address", section.address, "adressen"); s && onSelectField?.(s); }}
                >
                  {section.address}
                </Field>
              </div>
            )}
          </div>
        );
      }

      // inline (default) — inramat kort, mindre.
      return (
        <div className="px-10 py-16 max-w-[880px] mx-auto" style={{ background: sectionBg }}>
          {section.heading && (
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-5 text-center"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
          )}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: palette.cardBorder }}>
            {/* Enkel inbäddning utan API-nyckel — räcker för att visa var
                kunden finns, ingen interaktiv Maps-integration behövs. */}
            <iframe
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              width="100%"
              height="360"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={section.heading || "Karta"}
            />
          </div>
          {section.address && (
            <Field
              editable={editable}
              as="div"
              className="text-[13px] mt-3 text-center"
              style={{ color: palette.textDim }}
              selected={selectedFieldKey === fieldSel("address", section.address, "adressen")?.key}
              onSelect={() => { const s = fieldSel("address", section.address, "adressen"); s && onSelectField?.(s); }}
            >
              {section.address}
            </Field>
          )}
        </div>
      );
    }

    case "contactForm": {
      const layout = section.layout || "centered";
      const formBlock = (
        <ContactFormBlock
          section={section}
          palette={palette}
          accent={accent}
          pagePath={pagePath}
          siteId={siteId}
          // Bara ett klick på den RIKTIGA, publikt nåbara sajten ska
          // spara något skarpt i kundens formulärsvar (se
          // siteId-kommentaren ovan) — i chattredigerarens
          // förhandsvisning eller /forslag-miniatyrerna visas bara en
          // "Tack, skickat!"-bekräftelse utan att något sparas.
          active={!!basePath && !!siteId}
          editable={editable}
          selected={selectedFieldKey === fieldSel("submitLabel", section.submitLabel || "Skicka", "knapptexten")?.key}
          onSelect={() => { const s = fieldSel("submitLabel", section.submitLabel || "Skicka", "knapptexten"); s && onSelectField?.(s); }}
        />
      );

      if (layout === "split-map") {
        // Enda sättet att få ett formulär och en karta att stå SIDA VID
        // SIDA — sektioner i övrigt läggs alltid under varandra, aldrig
        // bredvid, oavsett typ (se kommentaren på ContactFormSection i
        // lib/contentModel.ts).
        const mapQuery = encodeURIComponent(section.address || "");
        return (
          <div className="grid @3xl:grid-cols-2 max-w-[880px] mx-auto px-10 py-16 gap-10" style={{ background: sectionBg }}>
            <div>
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[27px] mb-3"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              {section.body && (
                <Field
                  editable={editable}
                  as="p"
                  className="text-[14.5px] mb-6"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                  onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
                >
                  {section.body}
                </Field>
              )}
              {formBlock}
            </div>
            <div>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: palette.cardBorder }}>
                <iframe
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  width="100%"
                  height="320"
                  style={{ border: 0, display: "block" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={section.heading || "Karta"}
                />
              </div>
              {section.address && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13px] mt-3 text-center"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("address", section.address, "adressen")?.key}
                  onSelect={() => { const s = fieldSel("address", section.address, "adressen"); s && onSelectField?.(s); }}
                >
                  {section.address}
                </Field>
              )}
            </div>
          </div>
        );
      }

      // centered (default)
      return (
        <div className="px-10 py-16 max-w-[560px] mx-auto" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-3 text-center"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          {section.body && (
            <Field
              editable={editable}
              as="p"
              className="text-[14.5px] mb-6 text-center"
              style={{ color: palette.textDim }}
              selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
              onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
            >
              {section.body}
            </Field>
          )}
          {formBlock}
        </div>
      );
    }

    case "newsList": {
      // Bara de LIVE artiklarna visas här — ett utkast syns bara för
      // ägaren själv (på "Nyheter"-sidan i panelen, se app/nyheter), och en
      // schemalagd artikel blir automatiskt live när dess klockslag passerat
      // (se isArticleLive i lib/newsArticles.ts).
      const live = (newsArticles || []).filter((a) => isArticleLive(a));
      const categories = Array.from(new Set(live.map((a) => a.category)));
      const visible = newsCategoryFilter ? live.filter((a) => a.category === newsCategoryFilter) : live;
      const articleHref = (slug: string) => `${pagePath || ""}/${slug}`;
      return (
        <div className="px-10 py-16 max-w-[980px] mx-auto" style={{ background: sectionBg }}>
          <Field
            editable={editable}
            as="h2"
            className="font-serif text-[27px] mb-8 text-center"
            selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
            onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
          >
            {section.heading}
          </Field>
          {live.length === 0 ? (
            <p className="text-[14px] text-center" style={{ color: palette.textDim }}>
              Inga publicerade nyheter än.
            </p>
          ) : (
            <>
              {categories.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <button
                    onClick={() => setNewsCategoryFilter(null)}
                    className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border"
                    style={
                      newsCategoryFilter === null
                        ? { background: accent, borderColor: accent, color: "#17171A" }
                        : { borderColor: palette.cardBorder, color: palette.textDim }
                    }
                  >
                    Alla
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewsCategoryFilter(c)}
                      className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border"
                      style={
                        newsCategoryFilter === c
                          ? { background: accent, borderColor: accent, color: "#17171A" }
                          : { borderColor: palette.cardBorder, color: palette.textDim }
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid @3xl:grid-cols-3 gap-6">
              {visible.map((article) => (
                <CtaLink
                  key={article.id}
                  link={articleHref(article.slug)}
                  basePath={basePath}
                  onNavigate={onNavigate}
                  className="block rounded-xl overflow-hidden border"
                  style={{ borderColor: palette.cardBorder, background: palette.cardBg }}
                >
                  <ImageOrArt
                    imageUrl={article.image_url || undefined}
                    art={`linear-gradient(145deg, ${accent}55, ${accent}15)`}
                    className="aspect-[16/10]"
                  />
                  <div className="p-4">
                    <div className="font-semibold text-[15px] mb-1">{article.title}</div>
                    {article.excerpt && (
                      <div className="text-[13px] leading-snug" style={{ color: palette.textDim }}>
                        {article.excerpt}
                      </div>
                    )}
                  </div>
                </CtaLink>
              ))}
              </div>
            </>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// Ytterst tunt omslag runt SectionBlockInner — lägger bara till
// klicka-för-att-välja-HELA-SEKTIONEN ovanpå den (för textändringar: "byt
// rubriken i den här sektionen", "korta ner texten här" osv.), utan att
// röra någon av layout-grenarna ovan. En klick-markering på en enskild bild
// (ImageOrArt, selectable ovan) stoppar sin egen bubbling (e.stopPropagation)
// så den tar alltid företräde framför sektionsmarkeringen — klickar kunden
// på själva bilden menar de bilden, annars (rubrik, brödtext, bakgrund …)
// menar de sektionen.
function SectionBlock(
  props: Parameters<typeof SectionBlockInner>[0] & {
    selectedSectionKey?: string | null;
    onSelectSection?: (sel: { key: string; pagePath: string; sectionId: string; label: string }) => void;
  }
) {
  const { selectedSectionKey, onSelectSection, ...inner } = props;
  const rendered = <SectionBlockInner {...inner} />;

  if (!inner.editable || !inner.pagePath) return rendered;

  const sel = {
    key: `${inner.pagePath}::section::${inner.section.id}`,
    pagePath: inner.pagePath,
    sectionId: inner.section.id,
    label: sectionLabel(inner.section),
  };
  const selected = selectedSectionKey === sel.key;

  return (
    <div className="relative group/section cursor-pointer" onClick={() => onSelectSection?.(sel)}>
      {rendered}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"
        }`}
        style={{ outline: "3px dashed #C6FF5E", outlineOffset: "-3px" }}
      />
      {/* bottom-right snarare än top-left — på startsidans overlay-bottom-hero
          (se nedan) ligger Header flytande ovanpå sektionens topp, så en
          badge däruppe skulle krocka med logotyp/menyn. Nederkanten är i
          praktiken alltid ledig, oavsett sektionstyp. */}
      <div
        className={`pointer-events-none absolute bottom-2.5 right-2.5 transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"
        }`}
      >
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-block"
          style={{ background: selected ? "#C6FF5E" : "#FFFFFF", color: "#0C1004" }}
        >
          {selected ? `✓ Vald: ${sel.label}` : "Klicka för att välja hela sektionen"}
        </span>
      </div>
    </div>
  );
}
