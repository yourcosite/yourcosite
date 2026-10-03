import type { SiteContent, Section } from "@/lib/contentModel";

// Renderar en sajt från innehållsmodellen. Rent läsläge — ingen redigering
// här (det kommer i chattredigeraren i nästa fas). Används i
// förhandsgranskningen efter att AI:n har byggt sajtens första utkast.
export default function SitePreview({ content }: { content: SiteContent }) {
  const page = content.pages[0];
  const fontClass = content.theme.font === "serif" ? "font-serif" : "font-sans";
  const accent = content.theme.accentColor;

  return (
    <div className={`${fontClass} text-ink`} style={{ "--preview-accent": accent } as React.CSSProperties}>
      {page.sections.map((section) => (
        <SectionBlock key={section.id} section={section} accent={accent} />
      ))}
    </div>
  );
}

function SectionBlock({ section, accent }: { section: Section; accent: string }) {
  switch (section.type) {
    case "hero":
      return (
        <div className="px-10 py-16 text-center">
          {section.eyebrow && (
            <div className="text-[12px] tracking-[0.12em] font-semibold mb-3" style={{ color: accent }}>
              {section.eyebrow.toUpperCase()}
            </div>
          )}
          <h1 className="text-[36px] leading-[1.1] font-medium mb-4">{section.headline}</h1>
          <p className="text-[15.5px] text-ink-dim max-w-[520px] mx-auto mb-6">{section.body}</p>
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
        <div className="px-10 py-10 max-w-[680px] mx-auto">
          <h2 className="text-[26px] font-medium mb-3">{section.heading}</h2>
          <p className="text-[15px] text-ink-dim leading-relaxed">{section.body}</p>
        </div>
      );
    case "grid":
      return (
        <div className="px-10 py-10">
          <h2 className="text-[26px] font-medium mb-5 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-3 gap-5 max-w-[920px] mx-auto">
            {section.items.map((item, i) => (
              <div key={i} className="border border-line rounded-2xl p-5 bg-surface">
                <div className="font-semibold text-[15px] mb-2">{item.title}</div>
                <div className="text-[13.5px] text-ink-dim leading-relaxed">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="px-10 py-10 bg-bg">
          <h2 className="text-[26px] font-medium mb-5 text-center">{section.heading}</h2>
          <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
            {section.items.map((t, i) => (
              <div key={i} className="border border-line rounded-2xl p-5 bg-surface">
                <p className="text-[14px] italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-[12.5px] text-ink-dim font-semibold">{t.author}</div>
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
        <div className="px-10 py-10 max-w-[560px] mx-auto text-center">
          <h2 className="text-[26px] font-medium mb-3">{section.heading}</h2>
          <p className="text-[14.5px] text-ink-dim mb-4">{section.body}</p>
          <div className="text-[13.5px] text-ink-dim flex flex-col gap-1">
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
