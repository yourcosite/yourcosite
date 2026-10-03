import type { SiteContent, Section, BackgroundMode, ThemeFont } from "@/lib/contentModel";

// Varje stilvariant bygger en gradient-"bild" av kundens egna färger istället
// för ett grått platshållarfält. Så fort kunden laddar upp egna foton (nästa
// fas) är det här exakt de ytor som byts ut — vi lovar aldrig AI-genererade
// bilder, men layouten ska se lika stor och proffsig ut även innan de finns.
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

const PALETTES: Record<BackgroundMode, { bg: string; bgAlt: string; text: string; textDim: string; cardBg: string; cardBorder: string; overlayText: string }> = {
  light: { bg: "#FFFFFF", bgAlt: "#F7F6F3", text: "#17171A", textDim: "#6E6C68", cardBg: "#FFFFFF", cardBorder: "#ECEAE6", overlayText: "#17171A" },
  warm: { bg: "#FBF2EC", bgAlt: "#F3E6DA", text: "#3E2A1C", textDim: "#8A6F57", cardBg: "#FFFBF7", cardBorder: "#F0E3DA", overlayText: "#3E2A1C" },
  dark: { bg: "#17171A", bgAlt: "#1F1F23", text: "#F5F4F1", textDim: "#9E9C97", cardBg: "#232327", cardBorder: "#2E2E33", overlayText: "#F5F4F1" },
};

type Palette = (typeof PALETTES)[BackgroundMode];

export default function SitePreview({
  content,
  siteName,
  fontOverride,
  backgroundModeOverride,
}: {
  content: SiteContent;
  siteName?: string;
  fontOverride?: ThemeFont;
  backgroundModeOverride?: BackgroundMode;
}) {
  const page = content.pages[0];
  const font = fontOverride ?? content.theme.font;
  const mode = backgroundModeOverride ?? content.theme.backgroundMode ?? "light";
  const fontClass = font === "serif" ? "font-serif" : "font-sans";
  const accent = content.theme.accentColor;
  const secondary = content.theme.secondaryColors || [];
  const palette = PALETTES[mode];

  return (
    <div className={fontClass} style={{ background: palette.bg, color: palette.text }}>
      <Header siteName={siteName} logoUrl={content.logoUrl} pages={content.pages} palette={palette} />
      {page.sections.map((section, i) => (
        <SectionBlock
          key={section.id}
          section={section}
          accent={accent}
          secondary={secondary}
          mode={mode}
          palette={palette}
          alt={i % 2 === 1}
        />
      ))}
      <Footer siteName={siteName} palette={palette} />
    </div>
  );
}

function Header({
  siteName,
  logoUrl,
  pages,
  palette,
}: {
  siteName?: string;
  logoUrl?: string;
  pages: SiteContent["pages"];
  palette: Palette;
}) {
  return (
    <div
      className="flex items-center justify-between px-8 md:px-12 py-5"
      style={{ borderBottom: `1px solid ${palette.cardBorder}` }}
    >
      <div className="flex items-center gap-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName || "Logga"} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <span className="font-serif italic text-[19px]">{siteName || "Ditt företag"}</span>
        )}
      </div>
      <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold" style={{ color: palette.textDim }}>
        {pages.slice(0, 5).map((p) => (
          <span key={p.path}>{p.label}</span>
        ))}
      </nav>
    </div>
  );
}

function Footer({ siteName, palette }: { siteName?: string; palette: Palette }) {
  return (
    <div
      className="flex items-center justify-between px-8 md:px-12 py-5 text-[12px]"
      style={{ borderTop: `1px solid ${palette.cardBorder}`, color: palette.textDim }}
    >
      <span>{siteName || "Ditt företag"} · Byggd med YourCoSite</span>
    </div>
  );
}

function SectionBlock({
  section,
  accent,
  secondary,
  mode,
  palette,
  alt,
}: {
  section: Section;
  accent: string;
  secondary: string[];
  mode: BackgroundMode;
  palette: Palette;
  alt: boolean;
}) {
  const sectionBg = alt ? palette.bgAlt : undefined;
  const art = artBackground(mode, accent, secondary);

  switch (section.type) {
    case "hero":
      return (
        <div className="relative">
          <div className="relative h-[380px] md:h-[460px]" style={{ background: art }} />
          <div className="max-w-2xl mx-auto text-center px-6 -mt-24 md:-mt-28 relative pb-16">
            {section.eyebrow && (
              <div className="text-[12px] tracking-[0.12em] font-semibold mb-4" style={{ color: accent }}>
                {section.eyebrow.toUpperCase()}
              </div>
            )}
            <h1 className="font-serif text-[34px] md:text-[42px] leading-[1.12] mb-5">{section.headline}</h1>
            <p className="text-[15.5px] leading-relaxed mb-7" style={{ color: palette.textDim }}>
              {section.body}
            </p>
            {section.ctaLabel && (
              <span
                className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
                style={{ background: accent, color: "#17171A" }}
              >
                {section.ctaLabel}
              </span>
            )}
          </div>
        </div>
      );
    case "about":
      return (
        <div className="px-10 py-14 max-w-[680px] mx-auto" style={{ background: sectionBg }}>
          <h2 className="font-serif text-[27px] mb-4">{section.heading}</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: palette.textDim }}>
            {section.body}
          </p>
        </div>
      );
    case "grid":
      return (
        <div className="px-10 py-16 max-w-[980px] mx-auto" style={{ background: sectionBg }}>
          <h2 className="font-serif text-[27px] mb-8 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-3 gap-7">
            {section.items.map((item, i) => {
              const hue = [accent, secondary[0], secondary[1]][i % 3] || accent;
              return (
                <div key={i}>
                  <div
                    className="h-[140px] rounded-2xl mb-4"
                    style={{
                      background: `linear-gradient(145deg, ${hue}55, ${hue}15)`,
                    }}
                  />
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
    case "testimonials": {
      const [first, ...rest] = section.items;
      return (
        <div className="relative px-6 py-20 text-center" style={{ background: art }}>
          <h2 className="sr-only">{section.heading}</h2>
          {first && (
            <div className="max-w-xl mx-auto relative">
              <p className="font-serif italic text-[24px] md:text-[27px] leading-relaxed mb-4">
                &ldquo;{first.quote}&rdquo;
              </p>
              <div className="text-[13.5px]" style={{ color: palette.textDim }}>
                — {first.author}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl mx-auto">
              {rest.map((t, i) => (
                <div
                  key={i}
                  className="text-[12.5px] px-4 py-2.5 rounded-xl border"
                  style={{ background: palette.cardBg, borderColor: palette.cardBorder, color: palette.textDim }}
                >
                  &ldquo;{t.quote.slice(0, 60)}{t.quote.length > 60 ? "…" : ""}&rdquo; — {t.author}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "cta":
      return (
        <div className="relative px-6 py-20 text-center text-white" style={{ background: artBackground("dark", accent, secondary) }}>
          <h2 className="font-serif text-[29px] mb-4">{section.heading}</h2>
          <p className="text-[14.5px] mb-7 opacity-80 max-w-[480px] mx-auto">{section.body}</p>
          <span
            className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
            style={{ background: accent, color: "#17171A" }}
          >
            {section.ctaLabel}
          </span>
        </div>
      );
    case "contact":
      return (
        <div className="px-10 py-16 max-w-[560px] mx-auto text-center" style={{ background: sectionBg }}>
          <h2 className="font-serif text-[27px] mb-4">{section.heading}</h2>
          <p className="text-[14.5px] mb-5" style={{ color: palette.textDim }}>
            {section.body}
          </p>
          <div className="text-[13.5px] flex flex-col gap-1" style={{ color: palette.textDim }}>
            {section.email && <span>{section.email}</span>}
            {section.phone && <span>{section.phone}</span>}
            {section.address && <span>{section.address}</span>}
          </div>
        </div>
      );
    default:
      return null;
  }
}
