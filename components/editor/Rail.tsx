"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import YIcon from "@/components/ui/YIcon";

export type EditorPanel = "pages" | "design" | "news" | "bookings" | "improve" | "settings" | null;

const ICON_NAME = { site: "site", pages: "pages", design: "design", news: "news", bookings: "bookings", improve: "search", settings: "sliders", undo: "undo", home: "home" } as const;

function Icon({ name }: { name: keyof typeof ICON_NAME }) {
  return <YIcon name={ICON_NAME[name]} size={21} />;
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
      <Link href="/dashboard" title={t("Tillbaka till kundzonen")} className="w-[60px] flex flex-col items-center gap-1 py-1.5 mb-2 rounded-xl text-[10.5px] font-semibold text-white hover:bg-white/10">
        <span className="w-9 h-9 rounded-xl bg-accent text-accent-ink flex items-center justify-center"><Icon name="home" /></span>
        {t("Kundzon")}
      </Link>
      <div className="w-8 h-px bg-white/15 mb-1.5" />
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
