import type { CSSProperties, ReactNode } from "react";

// YourCoSites egna ikoner. Samma ritsätt genom hela familjen:
// 24-rutnät, 1,7 i linjetjocklek, runda ändar och hörn (samma mjuka former som
// loggan), och ETT ljusgrönt accentelement per ikon som ger den dess karaktär.
// Linjen följer textfärgen (currentColor); accenten styrs med prop accent, till
// exempel en dämpad färg när ikonen ligger på en ljusgrön knapp.
//
// Elementen med className "a" är accenten.
const ICONS: Record<string, ReactNode> = {
  site: <><rect x="3" y="4.5" width="18" height="15" rx="3.5" /><path d="M3 9.5h18" /><rect x="6.5" y="12.5" width="6" height="4" rx="1.4" className="a" /></>,
  pages: <><path className="a" d="M14 3.5V8h4.5z" /><path d="M7 3.5h7l4.5 4.5v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5z" /><path d="M14 3.5V8h4.5M8 13h6.5M8 16.5h4" /></>,
  design: <><path d="M12 3.5c-4.7 0-8.5 3.5-8.5 8s3.6 8.5 8 8.5c1.4 0 2-.8 2-1.7 0-1.4-1.1-1.6-1.1-2.8 0-1 .8-1.8 1.9-1.8h2c2.3 0 4.2-1.6 4.2-3.9C20.5 6.5 16.8 3.5 12 3.5z" /><circle className="a" cx="8" cy="10.5" r="1.5" /><circle className="a" cx="12" cy="7.8" r="1.5" /><circle className="a" cx="16" cy="10.2" r="1.5" /></>,
  news: <><rect x="4" y="4.5" width="16" height="15" rx="3" /><path d="M8 9h8M8 12.5h8" /><rect className="a" x="8" y="15" width="5" height="2.2" rx="1.1" /></>,
  bookings: <><rect x="3.5" y="5.5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" /><rect className="a" x="7.5" y="13" width="4" height="4" rx="1.2" /></>,
  search: <><circle className="a" cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></>,
  sliders: <><path d="M4 7h9M17.5 7H20M4 17h2.5M11 17h9" /><circle className="a" cx="15" cy="7" r="2.3" /><circle className="a" cx="8.8" cy="17" r="2.3" /></>,
  undo: <><path d="M9 14L4.5 9.5 9 5M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /><circle className="a" cx="14" cy="15" r="1.7" /></>,
  home: <><rect className="a" x="10" y="14" width="4" height="6.5" rx="1.2" /><path d="M3.5 11L12 4l8.5 7M5.5 9.7V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.7" /></>,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 21h4" /><circle className="a" cx="17.8" cy="5.6" r="2.4" /></>,
  bulb: <><path className="a" d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.2 1.1 2.2h5c0-1 .4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z" /><path d="M9.5 19h5M10.5 21.2h3" /></>,
  pencil: <><path className="a" d="M4.5 19.5l1-4 3 3z" /><path d="M5.5 15.5L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5l-4 1z" /></>,
  section: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><rect className="a" x="6.5" y="8" width="7" height="2.6" rx="1.3" /><path d="M6.5 14h11" /></>,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><circle className="a" cx="8.6" cy="10" r="1.7" /><path d="M4 17l4.5-4.2 3.5 3 3-2.6L20 17" /></>,
  crop: <><rect className="a" x="9" y="9" width="6" height="6" rx="1.5" /><path d="M7 3.5v13.5h13.5M3.5 7H17v13.5" /></>,
  plus: <><circle className="a" cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></>,
  trash: <><rect className="a" x="4.5" y="5" width="15" height="3.2" rx="1.6" /><path d="M10 5V3.5h4V5M6.5 9l.8 9.5a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 9" /></>,
  code: <><circle className="a" cx="12" cy="12" r="1.9" /><path d="M8.5 8L4.5 12l4 4M15.5 8l4 4-4 4" /></>,
  plate: <><circle cx="12" cy="12" r="8.5" /><circle className="a" cx="12" cy="12" r="4.2" /></>,
  people: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle className="a" cx="16.6" cy="8.2" r="2.6" /><path d="M15.6 14.4a4.8 4.8 0 0 1 4.9 4.6" /></>,
  button: <><rect className="a" x="3" y="8" width="18" height="8" rx="4" /><path d="M8.5 12h7" /></>,
  layout: <><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" /><rect className="a" x="13" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" /><rect x="13" y="13" width="7.5" height="7.5" rx="2" /></>,
  shapes: <><circle className="a" cx="8" cy="8" r="4.5" /><rect x="12" y="12" width="8" height="8" rx="2" /></>,
  sectionUp: <><rect className="a" x="4" y="14.5" width="16" height="5.5" rx="2" /><path d="M12 12V4.5M8.5 8L12 4.5 15.5 8" /></>,
  history: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /><circle className="a" cx="12" cy="12" r="1.7" /></>,
  attach: <><path d="M17.5 11.5l-6 6a4 4 0 0 1-5.7-5.7l7-7a2.7 2.7 0 0 1 3.8 3.8l-7 7a1.3 1.3 0 0 1-1.9-1.9l6-6" /><circle className="a" cx="18.6" cy="17.6" r="2" /></>,
  upload: <><rect className="a" x="4" y="15" width="16" height="5" rx="2" /><path d="M12 12.5V4M8 8l4-4 4 4" /></>,
  folder: <><path className="a" d="M3.5 8A2.5 2.5 0 0 1 6 5.5h3.2l2 2.5H3.5z" /><path d="M3.5 8a2.5 2.5 0 0 1 2.5-2.5h3.2l2 2.5H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" /></>,
  check: <><circle className="a" cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.7 2.7L16 9.5" /></>,
  globe: <><ellipse className="a" cx="12" cy="12" rx="3.6" ry="8.5" /><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /></>,
  plug: <><path className="a" d="M6.5 7.5h11v3.5a5.5 5.5 0 0 1-11 0z" /><path d="M9 3.5v4M15 3.5v4M12 16.5v4" /></>,
  mic: <><rect className="a" x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></>,
  wand: <><circle className="a" cx="17.5" cy="6.5" r="3" /><path d="M4.5 19.5L15.5 8.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle className="a" cx="12" cy="12" r="3" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /><circle className="a" cx="12" cy="12" r="1.5" /></>,
  pointer: <><path className="a" d="M5 4.5l14 6.5-6 2.2-2.2 6z" /></>,
  move: <><path d="M3.5 12h17M7 8.5L3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5" /><circle className="a" cx="12" cy="12" r="1.8" /></>,
  question: <><circle className="a" cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1 .9-1 1.7M12 16.8h.01" /></>,
  speech: <><path className="a" d="M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-7l-5 3.5v-3.5H5A2.5 2.5 0 0 1 2.5 15V7A2.5 2.5 0 0 1 5 4.5z" /><circle cx="8.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" /></>,
  sunrise: <><path className="a" d="M7 18.5a5 5 0 0 1 10 0z" /><path d="M3.5 18.5h17M12 6v2M5.5 9.3l1.4 1.4M18.5 9.3l-1.4 1.4" /></>,
  warn: <><path className="a" d="M12 4l9 15.5H3z" /><path d="M12 10v4M12 16.8h.01" /></>,
};

// Emoji som används i äldre data (Millies tips, "Nytt"-listan) och ikonen som
// ersätter dem, så att allt ser ut som en och samma familj.
const EMOJI_TO_ICON: Record<string, string> = {
  "🔍": "search", "🪄": "wand", "🌍": "globe", "🌅": "sunrise", "📜": "pages", "🔘": "button",
  "✍️": "pencil", "✏️": "pencil", "🖼️": "image", "🖼": "image", "📅": "bookings", "✋": "pointer", "🗂️": "folder", "🗂": "folder",
  "↕️": "move", "↔️": "move", "📄": "pages", "📤": "upload", "🔗": "link", "👀": "eye", "📰": "news",
  "🤔": "question", "✂️": "crop", "🎤": "mic", "💬": "speech", "🗣️": "speech", "🎨": "design", "🧩": "layout",
  "🔌": "plug", "🍽️": "plate", "🍽": "plate", "✨": "bell", "📎": "attach", "➕": "plus", "🗑": "trash", "👥": "people",
};

export type YIconName = keyof typeof ICONS;

export default function YIcon({
  name,
  size = 18,
  accent = "#C6FF5E",
  className,
}: {
  name: string;
  size?: number;
  accent?: string;
  className?: string;
}) {
  const style = { "--ya": accent } as CSSProperties;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`yicon flex-shrink-0 ${className ?? ""}`}
      style={style}
    >
      {ICONS[name] ?? null}
    </svg>
  );
}

// Visar ikonen som hör till en emoji, eller emojin själv om vi saknar en.
export function EmojiIcon({ emoji, size = 22, accent, className }: { emoji: string; size?: number; accent?: string; className?: string }) {
  const name = EMOJI_TO_ICON[emoji.trim()];
  return name ? <YIcon name={name} size={size} accent={accent} className={className} /> : <span className={className}>{emoji}</span>;
}
