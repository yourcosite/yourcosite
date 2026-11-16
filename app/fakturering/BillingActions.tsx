"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

// Knapp som skickar kunden vidare till Stripe: antingen för att betala med kort
// (mode "pay") eller till kundportalen för att byta kort och se kvitton (mode "portal").
export default function BillingActions({ mode }: { mode: "pay" | "portal" }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(mode === "pay" ? "/api/billing/checkout" : "/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || t("Något gick fel. Försök igen."));
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button type="button" onClick={go} disabled={busy} className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4 py-2.5 rounded-lg disabled:opacity-60">
        {busy ? t("Öppnar …") : mode === "pay" ? t("Betala med kort") : t("Hantera kort och kvitton")}
      </button>
      {error && <p className="text-[12.5px] text-warm mt-2">{error}</p>}
    </div>
  );
}
