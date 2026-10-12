"use client";

import { useState } from "react";

type ShareLink = { id: string; url: string; createdAt: string; expiresAt: string };

// Knappen "Dela förhandsvisning" med en liten ruta där man skapar, kopierar och
// stänger av delningslänkar (se /api/sites/share). Används både i redigeraren
// och på förhandsgranskningssidan.
export default function ShareLinksButton({
  siteId,
  popoverDirection = "down",
  align = "right",
}: {
  siteId?: string;
  popoverDirection?: "up" | "down";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const copy = async (l: ShareLink) => {
    try {
      await navigator.clipboard.writeText(l.url);
      setCopiedId(l.id);
      setTimeout(() => setCopiedId((cur) => (cur === l.id ? null : cur)), 2500);
    } catch {
      // Kopieringen kan nekas av webbläsaren — länken syns ändå i rutan.
    }
  };

  const toggle = async () => {
    if (!siteId) return;
    const willOpen = !open;
    setOpen(willOpen);
    setError("");
    if (!willOpen) return;
    try {
      const res = await fetch(`/api/sites/share?siteId=${encodeURIComponent(siteId)}`);
      const data = await res.json();
      setLinks(data.links || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Kunde inte hämta dina delade länkar.");
    }
  };

  const create = async () => {
    if (!siteId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sites/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setLinks((ls) => [data.link, ...ls]);
      copy(data.link);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError("");
    try {
      const res = await fetch("/api/sites/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Kunde inte stänga av länken.");
      setLinks((ls) => ls.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        className="text-[12.5px] font-semibold text-ink bg-white border border-line rounded-full px-3.5 py-1.5"
      >
        🔗 Dela förhandsvisning
      </button>
      {open && (
        <div
          className={`absolute z-50 w-[min(460px,90vw)] bg-white border border-line rounded-xl shadow-xl p-3.5 text-[12px] ${
            popoverDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-[13px]">Delade länkar</div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Stäng" className="text-ink-dim font-bold px-1">×</button>
          </div>
          <p className="text-ink-dim mb-2.5">
            Den som har en länk kan titta på sajten men inte ändra något. Varje länk gäller i 14 dagar, och du kan stänga av den när du vill.
          </p>
          {links.length === 0 && <div className="text-ink-dim mb-2.5">Du har inga aktiva länkar just nu.</div>}
          <div className="flex flex-col gap-2 mb-2.5 max-h-[180px] overflow-y-auto">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <input
                  readOnly
                  value={l.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-bg border border-line rounded-full px-3 py-1 text-ink"
                />
                <button type="button" onClick={() => copy(l)} className="font-semibold border border-line rounded-full px-2.5 py-1 flex-shrink-0">
                  {copiedId === l.id ? "Kopierad ✓" : "Kopiera"}
                </button>
                <button type="button" onClick={() => revoke(l.id)} className="font-semibold text-red-600 border border-line rounded-full px-2.5 py-1 flex-shrink-0">
                  Stäng av
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="font-semibold bg-accent text-accent-ink rounded-full px-3.5 py-1.5 disabled:opacity-60"
          >
            {busy ? "Skapar …" : "+ Skapa ny länk"}
          </button>
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>
      )}
    </div>
  );
}
