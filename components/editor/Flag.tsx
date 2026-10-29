import type { Locale } from "@/lib/i18n/config";

// Runda flaggor som SVG, så de ser likadana ut på alla enheter (flaggemoji
// saknas i Windows). Förenklade men igenkännbara.
export default function Flag({ lang, size = 20 }: { lang: string; size?: number }) {
  const id = `fc-${lang}`;
  const body: Record<Locale, React.ReactNode> = {
    sv: (<><rect width="24" height="24" fill="#006AA7" /><rect x="7" width="4" height="24" fill="#FECC00" /><rect y="10" width="24" height="4" fill="#FECC00" /></>),
    da: (<><rect width="24" height="24" fill="#C8102E" /><rect x="7" width="3.5" height="24" fill="#fff" /><rect y="10.25" width="24" height="3.5" fill="#fff" /></>),
    fi: (<><rect width="24" height="24" fill="#fff" /><rect x="6.5" width="4" height="24" fill="#003580" /><rect y="10" width="24" height="4" fill="#003580" /></>),
    de: (<><rect width="24" height="8" fill="#000" /><rect y="8" width="24" height="8" fill="#DD0000" /><rect y="16" width="24" height="8" fill="#FFCE00" /></>),
    fr: (<><rect width="8" height="24" fill="#0055A4" /><rect x="8" width="8" height="24" fill="#fff" /><rect x="16" width="8" height="24" fill="#EF4135" /></>),
    es: (<><rect width="24" height="24" fill="#AA151B" /><rect y="6" width="24" height="12" fill="#F1BF00" /></>),
    en: (<><rect width="24" height="24" fill="#012169" /><path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="4" /><path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="1.6" /><rect x="9" width="6" height="24" fill="#fff" /><rect y="9" width="24" height="6" fill="#fff" /><rect x="10.2" width="3.6" height="24" fill="#C8102E" /><rect y="10.2" width="24" height="3.6" fill="#C8102E" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="flex-shrink-0 rounded-full">
      <defs><clipPath id={id}><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{body[lang as Locale] ?? <rect width="24" height="24" fill="#ccc" />}</g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
    </svg>
  );
}
