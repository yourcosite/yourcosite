"use client";

import { useEffect, useState } from "react";

// Visas när en superadmin är inloggad "som kund" (se
// app/api/admin/customers/[id]/impersonate). Knappen tar tillbaka till
// adminvyn utan ny inloggning.
export default function ImpersonationBanner() {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Hoppa över anropet för alla som inte har flaggan.
    if (!document.cookie.split("; ").some((c) => c === "ycs_imp_flag=1")) return;
    fetch("/api/admin/impersonation")
      .then((r) => r.json())
      .then((d) => setName(d.active ? d.customerName : null))
      .catch(() => {});
  }, []);

  if (!name) return null;

  const back = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/impersonation", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.actionLink) throw new Error(data.error || "Kunde inte gå tillbaka.");
      window.location.href = data.actionLink;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte gå tillbaka.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap items-center justify-center gap-3 bg-ink text-white rounded-full px-4 py-2.5 shadow-lg max-w-[calc(100vw-24px)]"
      role="status"
    >
      <span className="text-[13px]">
        Du är inloggad som <strong>{name}</strong>
      </span>
      <button
        type="button"
        onClick={back}
        disabled={busy}
        className="text-[13px] font-semibold bg-white text-ink rounded-full px-3.5 py-1.5 disabled:opacity-60"
      >
        {busy ? "Går tillbaka …" : "← Tillbaka till admin"}
      </button>
      {error && <span className="text-[12px] text-red-300">{error}</span>}
    </div>
  );
}
