"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

// Väljer vilken sajt som visas först när kunden klickar på "Bokningar" i
// menyn. Valet sparas i kontot och följer med mellan enheter.

export default function DefaultSiteButton({ siteId, isDefault }: { siteId: string; isDefault: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isDefault) {
    return <span className="text-[12.5px] text-ink-dim self-center ml-1">✓ {t("Visas först när du klickar på Bokningar")}</span>;
  }
  return (
    <button
      type="button"
      className="text-[12.5px] font-semibold underline text-ink-dim self-center ml-1"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/booking/default-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId }) });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) setError(d.error || t("Något gick fel."));
          else router.refresh();
        } catch {
          setError(t("Något gick fel, försök igen."));
        } finally {
          setBusy(false);
        }
      }}
    >
      {error || t("Visa den här först")}
    </button>
  );
}
