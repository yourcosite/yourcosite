"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import type { SiteContent, Section, SocialLink, BackgroundMode, ThemeFont, ButtonStyle, HeaderLayout, HeroLayout, ContactFormSection } from "@/lib/contentModel";
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

// Kundens "Aurora"-referenskod bad uttryckligen om "tonade bakgrunder,
// allt behöver inte vara enfärgade" — en mjuk, riktad färgskiftning
// (kundens accentfärg vid låg opacitet, i ett diagonalt lager ovanpå den
// vanliga bas-färgen) istället för en helt platt palette.bg/bgAlt-yta.
// Generell hjälpfunktion (inte bara för "aurora"-varianten) så fler
// sektioner kan använda samma mjuka toning framöver utan att hitta på en
// ny lösning varje gång. `strong` ger en något tydligare toning — använd
// sparsamt, bara där referensen själv hade en synligt varmare/kallare yta
// (t.ex. en mörk sektion som ska kännas "djupare" än ren svart/grå).
function tonalBg(base: string, accent: string, strong = false) {
  return `linear-gradient(135deg, ${accent}${strong ? "22" : "12"} 0%, transparent 60%), ${base}`;
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
  heroLayoutOverride,
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
  // Samma idé, men BARA för startsidans hero — se lib/themeVariants.ts och
  // "effectiveFirstSection" nedan. Undersidornas hero-layout (satt av AI:n
  // vid genereringen, se SUBPAGE_HERO_LAYOUT_POOL) påverkas aldrig av den
  // här — bara startsidans allra första sektion.
  heroLayoutOverride?: HeroLayout;
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
  // Startsidans hero ska kännas igen som en del av kundens valda "känsla"
  // (stilvariant) — varm/luftig/djärv har varsin karaktäristiska hero-typ
  // (se lib/themeVariants.ts). Det gäller BARA startsidans FÖRSTA sektion,
  // och bara när den faktiskt är en hero — undersidornas egna hero-layout
  // (AI-satt vid genereringen, för variation mellan undersidor) rör vi
  // aldrig. Vi klonar bara den ena sektionen (inte hela content) så
  // resten av sidan/sajten är orörd.
  const rawFirstSection = page.sections[0];
  const homeHeroLayout: HeroLayout | undefined =
    page.path === "/" && rawFirstSection?.type === "hero"
      ? heroLayoutOverride ?? content.theme.heroLayout
      : undefined;
  const firstSection =
    homeHeroLayout && rawFirstSection?.type === "hero"
      ? { ...rawFirstSection, layout: homeHeroLayout }
      : rawFirstSection;
  const pageSections =
    homeHeroLayout && rawFirstSection?.type === "hero"
      ? [firstSection, ...page.sections.slice(1)]
      : page.sections;
  const overlayHeader =
    page.path === "/" && firstSection?.type === "hero" && (firstSection.layout || "centered") === "overlay-bottom";
  const restSections = overlayHeader ? pageSections.slice(1) : pageSections;

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
        // pb lite större än pt — den nedersta raden låg annars väldigt nära
        // sajtens absoluta nederkant (ingenting kommer efter den).
        className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 @3xl:px-12 pt-6 pb-8 text-[12px]"
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

// Hero-bildens "toning" — en lätt, färgad gradient ovanpå fotot som gör att
// varje stilvariants hero känns som sin EGEN känsla, inte bara samma foto
// med olika knappar/meny runtom (kundönskemål: "vi varierar bildens
// redigering med toning"). "light"/luftig får ingen toning alls (ren,
// luftig känsla, fotot ska stå för sig själv) — "warm" lägger en varm,
// krämig gradient och "dark" en kall, mörk gradient, båda milda nog att
// fungera ovanpå EGNA kundfoton (inte bara vår genererade "art"-platshållare).
// pointer-events-none + absolute inset-0: rent dekorativt, ska aldrig
// fånga klick som är tänkta för bilden under (se samma princip vid
// overlay-bottoms mörkläggningslager nedan).
function HeroTint({ mode }: { mode: BackgroundMode }) {
  if (mode === "warm") {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(160deg, rgba(201,122,74,0.22) 0%, rgba(74,46,24,0.10) 100%)",
          mixBlendMode: "multiply",
        }}
      />
    );
  }
  if (mode === "dark") {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(160deg, rgba(12,14,20,0.30) 0%, rgba(0,0,0,0.12) 100%)",
          mixBlendMode: "multiply",
        }}
      />
    );
  }
  return null;
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
  // Bara använd av testimonials-layouten "carousel-arrows" nedan — vilket
  // citat som visas just nu. Samma skäl som ovan till att den ligger
  // ovillkorat (React Hooks måste anropas i samma ordning varje render).
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  switch (section.type) {
    case "hero": {
      const layout = section.layout || "centered";

      if (layout === "collage") {
        // Finjusterat efter kundens exakta referenskod (en statisk
        // HTML/CSS-fil kundens ChatGPT hade genererat från samma
        // referensbild): huvudfotot tar ca 58% av bredden och nästan
        // hela höjden, men är INTE flush mot högerkanten (en marginal
        // kvar där, som i referensen) — istället för föregående version
        // där det var 60/80 flush mot kanten. Ett andra, mindre foto
        // (ca 32% bredd) ligger nere till vänster med en ram i SIDANS
        // EGEN bakgrundsfärg (inte vit som tidigare) så det ser
        // "urklippt" mot bakgrunden ut, exakt som i referenskoden. Och i
        // nedre högra hörnet ligger inte längre ett tredje foto — i
        // referensen är det ett flytande TEXTKORT (en kort checklista),
        // så den rutan återanvänder hero-stats istället för en bild.
        // Den gamla toppvänster-bilden (collageA) är inte med längre i
        // den här kompositionen.
        const [, collageB] = section.collageImageUrls || [];
        const stats = section.stats || [];
        return (
          // Extra marginal NEDÅT (mer än uppåt) — kunden tyckte nästa
          // sektion kom för nära bildkollaget. Bara den här layouten
          // påverkas, inte heroens övriga lägen.
          <div className="grid @3xl:grid-cols-2 gap-10 @3xl:gap-16 items-center px-8 @3xl:px-14 pt-14 @3xl:pt-20 pb-20 @3xl:pb-28">
            <div className={`relative ${heroEmphasis ? "h-[400px] @3xl:h-[520px]" : "h-[320px] @3xl:h-[420px]"}`}>
              {/* Varje ruta i kollaget är EN EGEN absolut-positionerad och
                  -storlekssatt wrapper, med ImageOrArt i "fill"-läge
                  INUTI den — ImageOrArt sätter alltid sin egen "relative"
                  som grundklass, och den vinner över en "absolute" som
                  bara skickas in via className (se kommentaren vid
                  ImageOrArt-definitionen ovan) oavsett klassordning, så
                  positioneringen måste läggas på en egen wrapper istället. */}
              <div className="absolute right-[6%] top-0 w-[58%] h-[92%]">
                <ImageOrArt
                  imageUrl={section.imageUrl}
                  art={art}
                  fill
                  className="rounded-2xl shadow-[0_26px_52px_rgba(0,0,0,0.22)]"
                  selectable={editable}
                  selected={!!heroSelection && selectedImageKey === heroSelection.key}
                  onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
                />
              </div>
              <div
                className="absolute left-[3%] bottom-0 w-[32%] h-[45%] z-10 rounded-xl shadow-[0_14px_28px_rgba(0,0,0,0.18)] overflow-hidden"
                style={{ border: `10px solid ${palette.bg}` }}
              >
                <ImageOrArt imageUrl={collageB} art={art} fill selectable={false} />
              </div>
              {stats.length > 0 && (
                // Referensens flytande "checklista"-kort — textkort, inte
                // ett tredje foto. Återanvänder hero-stats (samma fält
                // som "quad" ovan) som tre korta rader med en liten
                // accentfärgad prick, snarare än stora nyckeltalssiffror,
                // eftersom kortet är litet (precis som i referensens
                // 250px-breda kort).
                <div
                  className="absolute right-0 bottom-0 z-20 rounded-tl-xl px-5 py-5 max-w-[220px] shadow-[0_14px_32px_rgba(0,0,0,0.16)]"
                  style={{ background: `${palette.cardBg}EB` }}
                >
                  {stats.slice(0, 3).map((stat, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[12.5px] leading-snug ${i > 0 ? "mt-2.5" : ""}`}>
                      <span className="mt-[2px] text-[12px] font-bold flex-shrink-0" style={{ color: accent }}>✓</span>
                      <span style={{ color: palette.text }}>
                        <span className="font-serif font-semibold">{stat.value}</span>{" "}
                        <span style={{ color: palette.textDim }}>{stat.label}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              {section.eyebrow && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-px" style={{ background: accent }} />
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[11.5px] tracking-[0.14em] font-semibold"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                    onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                  >
                    {section.eyebrow.toUpperCase()}
                  </Field>
                </div>
              )}
              <Field
                editable={editable}
                as="h1"
                className={`font-serif leading-[1.08] mb-5 ${heroEmphasis ? "text-[40px] @3xl:text-[54px]" : "text-[32px] @3xl:text-[42px]"}`}
                selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.headline}
                {section.headlineEmphasis && (
                  <>
                    <br />
                    <Field
                      editable={editable}
                      as="span"
                      className="italic"
                      selected={selectedFieldKey === fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden")?.key}
                      onSelect={() => { const s = fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden"); s && onSelectField?.(s); }}
                    >
                      {section.headlineEmphasis}
                    </Field>
                  </>
                )}
              </Field>
              <Field
                editable={editable}
                as="p"
                className={`leading-relaxed mb-7 max-w-[460px] ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}
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

      if (layout === "quad") {
        // HELT ombyggd efter kundens pixel-exakta referenskod ("Lumora —
        // Split Screen Template") — det ursprungliga 2x2-rutnäts-försöket
        // (tre bilder + två tonade textrutor) var vår egen, mindre lyckade
        // tolkning av en skärmdump ("känns lite snedvriden" / "känns
        // utzoomad", återkommande kundfeedback). Referenskoden visar att
        // det faktiskt är en vanlig DELAD hero (text vänster, EN bild
        // höger som täcker hela höjden) plus ett litet flytande
        // "AI-verktyg"-kort nere på bilden — inte ett bildkollage. Samma
        // fält som förut (eyebrow/headline/headlineEmphasis/body/cta),
        // plus stats återanvänd som en kort bock-rad under knappen
        // (referensens "No credit card required / AI powered / Publish
        // in minutes") istället för nyckeltalssiffror — ingen ny
        // AI-genererad data krävs, bara en annan presentation av samma
        // fält. Det flytande kortets text är ren dekoration (som
        // "01 — 03"-sidnumreringen i "editorial" ovan), inte kundinnehåll.
        const stats = section.stats || [];
        return (
          <div className="grid @3xl:grid-cols-2 items-stretch">
            <div className="flex flex-col justify-center items-start px-8 @3xl:px-14 py-14 @3xl:py-0">
              {section.eyebrow && (
                <Field
                  editable={editable}
                  as="div"
                  className="text-[11px] tracking-[0.18em] font-semibold mb-4"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                  onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                >
                  {section.eyebrow.toUpperCase()}
                </Field>
              )}
              <Field
                editable={editable}
                as="h1"
                className={`font-serif leading-[0.96] tracking-tight mb-6 ${heroEmphasis ? "text-[46px] @3xl:text-[66px]" : "text-[36px] @3xl:text-[50px]"}`}
                selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.headline}
                {section.headlineEmphasis && (
                  <>
                    {" "}
                    <Field
                      editable={editable}
                      as="span"
                      className="block"
                      selected={selectedFieldKey === fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden")?.key}
                      onSelect={() => { const s = fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden"); s && onSelectField?.(s); }}
                    >
                      {section.headlineEmphasis}
                    </Field>
                  </>
                )}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[15px] @3xl:text-[16px] leading-relaxed mb-8 max-w-[440px]"
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
              {stats.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-[12px]" style={{ color: palette.textDim }}>
                  {stats.slice(0, 3).map((stat, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="font-bold" style={{ color: accent }}>✓</span>
                      {stat.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className={`relative ${heroEmphasis ? "h-[360px]" : "h-[300px]"} @3xl:h-auto`}>
              <ImageOrArt
                imageUrl={section.imageUrl}
                art={art}
                fill
                dark
                selectable={editable}
                selected={!!heroSelection && selectedImageKey === heroSelection.key}
                onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
              />
              {/* Flytande kort — INTE om "skapa en sajt med AI" längre
                  (kundfeedback: kortet ska handla om KUNDENS verksamhet,
                  inte om hur sajten gjordes). Visar förtexten (eyebrow,
                  samma riktiga AI-skrivna textfält som resten av heron —
                  t.ex. "Fritid och äventyr") och, om det finns, det
                  första nyckeltalet som en kort andra rad. Ingen bild
                  behövs — rubriken ensam räcker för att kortet ska kännas
                  meningsfullt, så det visas bara om eyebrow finns. */}
              {section.eyebrow && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-5 @3xl:bottom-8 flex items-center gap-3 px-4 py-3.5 rounded-xl max-w-[88%] @3xl:max-w-[360px] shadow-[0_20px_50px_rgba(0,0,0,0.22)]"
                  style={{ background: "rgba(255,255,255,0.94)" }}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px] font-serif font-semibold"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {section.eyebrow.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold truncate" style={{ color: "#17171A" }}>{section.eyebrow}</div>
                    {stats[0] && (
                      <div className="text-[11px] truncate" style={{ color: "#6E6C68" }}>{stats[0].label}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (layout === "editorial") {
        // Kundens nya referens ("Atelier"-mallen, en pixel-exakt
        // HTML/CSS-fil) — ett designstudio-portfolio-intryck: luftig
        // rubrik till vänster, en stor STÅENDE bild till höger som tar
        // nästan hela hero-höjden, ett mindre andra foto lager-på-lager
        // nere i bildens vänstra hörn (samma princip som "collage"/"quad"
        // ovan — ETT extra foto, index 0 i collageImageUrls), och en
        // liten dekorativ sidnumrering ("01 — 03") i bildens nedre
        // hörn — ren dekoration, ingen riktig karusell, men ger samma
        // redaktionella känsla som referensen utan att hitta på data.
        const [editorialSmall] = section.collageImageUrls || [];
        return (
          <div className="grid @3xl:grid-cols-[1fr_1.05fr] gap-10 @3xl:gap-14 items-stretch px-8 @3xl:px-14 pt-14 @3xl:pt-20 pb-16 @3xl:pb-20">
            {/* items-start — annars sträcker flex-kolumnen knappen (den
                blir en flex-item och "stretch" är flex-default för
                korsaxeln) till hela bredden, trots att CtaPill själv är
                "inline-block". Samma risk finns i princip i "quad" ovan,
                men råkar inte synas där eftersom knappen är sista
                barnet i en redan smal panel. */}
            <div className="flex flex-col justify-center items-start @3xl:py-10">
              {section.eyebrow && (
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-11 h-px" style={{ background: accent }} />
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[11px] tracking-[0.14em] font-semibold"
                    style={{ color: palette.textDim }}
                    selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                    onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                  >
                    {section.eyebrow.toUpperCase()}
                  </Field>
                </div>
              )}
              <Field
                editable={editable}
                as="h1"
                className={`font-serif leading-[0.98] tracking-tight mb-6 ${heroEmphasis ? "text-[48px] @3xl:text-[76px]" : "text-[38px] @3xl:text-[56px]"}`}
                selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.headline}
                {section.headlineEmphasis && (
                  <>
                    <br />
                    <Field
                      editable={editable}
                      as="span"
                      className="italic"
                      style={{ color: accent }}
                      selected={selectedFieldKey === fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden")?.key}
                      onSelect={() => { const s = fieldSel("headlineEmphasis", section.headlineEmphasis, "den kursiva raden"); s && onSelectField?.(s); }}
                    >
                      {section.headlineEmphasis}
                    </Field>
                  </>
                )}
              </Field>
              <Field
                editable={editable}
                as="p"
                className={`leading-relaxed mb-8 max-w-[440px] ${heroEmphasis ? "text-[16px]" : "text-[14.5px]"}`}
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
            <div className={`relative ${heroEmphasis ? "h-[420px] @3xl:h-[640px]" : "h-[340px] @3xl:h-[520px]"}`}>
              <ImageOrArt
                imageUrl={section.imageUrl}
                art={art}
                fill
                className="rounded-2xl shadow-[0_26px_52px_rgba(0,0,0,0.22)]"
                selectable={editable}
                selected={!!heroSelection && selectedImageKey === heroSelection.key}
                onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
              />
              <div
                className="absolute left-4 bottom-4 @3xl:left-6 @3xl:bottom-6 w-[38%] @3xl:w-[34%] aspect-[4/3] rounded-xl shadow-[0_14px_28px_rgba(0,0,0,0.22)] overflow-hidden"
                style={{ border: `6px solid ${palette.bg}` }}
              >
                <ImageOrArt imageUrl={editorialSmall} art={art} fill selectable={false} />
              </div>
              {/* Rent dekorativ sidnumrering — samma känsla som referensens
                  "01 / 03"-karusellindikator, men utan egen funktion (ingen
                  riktig bildkaruell att räkna). */}
              <div
                className="absolute right-4 bottom-4 @3xl:right-6 @3xl:bottom-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10.5px] tracking-[0.1em] font-semibold"
                style={{ background: "rgba(255,255,255,0.88)", color: palette.text }}
              >
                01 — 03
              </div>
            </div>
          </div>
        );
      }

      if (layout === "split-left" || layout === "split-right") {
        const imageFirst = layout === "split-left";
        const imageCol = (
          <div className="relative">
            <ImageOrArt
              imageUrl={section.imageUrl}
              art={art}
              className={heroEmphasis ? "h-[420px] @3xl:h-[600px]" : "h-[320px] @3xl:h-[440px]"}
              selectable={editable}
              selected={!!heroSelection && selectedImageKey === heroSelection.key}
              onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
            />
            <HeroTint mode={mode} />
          </div>
        );
        const textCol = (
          <div className={`flex flex-col justify-center items-start px-8 @3xl:px-14 ${heroEmphasis ? "py-10 @3xl:py-0" : "py-10"} ${imageFirst ? "@3xl:text-left" : "@3xl:text-right @3xl:items-end"}`}>
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
            {/* Nyckeltalsraden — ursprungligen bara "collage"-heron ovan,
                men samma mönster (Norden-referensen) finns även i en
                vanlig delad hero med bild bredvid, så fältet återanvänds
                här istället för att hitta på en ny sektionstyp. */}
            {section.stats && section.stats.length > 0 && (
              <div
                className={`flex flex-wrap items-center gap-5 @3xl:gap-7 mt-8 pt-6 ${imageFirst ? "" : "@3xl:justify-end"}`}
                style={{ borderTop: `1px solid ${palette.cardBorder}` }}
              >
                {section.stats.slice(0, 3).map((stat, i) => (
                  <div key={i} className={i > 0 ? "pl-5 @3xl:pl-7 border-l" : ""} style={{ borderColor: palette.cardBorder }}>
                    <div className="text-[17px] font-semibold font-serif">{stat.value}</div>
                    <div className="text-[12px]" style={{ color: palette.textDim }}>{stat.label}</div>
                  </div>
                ))}
              </div>
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

      if (layout === "beam") {
        // Kundens "Aurora Arkitektur"-referenskod — till skillnad från
        // "overlay-bottom" ovan (mörk gradient UNDERIFRÅN, text ligger
        // nere i botten) är den här gradienten SIDLEDES (vänster->höger,
        // mörkast vid vänsterkanten där texten ligger, snart heki
        // genomskinlig mot höger där fotot får synas rent) och texten
        // ligger vertikalt CENTRERAD i hela hero-höjden, inte pressad mot
        // botten — ett lugnare, mer "arkitektkontor"-aktigt intryck än
        // "overlay-bottom"s kompakta nedre textfält. Den dekorativa
        // "Scrolla ner"-raden (en kort linje + text, helt utan funktion —
        // samma princip som "01 — 03"-sidnumreringen i "editorial") sitter
        // nere till vänster, som i referensen.
        return (
          <div className={`relative ${heroEmphasis ? "h-[620px] @3xl:h-[760px]" : "h-[480px] @3xl:h-[620px]"}`}>
            <ImageOrArt
              imageUrl={section.imageUrl}
              art={art}
              fill
              dark
              selectable={editable}
              selected={!!heroSelection && selectedImageKey === heroSelection.key}
              onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
            />
            {/* pointer-events-none — rent dekorativt toningslager, se
                motsvarande kommentar vid "overlay-bottom" nedan. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, rgba(7,14,22,0.86) 0%, rgba(7,14,22,0.6) 38%, rgba(7,14,22,0.18) 70%, rgba(7,14,22,0.02) 100%)",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(0deg, rgba(6,12,18,0.4), transparent 35%)" }}
            />
            <div className={`absolute inset-0 flex items-center px-8 @3xl:px-14 text-white ${heroEmphasis ? "max-w-[680px]" : "max-w-[560px]"}`}>
              <div>
                {section.eyebrow && (
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[11px] tracking-[0.3em] font-semibold mb-5 opacity-70"
                    selected={selectedFieldKey === fieldSel("eyebrow", section.eyebrow, "förtexten")?.key}
                    onSelect={() => { const s = fieldSel("eyebrow", section.eyebrow, "förtexten"); s && onSelectField?.(s); }}
                  >
                    {section.eyebrow.toUpperCase()}
                  </Field>
                )}
                <Field
                  editable={editable}
                  as="h1"
                  className={`font-serif leading-[0.98] tracking-tight mb-6 ${heroEmphasis ? "text-[48px] @3xl:text-[76px]" : "text-[38px] @3xl:text-[56px]"}`}
                  selected={selectedFieldKey === fieldSel("headline", section.headline, "rubriken")?.key}
                  onSelect={() => { const s = fieldSel("headline", section.headline, "rubriken"); s && onSelectField?.(s); }}
                >
                  {section.headline}
                </Field>
                <Field
                  editable={editable}
                  as="p"
                  className={`leading-relaxed mb-7 opacity-75 ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}
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
                    <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor="#FFFFFF">
                      {section.ctaLabel}
                    </CtaPill>
                  </FieldBadge>
                )}
              </div>
            </div>
            <div className="absolute left-8 @3xl:left-14 bottom-7 @3xl:bottom-9 flex items-center gap-4 text-white opacity-60 text-[11px] tracking-[0.08em] pointer-events-none">
              <span className="w-10 h-px bg-white" />
              Scrolla ner
            </div>
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
            <HeroTint mode={mode} />
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
              <HeroTint mode={mode} />
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
          <div className="relative">
            <ImageOrArt
              imageUrl={section.imageUrl}
              art={art}
              className={heroEmphasis ? "h-[420px] @3xl:h-[580px]" : "h-[300px] @3xl:h-[380px]"}
              dark={mode === "dark"}
              selectable={editable}
              selected={!!heroSelection && selectedImageKey === heroSelection.key}
              onSelect={() => heroSelection && onSelectImage?.(heroSelection)}
            />
            <HeroTint mode={mode} />
          </div>
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

      if (layout === "stats-split") {
        // Kundens "Atelier"-referenskod hade en "results"-sektion: två
        // foton i OLIKA höjd sida vid sida (ett kort, ett högt) till
        // vänster, rubrik/text och en kort nyckeltalsrad till höger — ett
        // dramatiskt "resultat"-avbrott mellan andra sektioner.
        const [tall, short] = section.collageImageUrls || [];
        const stats = section.stats || [];
        return (
          <div className="grid @3xl:grid-cols-2 gap-10 @3xl:gap-16 items-center px-8 @3xl:px-14 py-16 @3xl:py-24" style={{ background: sectionBg }}>
            <div className="grid grid-cols-[0.65fr_1fr] gap-4 items-end">
              <div className="relative h-[180px] @3xl:h-[270px] rounded-xl overflow-hidden">
                <ImageOrArt imageUrl={short} art={art} fill selectable={false} />
              </div>
              <div className="relative h-[260px] @3xl:h-[400px] rounded-xl overflow-hidden">
                {/* Ingen egen bild-markering kopplad ännu (about-sektioner
                    hade aldrig bilder innan den här layouten) — samma
                    begränsning som "quad"/"collage"-herons sekundära
                    foton, inte bara huvudbilden. */}
                <ImageOrArt imageUrl={tall} art={art} fill selectable={false} />
              </div>
            </div>
            <div>
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[30px] @3xl:text-[38px] leading-[1.05] mb-4"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed max-w-[460px]"
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
              {stats.length > 0 && (
                <div className="grid grid-cols-3 mt-10 max-w-[420px]">
                  {stats.slice(0, 3).map((stat, i) => (
                    <div key={i} className={i > 0 ? "pl-5 border-l" : "pr-5"} style={{ borderColor: palette.cardBorder }}>
                      <div className="font-serif text-[30px] @3xl:text-[36px] leading-none mb-1.5">{stat.value}</div>
                      <div className="text-[11px]" style={{ color: palette.textDim }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (layout === "image-full") {
        // Kundens "Aurora Arkitektur"-referenskod — en HEL bild till
        // vänster som täcker hela sektionens höjd (inte en vanlig
        // bildruta med marginal runt, som andra about-layouter), text
        // till höger med en liten dekorativ pill-länk under brödtexten
        // (ren dekoration — ingen riktig destination, samma princip som
        // "01 — 03"-sidnumreringen i hero-layouten "editorial"). Textsidan
        // får en mjuk tonad bakgrund (tonalBg) istället för en platt
        // yta — kundens uttryckliga önskan om "tonade bakgrunder".
        return (
          <div className="grid @3xl:grid-cols-[1.15fr_0.85fr] @3xl:min-h-[500px]">
            <div className="relative h-[280px] @3xl:h-auto">
              <ImageOrArt imageUrl={section.imageUrl} art={art} fill selectable={false} />
            </div>
            <div
              className="flex flex-col justify-center px-8 @3xl:px-16 py-14 @3xl:py-20"
              style={{ background: tonalBg(sectionBg || palette.bg, accent) }}
            >
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[30px] @3xl:text-[40px] leading-[1.05] mb-5"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed max-w-[460px]"
                style={{ color: palette.textDim }}
                selected={selectedFieldKey === fieldSel("body", section.body, "brödtexten")?.key}
                onSelect={() => { const s = fieldSel("body", section.body, "brödtexten"); s && onSelectField?.(s); }}
              >
                {section.body}
              </Field>
              <div
                className="inline-flex items-center gap-4 mt-7 px-5 py-3 rounded-full text-[12px] w-fit"
                style={{ border: `1px solid ${palette.cardBorder}`, color: palette.text }}
              >
                Läs mer →
              </div>
            </div>
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

      if (layout === "icon-row") {
        // En smal, kompakt rad med korta punkter (ingen bild) — en liten
        // dekorativ cirkel ovanför varje istället för siffror (se
        // "numbered" ovan) eller foton. Tänkt som en kort "i korthet"-rad
        // direkt under en hero, inte som sidans huvudinnehåll — se
        // Norden-referensen som inspirerade layouten.
        return (
          <div className="px-10 py-12 max-w-[1040px] mx-auto" style={{ background: sectionBg }}>
            {section.heading && (
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[22px] mb-7 text-center"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
            )}
            <div className="grid @3xl:grid-cols-4 gap-7 @3xl:gap-6">
              {section.items.slice(0, 4).map((item, i) => (
                <div key={i} className="text-center @3xl:text-left">
                  <div
                    className="w-8 h-8 rounded-full mb-3 mx-auto @3xl:mx-0"
                    style={{ background: `${[accent, secondary[0], secondary[1]][i % 3] || accent}22` }}
                  />
                  <Field
                    editable={editable}
                    as="div"
                    className="font-semibold text-[14.5px] mb-1.5"
                    selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                    onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                  >
                    {item.title}
                  </Field>
                  <Field
                    editable={editable}
                    as="div"
                    className="text-[13px] leading-relaxed"
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

      if (layout === "divided-columns") {
        // Kundens "Aurora Arkitektur"-referenskod ("services"-sektionen)
        // — tre kolumner med en tunn LODRÄT linje MELLAN rutorna (inte
        // egna kort/bakgrunder som "cards", och inte en siffra ovanför
        // som "numbered") plus en dekorativ "Läs mer →"-rad under varje
        // text (ren dekoration, ingen riktig destination — samma princip
        // som about-layouten "image-full" ovan). En liten geometrisk
        // symbol ovanför varje rubrik istället för ett foto — referensens
        // service-kort hade inga bilder, bara enkla Unicode-tecken.
        // Sektionen får en mjukt tonad bakgrund (tonalBg) i stället för
        // en platt yta, per kundens uttryckliga "tonade bakgrunder"-önskan.
        const glyphs = ["⌂", "✦", "▣", "◇", "○", "△"];
        return (
          <div className="px-8 @3xl:px-14 py-16 @3xl:py-20" style={{ background: tonalBg(sectionBg || palette.bg, accent) }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[32px] @3xl:text-[44px] leading-[1.05] mb-10 @3xl:mb-14 max-w-[600px]"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <div className="grid @3xl:grid-cols-3">
              {section.items.map((item, i) => {
                const isFirst = i === 0;
                const isLast = i === section.items.length - 1;
                return (
                  <div
                    key={i}
                    className={`@3xl:px-10 ${isFirst ? "@3xl:pl-0" : ""} ${isLast ? "@3xl:pr-0" : ""} ${i > 0 ? "@3xl:border-l pt-8 @3xl:pt-0" : ""}`}
                    style={{ borderColor: palette.cardBorder }}
                  >
                    <div className="text-[26px] font-light mb-5" style={{ color: accent }}>
                      {glyphs[i % glyphs.length]}
                    </div>
                    <Field
                      editable={editable}
                      as="div"
                      className="font-serif text-[21px] mb-2.5"
                      selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                      onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                    >
                      {item.title}
                    </Field>
                    <Field
                      editable={editable}
                      as="div"
                      className="text-[13px] leading-relaxed max-w-[260px]"
                      style={{ color: palette.textDim }}
                      selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                      onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                    >
                      {item.body}
                    </Field>
                    <div className="mt-4 text-[12px] font-medium" style={{ color: palette.text }}>
                      Läs mer →
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      if (layout === "bento") {
        // Asymmetriskt rutnät (olika stora rutor) istället för jämna
        // kolumner — mönstret från Lumoras mörka funktionssektion. FÖRSTA
        // objektet i items får dubbel bredd/höjd (en "hero-ruta"), resten
        // är vanliga kvadratiska rutor — bilden fyller HELA rutan (inte
        // bara ett fält ovanför texten) med text overlagd nertill, över en
        // mörk gradient, så rutorna känns som fotografiska "plattor".
        //
        // Storleksvariationen (den stora rutan) går BARA jämnt ut i ett
        // 3-kolumnsrutnät när items.length är exakt 3 (2 rader × 3
        // kolumner, den stora rutan tar 2×2 = 4 celler, de två små tar en
        // cell var — precis 6 av 6 celler). Vid t.ex. 4 objekt blev
        // resten av rutnätet fullt efter rad 1-2, så det FJÄRDE objektet
        // hamnade ensamt på en egen, annars tom rad — det kunden
        // rapporterade. Vid alla andra antal används därför ett jämnt
        // rutnät utan storleksvariation istället (2 kolumner för 2/4
        // objekt, 3 kolumner för 5/6) — fortfarande samma distinkta
        // "fotografisk platta"-stil, bara utan den stora rutan.
        const n = section.items.length;
        const useBigTile = n === 3;
        // Undviker en ensam sista rad (se kommentaren ovan): 3 kolumner
        // som standard, men växlar till 2 när just det antalet annars
        // skulle lämna exakt ett objekt kvar på en egen rad (t.ex. 4).
        const cols = n > 3 && n % 3 === 1 ? 2 : 3;
        return (
          <div className="px-10 py-16 max-w-[1040px] mx-auto" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-8 text-center"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            <div className={`grid ${cols === 3 ? "@3xl:grid-cols-3" : "@3xl:grid-cols-2"} gap-4 @3xl:auto-rows-[180px]`}>
              {section.items.map((item, i) => {
                const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
                const itemSel = gridItemSelection(i, item.title);
                const big = useBigTile && i === 0;
                return (
                  <div
                    key={i}
                    className={`relative rounded-2xl overflow-hidden h-[220px] @3xl:h-auto ${big ? "@3xl:col-span-2 @3xl:row-span-2" : ""}`}
                  >
                    <ImageOrArt
                      imageUrl={item.imageUrl}
                      art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                      fill
                      dark
                      selectable={editable}
                      selected={!!itemSel && selectedImageKey === itemSel.key}
                      onSelect={() => itemSel && onSelectImage?.(itemSel)}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.05) 55%)" }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 @3xl:p-5 text-white">
                      <Field
                        editable={editable}
                        as="div"
                        className={big ? "font-serif text-[20px] mb-1.5" : "font-serif text-[15.5px] mb-1"}
                        selected={selectedFieldKey === fieldSel("title", item.title, "rubriken i rutan", i)?.key}
                        onSelect={() => { const s = fieldSel("title", item.title, "rubriken i rutan", i); s && onSelectField?.(s); }}
                      >
                        {item.title}
                      </Field>
                      <Field
                        editable={editable}
                        as="div"
                        className={big ? "text-[13.5px] leading-relaxed opacity-85" : "text-[12px] leading-relaxed opacity-80"}
                        selected={selectedFieldKey === fieldSel("body", item.body, "texten i rutan", i)?.key}
                        onSelect={() => { const s = fieldSel("body", item.body, "texten i rutan", i); s && onSelectField?.(s); }}
                      >
                        {item.body}
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // cards (default) — kolumnantalet räknas ut från items.length (samma
      // knep som "bento" ovan) istället för ett fast grid-cols-3, annars
      // strandar t.ex. ett FJÄRDE objekt ensamt på en egen rad för sig
      // (3+1) — precis den bugg en kund rapporterade, och eftersom "cards"
      // är den layout som alltid tvingas på förstasidan (se
      // randomizeSectionLayouts i app/api/sites/generate/route.ts) syns
      // den på i stort sett varje sajt.
      const cardCols = section.items.length > 3 && section.items.length % 3 === 1 ? 2 : 3;
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
          <div className={`grid ${cardCols === 3 ? "@3xl:grid-cols-3" : "@3xl:grid-cols-2"} gap-7`}>
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

      if (layout === "carousel-arrows") {
        // Ett citat i taget, med pil-knappar och prickar — Norden-
        // referensens testimonial-sektion. index clampas mot items.length
        // ifall en redigering just tog bort ett citat medan en annan
        // sektion var vald sist.
        const items = section.items;
        const idx = items.length > 0 ? ((testimonialIndex % items.length) + items.length) % items.length : 0;
        const current = items[idx];
        return (
          <div className="px-10 py-16 text-center" style={{ background: sectionBg }}>
            <Field
              editable={editable}
              as="h2"
              className="font-serif text-[27px] mb-10"
              selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
              onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
            >
              {section.heading}
            </Field>
            {current && (
              <div className="max-w-[560px] mx-auto">
                <Field
                  editable={editable}
                  as="p"
                  className="font-serif italic text-[21px] leading-relaxed mb-4"
                  selected={selectedFieldKey === fieldSel("quote", current.quote, "citatet", idx)?.key}
                  onSelect={() => { const s = fieldSel("quote", current.quote, "citatet", idx); s && onSelectField?.(s); }}
                >
                  &ldquo;{current.quote}&rdquo;
                </Field>
                <Field
                  editable={editable}
                  as="div"
                  className="text-[12.5px] font-semibold"
                  style={{ color: palette.textDim }}
                  selected={selectedFieldKey === fieldSel("author", current.author, "namnet", idx)?.key}
                  onSelect={() => { const s = fieldSel("author", current.author, "namnet", idx); s && onSelectField?.(s); }}
                >
                  {current.author}
                </Field>
              </div>
            )}
            {items.length > 1 && (
              <div className="flex items-center justify-center gap-5 mt-9">
                <button
                  type="button"
                  aria-label="Föregående citat"
                  onClick={() => setTestimonialIndex((i) => (i - 1 + items.length) % items.length)}
                  className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: palette.cardBorder, color: palette.textDim }}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Visa citat ${i + 1}`}
                      onClick={() => setTestimonialIndex(i)}
                      className="w-2 h-2 rounded-full"
                      style={{ background: i === idx ? accent : palette.cardBorder }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Nästa citat"
                  onClick={() => setTestimonialIndex((i) => (i + 1) % items.length)}
                  className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: palette.cardBorder, color: palette.textDim }}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
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

      if (layout === "full-bleed") {
        // Kundönskemål: en RIKTIG bild som täcker hela sektionens bredd
        // bakom ett enda centrerat citat — exakt mönstret från
        // Restaurangen/Snickeriet i /exempel ("Snygg tonat längst upp,
        // några ingångar, en bild som täcker hela bredden med någon text
        // osv. Snyggt cleant."). Till skillnad från "single-quote" (som
        // bara har en konstbakgrund, ingen riktig bild) används här en
        // äkta bild (section.imageUrl, satt i kod — se
        // lib/assignUploadedImages.ts) med samma mörka
        // uttoningsgradient-teknik som heroens "overlay-bottom"/"fade-bottom"
        // ovan. Bara det FÖRSTA citatet visas — ett enda, rent uttalande,
        // ingen kortruta, ingen rubrik.
        const [first] = section.items;
        return (
          <div className="relative py-24 @3xl:py-28 text-center overflow-hidden" style={{ minHeight: 420 }}>
            <ImageOrArt imageUrl={section.imageUrl} art={art} fill dark />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.18) 100%)" }}
            />
            <h2 className="sr-only">{section.heading}</h2>
            {first && (
              <div className="max-w-xl mx-auto relative px-8 text-white">
                <Field
                  editable={editable}
                  as="p"
                  className="font-serif italic text-[24px] @3xl:text-[28px] leading-relaxed mb-4"
                  selected={selectedFieldKey === fieldSel("quote", first.quote, "citatet", 0)?.key}
                  onSelect={() => { const s = fieldSel("quote", first.quote, "citatet", 0); s && onSelectField?.(s); }}
                >
                  &ldquo;{first.quote}&rdquo;
                </Field>
                <Field
                  editable={editable}
                  as="div"
                  className="text-[13.5px]"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                  selected={selectedFieldKey === fieldSel("author", first.author, "namnet", 0)?.key}
                  onSelect={() => { const s = fieldSel("author", first.author, "namnet", 0); s && onSelectField?.(s); }}
                >
                  — {first.author}
                </Field>
              </div>
            )}
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

      if (layout === "image-bleed") {
        // Samma teknik som testimonials "full-bleed" (en RIKTIG bild, satt
        // i kod — se lib/assignUploadedImages.ts — med en mörk gradient),
        // men VÄNSTERSTÄLLD rubrik/text istället för ett centrerat citat —
        // det dramatiska, redaktionella avbrottet från kundens
        // referenssajter ("Where Creativity Meets Clarity" / "Create.
        // Customize. Grow.").
        return (
          <div className="relative px-8 @3xl:px-16 py-20 @3xl:py-28 text-white overflow-hidden" style={{ minHeight: 380 }}>
            <ImageOrArt imageUrl={section.imageUrl} art={darkArt} fill dark />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.30) 60%, rgba(0,0,0,0.15) 100%)" }}
            />
            <div className="relative max-w-[480px]">
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[30px] @3xl:text-[36px] leading-[1.12] mb-4"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed mb-7 opacity-85"
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
                <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor="#FFFFFF">
                  {section.ctaLabel}
                </CtaPill>
              </FieldBadge>
            </div>
          </div>
        );
      }

      if (layout === "dark-split") {
        // Kundens "Atelier"-referenskod — en "story"-sektion: en HELT
        // mörk bakgrund till vänster (rubrik/text/knapp i vitt), och en
        // riktig bild som fyller högra halvan som en EGEN, separat ruta
        // — till skillnad från "image-bleed" ovan är bilden INTE en
        // gradient-bakgrund bakom texten.
        return (
          <div className="grid @3xl:grid-cols-2">
            <div className="flex flex-col justify-center items-start px-8 @3xl:px-14 py-16 @3xl:py-20 text-white" style={{ background: "#171511" }}>
              <Field
                editable={editable}
                as="h2"
                className="font-serif text-[30px] @3xl:text-[40px] leading-[1.02] mb-5"
                selected={selectedFieldKey === fieldSel("heading", section.heading, "rubriken")?.key}
                onSelect={() => { const s = fieldSel("heading", section.heading, "rubriken"); s && onSelectField?.(s); }}
              >
                {section.heading}
              </Field>
              <Field
                editable={editable}
                as="p"
                className="text-[14.5px] leading-relaxed mb-7 max-w-[420px] opacity-80"
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
                <CtaPill accent="#FFFFFF" link={section.ctaLink} basePath={basePath} onNavigate={onNavigate} shape={buttonShape} textColor="#171511">
                  {section.ctaLabel}
                </CtaPill>
              </FieldBadge>
            </div>
            <div className="relative h-[280px] @3xl:h-auto">
              {/* Som "image-bleed" ovan — ingen egen bild-markering kopplad
                  för cta-sektionens bild. */}
              <ImageOrArt imageUrl={section.imageUrl} art={darkArt} fill />
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
          {/* Alltid 2 kolumner (inte 3 på desktop) — med 3 kolumner och ett
              udda antal bilder (t.ex. 4) hamnade en ensam bild på en egen
              rad under två mycket bredare, vilket gav ett skevt, ofärdigt
              intryck. 2 kolumner ger "2 och 2" (eller "2 och 1") som alltid
              ser balanserat ut. */}
          <div className="grid grid-cols-2 gap-4">
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
