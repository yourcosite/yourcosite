"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

type DomainInfo = {
  slug: string | null;
  domain: string | null;
  status: "pending" | "active" | null;
  records: { type: string; name: string; value: string }[];
  manual?: boolean;
};

// Publicera sajten och koppla en egen domän. Öppnas från "Publicera" i
// redigerarens toppfält.
export default function PublishModal({
  siteId,
  status,
  onStatus,
  onClose,
}: {
  siteId: string;
  status: "draft" | "live" | "pausad";
  onStatus: (s: "draft" | "live") => void;
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<"" | "publish" | "domain" | "check">("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<DomainInfo | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [copied, setCopied] = useState("");
  const live = status === "live";

  const load = async () => {
    setBusy("check");
    try {
      const res = await fetch(`/api/sites/domain?siteId=${siteId}`);
      const d = await res.json();
      if (res.ok) setInfo(d);
    } catch { /* tyst */ }
    setBusy("");
  };
  useEffect(() => {
    if (live) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, siteId]);

  const publish = async (value: boolean) => {
    if (!value && !window.confirm(t("Avpublicera sajten? Besökare ser då inte längre sajten."))) return;
    setBusy("publish");
    setError("");
    try {
      const res = await fetch("/api/sites/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, publish: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || t("Något gick fel.")); setBusy(""); return; }
      onStatus(value ? "live" : "draft");
      if (value) setInfo((i) => ({ ...(i ?? { domain: null, status: null, records: [] }), slug: d.slug }));
    } catch {
      setError(t("Något gick fel."));
    }
    setBusy("");
  };

  const connect = async () => {
    setBusy("domain");
    setError("");
    try {
      const res = await fetch("/api/sites/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, domain: domainInput }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || t("Något gick fel."));
      else { setInfo(d); setDomainInput(""); }
    } catch {
      setError(t("Något gick fel."));
    }
    setBusy("");
  };

  const removeDomain = async () => {
    setBusy("domain");
    await fetch(`/api/sites/domain?siteId=${siteId}`, { method: "DELETE" }).catch(() => {});
    setInfo((i) => (i ? { ...i, domain: null, status: null, records: [] } : i));
    setBusy("");
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    }).catch(() => {});
  };

  const publicUrl = info?.slug ? `https://www.yourcosite.com/s/${info.slug}` : "";

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!live ? (
          <>
            <div className="font-semibold text-[18px] mb-1.5">{t("Publicera sajten")}</div>
            <p className="text-[13.5px] text-ink-dim mb-4">
              {t("Din sajt är inte publicerad än. När du publicerar blir den synlig för alla på en egen adress, och du kan koppla din egen domän.")}
            </p>
            {error && <p className="text-[13px] text-red-700 mb-3">{error}</p>}
            <div className="flex gap-2.5 justify-end">
              <button type="button" onClick={onClose} className="text-[13.5px] font-semibold border border-line rounded-lg px-4 py-2">{t("Stäng")}</button>
              <button type="button" onClick={() => publish(true)} disabled={busy === "publish" || status === "pausad"} className="text-[13.5px] font-semibold bg-accent text-accent-ink rounded-lg px-4 py-2 disabled:opacity-60">
                {busy === "publish" ? t("Publicerar …") : t("Publicera nu")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold text-[18px] mb-3">{t("Din sajt är publicerad")}</div>
            {publicUrl && (
              <div className="mb-5">
                <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-1">{t("Adress")}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold underline break-all">{publicUrl}</a>
                  <button type="button" onClick={() => copy(publicUrl)} className="text-[12.5px] font-semibold border border-line rounded-md px-2.5 py-1">
                    {copied === publicUrl ? t("Kopierad") : t("Kopiera")}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-line pt-4">
              <div className="font-semibold text-[15px] mb-1">{t("Egen domän")}</div>
              {!info?.domain ? (
                <>
                  <p className="text-[13px] text-ink-dim mb-3">
                    {t("Vill du använda din egen adress, till exempel dittforetag.se? Skriv in domänen så visar vi vilka DNS-poster du behöver lägga in hos ditt webbhotell.")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder={t("dittforetag.se")}
                      className="flex-1 min-w-0 px-3 py-2 border border-line rounded-lg text-[14px]"
                    />
                    <button type="button" onClick={connect} disabled={busy === "domain" || !domainInput.trim()} className="text-[13.5px] font-semibold bg-accent text-accent-ink rounded-lg px-4 py-2 disabled:opacity-60 whitespace-nowrap">
                      {busy === "domain" ? t("Kopplar …") : t("Koppla domän")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[14px] font-semibold">{info.domain}</span>
                    <span className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-full ${info.status === "active" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                      {info.status === "active" ? t("Domänen är kopplad och fungerar") : t("Väntar på att domänen ska peka hit")}
                    </span>
                  </div>
                  {info.status !== "active" && (
                    <>
                      <p className="text-[13px] text-ink-dim mb-2">{t("Lägg in dessa DNS-poster hos ditt webbhotell:")}</p>
                      <div className="border border-line rounded-lg overflow-hidden mb-2">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="text-left text-ink-dim bg-bg">
                              <th className="px-3 py-1.5 font-semibold">{t("Typ")}</th>
                              <th className="px-3 py-1.5 font-semibold">{t("Namn")}</th>
                              <th className="px-3 py-1.5 font-semibold">{t("Värde")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {info.records.map((r) => (
                              <tr key={r.type + r.name} className="border-t border-line">
                                <td className="px-3 py-1.5 font-semibold">{r.type}</td>
                                <td className="px-3 py-1.5">{r.name}</td>
                                <td className="px-3 py-1.5">
                                  <button type="button" onClick={() => copy(r.value)} className="font-mono text-left underline decoration-dotted" title={t("Kopiera")}>
                                    {copied === r.value ? t("Kopierad") : r.value}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[12.5px] text-ink-dim mb-3">
                        {t("Ändringen kan ta från några minuter upp till ett dygn. Rör inte dina MX-poster, de styr din e-post.")}
                      </p>
                      {info.manual && <p className="text-[12.5px] text-ink-dim mb-3">{t("Vi aktiverar domänen hos oss inom ett dygn.")}</p>}
                    </>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {info.status !== "active" && (
                      <button type="button" onClick={load} disabled={busy === "check"} className="text-[13px] font-semibold border border-line rounded-lg px-3.5 py-1.5 disabled:opacity-60">
                        {busy === "check" ? t("Kontrollerar …") : t("Kontrollera igen")}
                      </button>
                    )}
                    <Link href={`/guide/egen-doman?domain=${encodeURIComponent(info.domain)}`} target="_blank" className="text-[13px] font-semibold underline">
                      {t("Guide för ditt webbhotell")}
                    </Link>
                    <button type="button" onClick={removeDomain} disabled={busy === "domain"} className="text-[13px] text-ink-dim underline ml-auto">
                      {t("Ta bort domänen")}
                    </button>
                  </div>
                </>
              )}
              {error && <p className="text-[13px] text-red-700 mt-3">{error}</p>}
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
              <button type="button" onClick={() => publish(false)} disabled={busy === "publish"} className="text-[13px] text-ink-dim underline">
                {t("Avpublicera sajten")}
              </button>
              <button type="button" onClick={onClose} className="text-[13.5px] font-semibold border border-line rounded-lg px-4 py-2">{t("Stäng")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
