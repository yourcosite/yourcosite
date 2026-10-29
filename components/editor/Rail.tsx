"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export type EditorPanel = "pages" | "design" | "news" | "bookings" | "improve" | "settings" | null;

const ICONS = {
  site: <><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></>,
  pages: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /></>,
  design: <><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="15.5" cy="10" r="1.2" /></>,
  news: <><path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z" /><line x1="8" y1="9" x2="15" y2="9" /><line x1="8" y1="13" x2="15" y2="13" /></>,
  bookings: <><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></>,
  improve: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  undo: <><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></>,
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const itemCls = (active: boolean) =>
  `relative w-[60px] flex flex-col items-center gap-1 py-2 rounded-xl text-[10.5px] font-medium ${active ? "bg-white/15 text-white" : "text-white/65 hover:text-white hover:bg-white/10"} disabled:opacity-40`;

// Det mörka sidofältet i redigeraren. Alla val öppnar paneler i redigeraren.
export default function Rail({
  siteId,
  panel,
  onPanel,
  canUndo,
  undoing,
  onUndo,
  improveCount,
}: {
  siteId?: string;
  panel: EditorPanel;
  onPanel: (p: EditorPanel) => void;
  canUndo: boolean;
  undoing: boolean;
  onUndo: () => void;
  improveCount: number;
}) {
  const t = useT();
  return (
    <aside className="hidden md:flex w-[72px] flex-shrink-0 bg-ink text-white flex-col items-center py-3.5 gap-1 z-20">
      <Link href="/dashboard" title={t("Tillbaka till kundzonen")} className="w-10 h-10 rounded-xl bg-accent text-accent-ink font-extrabold text-[18px] flex items-center justify-center mb-3">
        Y
      </Link>
      <button type="button" onClick={() => onPanel(null)} className={itemCls(panel === null)}>
        <Icon name="site" />
        {t("Sajt")}
      </button>
      <button type="button" onClick={() => onPanel(panel === "pages" ? null : "pages")} className={itemCls(panel === "pages")}>
        <Icon name="pages" />
        {t("Sidor")}
      </button>
      <button type="button" onClick={() => onPanel(panel === "design" ? null : "design")} className={itemCls(panel === "design")}>
        <Icon name="design" />
        {t("Design")}
      </button>
      <button type="button" onClick={() => onPanel(panel === "news" ? null : "news")} className={itemCls(panel === "news")}>
        <Icon name="news" />
        {t("Nyheter")}
      </button>
      <button type="button" onClick={() => onPanel(panel === "bookings" ? null : "bookings")} className={itemCls(panel === "bookings")}>
        <Icon name="bookings" />
        {t("Bokningar")}
      </button>
      <button type="button" onClick={() => onPanel(panel === "improve" ? null : "improve")} className={itemCls(panel === "improve")}>
        <Icon name="improve" />
        {t("Förbättra")}
        {improveCount > 0 && (
          <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {improveCount}
          </span>
        )}
      </button>
      <div className="flex-1" />
      <button type="button" onClick={() => onPanel(panel === "settings" ? null : "settings")} className={itemCls(panel === "settings")}>
        <Icon name="settings" />
        {t("Inställningar")}
      </button>
      <button type="button" onClick={onUndo} disabled={!canUndo || undoing} title={t("Ångra den senaste ändringen")} className={itemCls(false)}>
        <Icon name="undo" />
        {undoing ? t("Ångrar …") : t("Ångra senaste")}
      </button>
    </aside>
  );
}
