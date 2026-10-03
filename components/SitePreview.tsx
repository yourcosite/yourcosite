"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import type { SiteContent, Section, SocialLink, BackgroundMode, ThemeFont } from "@/lib/contentModel";
import { socialPlatformLabel, socialPlatformColor } from "@/lib/socialPlatforms";
import { SocialGlyph } from "@/lib/socialIcons";

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
  activePath,
  basePath,
  onNavigate,
  privacyPolicyMode,
  privacyPolicyFileUrl,
  privacyPolicyText,
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
}) {
  const isPrivacyPolicyPage =
    activePath === PRIVACY_POLICY_PATH && privacyPolicyMode === "generated" && !!privacyPolicyText;
  const page = isPrivacyPolicyPage
    ? { path: PRIVACY_POLICY_PATH, label: "Integritetspolicy", sections: [] }
    : content.pages.find((p) => p.path === activePath) || content.pages[0];
  const font = fontOverride ?? content.theme.font;
  // Prioritet: en uttrycklig förhandsvisnings-override (t.ex. /forslag, som
  // tvingar fram ett läge oavsett innehåll) vinner alltid. Annars används
  // sidans EGEN bakgrund om kunden bett om en annan bakgrund på just den
  // här sidan (SitePageContent.backgroundMode, se lib/contentModel.ts) —
  // annars sajtens vanliga tema, precis som innan det fältet fanns.
  const mode = backgroundModeOverride ?? page.backgroundMode ?? content.theme.backgroundMode ?? "light";
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
    <div className={fontClass} style={{ background: palette.bg, color: palette.text }}>
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
            heroEmphasis
            basePath={basePath}
            onNavigate={onNavigate}
          />
        )}
      </div>
      {isPrivacyPolicyPage ? (
        <PrivacyPolicyBlock text={privacyPolicyText!} palette={palette} />
      ) : (
        restSections.map((section, i) => (
          <SectionBlock
            key={section.id}
            section={section}
            accent={accent}
            secondary={secondary}
            mode={mode}
            palette={palette}
            alt={(overlayHeader ? i + 1 : i) % 2 === 1}
            socialLinks={content.socialLinks}
            // Startsidans första sektion är besökarens allra första intryck —
            // ska kännas som en "wow"-ingång. Gäller bara hero överst på "/".
            heroEmphasis={!overlayHeader && page.path === "/" && i === 0}
            basePath={basePath}
            onNavigate={onNavigate}
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
    <div className="px-8 md:px-14 py-14 max-w-[720px] mx-auto">
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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const homeHref = (p: string) => (basePath ? `${basePath}${p === "/" ? "" : p}` : "#");
  const linkColor = (active: boolean) =>
    overlay ? (active ? "#FFFFFF" : "rgba(255,255,255,0.8)") : active ? palette.text : palette.textDim;
  const hamburgerColor = overlay ? "#FFFFFF" : palette.text;

  return (
    <div
      // OBS: "relative"/"absolute" väljs som ETT ENDA uttryck, aldrig båda
      // klasserna samtidigt — Tailwinds genererade CSS-ordning låter annars
      // "relative" vinna över "absolute" oavsett klassordning i strängen,
      // vilket en gång redan orsakade en osynlig hero-bild (se ImageOrArt).
      // Mobilmenyns utfällbara panel positioneras "absolute" mot den här
      // headern, så den behöver vara en positionerad förälder även i
      // icke-overlay-läget.
      className={`flex items-center justify-between px-8 md:px-12 py-4 ${
        overlay ? "absolute top-0 left-0 right-0 z-10" : "relative"
      }`}
      style={
        overlay
          ? { background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)" }
          : { borderBottom: `1px solid ${palette.cardBorder}` }
      }
    >
      <div className="flex items-center gap-2.5">
        {logoUrl ? (
          // Loggan är kundens egen bild — ska vara ett tydligt kännetecken i
          // headern, inte en liten ikon. ~3x tidigare storlek (h-8 → h-24).
          // Ovanpå en foto-hero får den en ljus platta bakom sig så den
          // alltid syns oavsett hur ljus/mörk loggan själv är.
          <div className={overlay ? "bg-white/90 rounded-lg px-3 py-1.5" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={siteName || "Logga"}
              className={overlay ? "h-12 md:h-16 max-w-[220px] object-contain" : "h-16 md:h-24 max-w-[320px] object-contain"}
            />
          </div>
        ) : (
          <span className={`font-serif italic text-[19px] ${overlay ? "text-white" : ""}`}>
            {siteName || "Ditt företag"}
          </span>
        )}
      </div>
      <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold">
        {pages.slice(0, 5).map((p) =>
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
        )}
      </nav>

      {/* Hamburgarmeny — tidigare fanns ingen mobilvariant av menyn alls
          (bara "hidden md:flex" ovan), så sidorna gick inte att nå på en
          smal skärm. Syns bara under md-brytpunkten, fäller ut en enkel
          lista med sidorna. */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
        aria-expanded={menuOpen}
        className="md:hidden flex flex-col items-center justify-center gap-[5px] w-9 h-9 flex-shrink-0"
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

      {menuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 z-20 flex flex-col py-2 shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
          style={{ background: palette.cardBg, borderBottom: `1px solid ${palette.cardBorder}` }}
        >
          {pages.slice(0, 5).map((p) =>
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
      )}
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
      <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-8 md:px-12 py-5 text-[12.5px]">
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
        className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 md:px-12 py-6 text-[12px]"
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
function ImageOrArt({
  imageUrl,
  art,
  className,
  dark,
  fill,
}: {
  imageUrl?: string;
  art: string;
  className?: string;
  dark?: boolean;
  fill?: boolean;
}) {
  return (
    <div className={`${fill ? "absolute inset-0" : "relative"} overflow-hidden ${className || ""}`} style={{ background: art }}>
      {imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {dark && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.18)" }} />}
        </>
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

function CtaPill({
  accent,
  children,
  link,
  basePath,
  onNavigate,
}: {
  accent: string;
  children: React.ReactNode;
  link?: string;
  basePath?: string;
  onNavigate?: (path: string) => void;
}) {
  return (
    <CtaLink
      link={link}
      basePath={basePath}
      onNavigate={onNavigate}
      className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
      style={{ background: accent, color: "#17171A" }}
    >
      {children}
    </CtaLink>
  );
}

function SectionBlock({
  section,
  accent,
  secondary,
  mode,
  palette,
  alt,
  socialLinks,
  heroEmphasis,
  basePath,
  onNavigate,
}: {
  section: Section;
  accent: string;
  secondary: string[];
  mode: BackgroundMode;
  palette: Palette;
  alt: boolean;
  socialLinks?: SocialLink[];
  // true för startsidans första sektion — ger hero-layouterna en större,
  // mer dramatisk bild/rubrik oavsett vilken layout AI:n valt.
  heroEmphasis?: boolean;
  // Vidarebefordras bara till CTA-knappen (se CtaLink) — samma
  // basePath/onNavigate som Header redan använder för menyn.
  basePath?: string;
  onNavigate?: (path: string) => void;
}) {
  const sectionBg = alt ? palette.bgAlt : undefined;
  const art = artBackground(mode, accent, secondary);

  switch (section.type) {
    case "hero": {
      const layout = section.layout || "centered";

      if (layout === "split-left" || layout === "split-right") {
        const imageFirst = layout === "split-left";
        const imageCol = (
          <ImageOrArt
            imageUrl={section.imageUrl}
            art={art}
            className={heroEmphasis ? "h-[420px] md:h-[600px]" : "h-[320px] md:h-[440px]"}
          />
        );
        const textCol = (
          <div className={`flex flex-col justify-center px-8 md:px-14 ${heroEmphasis ? "py-10 md:py-0" : "py-10"} ${imageFirst ? "md:text-left" : "md:text-right md:items-end"}`}>
            {section.eyebrow && (
              <div className="text-[12px] tracking-[0.12em] font-semibold mb-3" style={{ color: accent }}>
                {section.eyebrow.toUpperCase()}
              </div>
            )}
            <h1 className={`font-serif leading-[1.1] mb-4 ${heroEmphasis ? "text-[38px] md:text-[48px]" : "text-[30px] md:text-[36px]"}`}>
              {section.headline}
            </h1>
            <p className={`leading-relaxed mb-6 max-w-[420px] ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`} style={{ color: palette.textDim }}>
              {section.body}
            </p>
            {section.ctaLabel && (
              <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate}>
                {section.ctaLabel}
              </CtaPill>
            )}
          </div>
        );
        return (
          <div className="grid md:grid-cols-2">
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
          <div className={`relative ${heroEmphasis ? "h-[560px] md:h-[720px]" : "h-[460px] md:h-[560px]"}`}>
            <ImageOrArt imageUrl={section.imageUrl} art={art} fill dark />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.05) 75%)" }}
            />
            <div className={`absolute bottom-0 left-0 right-0 px-8 md:px-14 pb-10 md:pb-14 text-white ${heroEmphasis ? "max-w-[680px]" : "max-w-[560px]"}`}>
              {section.eyebrow && (
                <div className="text-[12px] tracking-[0.12em] font-semibold mb-3" style={{ color: accent }}>
                  {section.eyebrow.toUpperCase()}
                </div>
              )}
              <h1 className={`font-serif leading-[1.08] mb-4 ${heroEmphasis ? "text-[40px] md:text-[56px]" : "text-[32px] md:text-[42px]"}`}>
                {section.headline}
              </h1>
              <p className={`leading-relaxed mb-6 opacity-85 ${heroEmphasis ? "text-[16.5px]" : "text-[15px]"}`}>{section.body}</p>
              {section.ctaLabel && (
              <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate}>
                {section.ctaLabel}
              </CtaPill>
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
            className={heroEmphasis ? "h-[420px] md:h-[580px]" : "h-[300px] md:h-[380px]"}
            dark={mode === "dark"}
          />
          <div
            className={`max-w-2xl mx-auto text-center px-8 md:px-12 relative rounded-2xl ${
              heroEmphasis ? "py-12 md:py-16 -mt-16 md:-mt-20" : "py-10 md:py-12 -mt-14 md:-mt-16"
            }`}
            style={{ background: palette.cardBg, boxShadow: "0 16px 40px rgba(0,0,0,0.10)" }}
          >
            {section.eyebrow && (
              <div className="text-[12px] tracking-[0.12em] font-semibold mb-4" style={{ color: accent }}>
                {section.eyebrow.toUpperCase()}
              </div>
            )}
            <h1 className={`font-serif leading-[1.12] mb-5 ${heroEmphasis ? "text-[38px] md:text-[48px]" : "text-[32px] md:text-[40px]"}`}>
              {section.headline}
            </h1>
            <p className={`leading-relaxed mb-7 ${heroEmphasis ? "text-[16.5px]" : "text-[15.5px]"}`} style={{ color: palette.textDim }}>
              {section.body}
            </p>
            {section.ctaLabel && (
              <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate}>
                {section.ctaLabel}
              </CtaPill>
            )}
          </div>
        </div>
      );
    }

    case "about":
      return (
        <div className="px-10 py-14 max-w-[680px] mx-auto" style={{ background: sectionBg }}>
          <h2 className="font-serif text-[27px] mb-4">{section.heading}</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: palette.textDim }}>
            {section.body}
          </p>
        </div>
      );

    case "grid": {
      const layout = section.layout || "cards";

      if (layout === "alternating-rows") {
        return (
          <div className="py-4" style={{ background: sectionBg }}>
            <h2 className="font-serif text-[27px] mb-2 text-center pt-10">{section.heading}</h2>
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              const imageFirst = i % 2 === 0;
              const imageCol = (
                <ImageOrArt
                  imageUrl={item.imageUrl}
                  art={`linear-gradient(145deg, ${hue}55, ${hue}15)`}
                  className="h-[220px] md:h-[300px]"
                />
              );
              const textCol = (
                <div className="flex flex-col justify-center px-8 md:px-14 py-8 max-w-[440px]">
                  <div className="font-serif text-[20px] mb-2.5">{item.title}</div>
                  <div className="text-[14px] leading-relaxed" style={{ color: palette.textDim }}>
                    {item.body}
                  </div>
                </div>
              );
              return (
                <div key={i} className="grid md:grid-cols-2">
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
            <h2 className="font-serif text-[27px] mb-7">{section.heading}</h2>
            <div className="flex flex-col gap-6">
              {section.items.map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ background: [accent, secondary[0], secondary[1]][i % 3] || accent }}
                  />
                  <div>
                    <div className="font-semibold text-[15.5px] mb-1">{item.title}</div>
                    <div className="text-[13.5px] leading-relaxed" style={{ color: palette.textDim }}>
                      {item.body}
                    </div>
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
            <h2 className="font-serif text-[27px] mb-9 text-center">{section.heading}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {section.items.map((item, i) => (
                <div key={i} className="relative pt-2">
                  <div className="text-[13px] font-bold tracking-[0.08em] mb-2" style={{ color: accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="font-serif text-[17px] mb-2">{item.title}</div>
                  <div className="text-[13.5px] leading-relaxed" style={{ color: palette.textDim }}>
                    {item.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // cards (default)
      return (
        <div className="px-10 py-16 max-w-[980px] mx-auto" style={{ background: sectionBg }}>
          <h2 className="font-serif text-[27px] mb-8 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-3 gap-7">
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              return (
                <div key={i}>
                  <ImageOrArt imageUrl={item.imageUrl} art={`linear-gradient(145deg, ${hue}55, ${hue}15)`} className="h-[140px] rounded-2xl mb-4" />
                  <div className="font-serif text-[17px] mb-2">{item.title}</div>
                  <div className="text-[13.5px] leading-relaxed" style={{ color: palette.textDim }}>
                    {item.body}
                  </div>
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
            <h2 className="font-serif text-[27px] mb-8 text-center">{section.heading}</h2>
            <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
              {section.items.map((t, i) => (
                <div key={i} className="rounded-2xl p-5 border" style={{ background: palette.cardBg, borderColor: palette.cardBorder }}>
                  <p className="text-[14px] italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                  <div className="text-[12.5px] font-semibold" style={{ color: palette.textDim }}>
                    {t.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (layout === "side-by-side") {
        const [first, ...rest] = section.items;
        return (
          <div className="grid md:grid-cols-2" style={{ background: sectionBg }}>
            <div className="flex flex-col justify-center px-10 py-14">
              <h2 className="font-serif text-[27px] mb-2">{section.heading}</h2>
              <div className="text-[13.5px]" style={{ color: palette.textDim }}>
                Vad kunder säger om oss.
              </div>
            </div>
            <div className="flex flex-col justify-center px-10 py-14" style={{ background: palette.bgAlt }}>
              {first && (
                <>
                  <p className="font-serif italic text-[20px] leading-relaxed mb-3">&ldquo;{first.quote}&rdquo;</p>
                  <div className="text-[13px] font-semibold" style={{ color: palette.textDim }}>
                    — {first.author}
                  </div>
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
        <div className="relative px-8 md:px-10 py-20 text-center" style={{ background: art }}>
          <h2 className="sr-only">{section.heading}</h2>
          {first && (
            <div className="max-w-xl mx-auto relative">
              <p className="font-serif italic text-[24px] md:text-[27px] leading-relaxed mb-4">&ldquo;{first.quote}&rdquo;</p>
              <div className="text-[13.5px]" style={{ color: palette.textDim }}>
                — {first.author}
              </div>
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
          <div className="grid md:grid-cols-2">
            <div className="flex flex-col justify-center px-10 md:px-14 py-14" style={{ background: sectionBg }}>
              <h2 className="font-serif text-[27px] mb-3">{section.heading}</h2>
              <p className="text-[14.5px] leading-relaxed" style={{ color: palette.textDim }}>
                {section.body}
              </p>
            </div>
            <div className="flex items-center justify-center px-10 py-14" style={{ background: accent }}>
              <CtaLink
                link={section.ctaLink}
                basePath={basePath}
                onNavigate={onNavigate}
                className="font-semibold text-[15px] text-[#17171A] text-center"
              >
                {section.ctaLabel}
              </CtaLink>
            </div>
          </div>
        );
      }

      // centered (default)
      return (
        <div className="relative px-8 md:px-10 py-20 text-center text-white" style={{ background: darkArt }}>
          <h2 className="font-serif text-[29px] mb-4">{section.heading}</h2>
          <p className="text-[14.5px] mb-7 opacity-80 max-w-[480px] mx-auto">{section.body}</p>
          <CtaPill accent={accent} link={section.ctaLink} basePath={basePath} onNavigate={onNavigate}>
            {section.ctaLabel}
          </CtaPill>
        </div>
      );
    }

    case "contact": {
      const layout = section.layout || "centered";

      if (layout === "split-info") {
        return (
          <div className="grid md:grid-cols-2 max-w-[880px] mx-auto px-10 py-16 gap-10" style={{ background: sectionBg }}>
            <div>
              <h2 className="font-serif text-[27px] mb-4">{section.heading}</h2>
              <p className="text-[14.5px] leading-relaxed" style={{ color: palette.textDim }}>
                {section.body}
              </p>
            </div>
            <div className="rounded-2xl border p-6 flex flex-col gap-3" style={{ background: palette.cardBg, borderColor: palette.cardBorder }}>
              {section.email && (
                <div className="text-[13.5px]">
                  <span className="font-semibold">E-post: </span>
                  <span style={{ color: palette.textDim }}>{section.email}</span>
                </div>
              )}
              {section.phone && (
                <div className="text-[13.5px]">
                  <span className="font-semibold">Telefon: </span>
                  <span style={{ color: palette.textDim }}>{section.phone}</span>
                </div>
              )}
              {section.address && (
                <div className="text-[13.5px]">
                  <span className="font-semibold">Adress: </span>
                  <span style={{ color: palette.textDim }}>{section.address}</span>
                </div>
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
          <h2 className="font-serif text-[27px] mb-4">{section.heading}</h2>
          <p className="text-[14.5px] mb-5" style={{ color: palette.textDim }}>
            {section.body}
          </p>
          <div className="text-[13.5px] flex flex-col gap-1 mb-4" style={{ color: palette.textDim }}>
            {section.email && <span>{section.email}</span>}
            {section.phone && <span>{section.phone}</span>}
            {section.address && <span>{section.address}</span>}
          </div>
          {socialLinks && socialLinks.length > 0 && (
            <div className="flex justify-center">
              <SocialIcons socialLinks={socialLinks} palette={palette} />
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
