"use client";

import { useT } from "@/components/I18nProvider";

// Ramen runt en panel i redigeraren: rubrik, kort förklaring, stängknapp och
// en rullningsbar yta för innehållet.
export default function PanelFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <div className="text-[17px] font-bold">{title}</div>
          {subtitle && <div className="text-[12px] text-ink-dim mt-0.5">{subtitle}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-ink-dim text-[18px] leading-none px-1">×</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-28">{children}</div>
    </div>
  );
}
