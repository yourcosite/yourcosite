import type { SiteContent, Section, BackgroundMode, ThemeFont } from "@/lib/contentModel";

const PALETTES: Record<BackgroundMode, { bg: string; bgAlt: string; text: string; textDim: string; cardBg: string; cardBorder: string }> = {
  light: { bg: "#FFFFFF", bgAlt: "#F7F6F3", text: "#17171A", textDim: "#6E6C68", cardBg: "#FFFFFF", cardBorder: "#ECEAE6" },
  warm: { bg: "#FBF2EC", bgAlt: "#F3E6DA", text: "#3E2A1C", textDim: "#8A6F57", cardBg: "#FFFBF7", cardBorder: "#F0E3DA" },
  dark: { bg: "#17171A", bgAlt: "#1F1F23", text: "#F5F4F1", textDim: "#9E9C97", cardBg: "#232327", cardBorder: "#2E2E33" },
};

// Renderar en sajt från innehållsmodellen. Rent läsläge — ingen redigering
// här (det kommer i chattredigeraren i nästa fas). fontOverride/
// backgroundModeOverride låter /forslag visa samma AI-skrivna innehåll i
// tre olika stilvarianter utan att spara något förrän kunden valt en.
export default function SitePreview({
  content,
  fontOverride,
  backgroundModeOverride,
}: {
  content: SiteContent;
  fontOverride?: ThemeFont;
  backgroundModeOverride?: BackgroundMode;
}) {
  const page = content.pages[0];
  const font = fontOverride ?? content.theme.font;
  const mode = backgroundModeOverride ?? content.theme.backgroundMode ?? "light";
  const fontClass = font === "serif" ? "font-serif" : "font-sans";
  const accent = content.theme.accentColor;
  const palette = PALETTES[mode];

  return (
    <div className={fontClass} style={{ background: palette.bg, color: palette.text }}>
      {page.sections.map((section, i) => (
        <SectionBlock key={section.id} section={section} accent={accent} palette={palette} alt={i % 2 === 1} />
      ))}
    </div>
  );
}

type Palette = (typeof PALETTES)[BackgroundMode];

function SectionBlock({
  section,
  accent,
  palette,
  alt,
}: {
  section: Section;
  accent: string;
  palette: Palette;
  alt: boolean;
}) {
  const sectionBg = alt ? palette.bgAlt : undefined;

  switch (section.type) {
    case "hero":
      return (
        <div className="px-10 py-16 text-center" style={{ background: sectionBg }}>
          {section.eyebrow && (
            <div className="text-[12px] tracking-[0.12em] font-semibold mb-3" style={{ color: accent }}>
              {section.eyebrow.toUpperCase()}
            </div>
          )}
          <h1 className="text-[36px] leading-[1.1] font-medium mb-4">{section.headline}</h1>
          <p className="text-[15.5px] max-w-[520px] mx-auto mb-6" style={{ color: palette.textDim }}>
            {section.body}
          </p>
          {section.ctaLabel && (
            <span
              className="inline-block font-semibold text-[13.5px] px-6 py-3 rounded-full"
              style={{ background: accent, color: "#17171A" }}
            >
              {section.ctaLabel}
            </span>
          )}
        </div>
      );
    case "about":
      return (
        <div className="px-10 py-10 max-w-[680px] mx-auto" style={{ background: sectionBg }}>
          <h2 className="text-[26px] font-medium mb-3">{section.heading}</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: palette.textDim }}>
            {section.body}
          </p>
        </div>
      );
    case "grid":
      return (
        <div className="px-10 py-10" style={{ background: sectionBg }}>
          <h2 className="text-[26px] font-medium mb-5 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-3 gap-5 max-w-[920px] mx-auto">
            {section.items.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 border"
                style={{ background: palette.cardBg, borderColor: palette.cardBorder }}
              >
                <div className="font-semibold text-[15px] mb-2">{item.title}</div>
                <div className="text-[13.5px] leading-relaxed" style={{ color: palette.textDim }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="px-10 py-10" style={{ background: sectionBg }}>
          <h2 className="text-[26px] font-medium mb-5 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
            {section.items.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 border"
                style={{ background: palette.cardBg, borderColor: palette.cardBorder }}
              >
                <p className="text-[14px] italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-[12.5px] font-semibold" style={{ color: palette.textDim }}>
                  {t.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="px-10 py-14 text-center" style={{ background: "#17171A", color: "#fff" }}>
          <h2 className="text-[28px] font-medium mb-3">{section.heading}</h2>
          <p className="text-[14.5px] mb-6 opacity-80 max-w-[480px] mx-auto">{section.body}</p>
          <span
            className="inline-block font-semibold text-[13.5px] px-6 py-3 rounded-full"
            style={{ background: accent, color: "#17171A" }}
          >
            {section.ctaLabel}
          </span>
        </div>
      );
    case "contact":
      return (
        <div className="px-10 py-10 max-w-[560px] mx-auto text-center" style={{ background: sectionBg }}>
          <h2 className="text-[26px] font-medium mb-3">{section.heading}</h2>
          <p className="text-[14.5px] mb-4" style={{ color: palette.textDim }}>
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
