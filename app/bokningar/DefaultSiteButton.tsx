"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

// Väljer vilken sajt som visas först när kunden klickar på "Bokningar" i
// menyn. Valet sparas i en cookie i webbläsaren (ett år).
export const BOOKING_SITE_COOKIE = "ycs-booking-site";

export default function DefaultSiteButton({ siteId, isDefault }: { siteId: string; isDefault: boolean }) {
  const t = useT();
  const router = useRouter();
  if (isDefault) {
    return <span className="text-[12.5px] text-ink-dim self-center ml-1">✓ {t("Visas först när du klickar på Bokningar")}</span>;
  }
  return (
    <button
      type="button"
      className="text-[12.5px] font-semibold underline text-ink-dim self-center ml-1"
      onClick={() => {
        document.cookie = `${BOOKING_SITE_COOKIE}=${siteId}; path=/; max-age=${365 * 86400}; samesite=lax`;
        router.refresh();
      }}
    >
      {t("Visa den här först")}
    </button>
  );
}
