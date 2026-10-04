"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import type { SiteContent } from "@/lib/contentModel";

type Site = { id: string; name?: string; content: SiteContent };

export default function PagesManagePage() {
  const [site, setSite] = useState<Site | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pendingRemovePath, setPendingRemovePath] = useState<string | null>(null);
  const [justRemoved, setJustRemoved] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // "Lägg till ny sida"-flödet — till skillnad från tidigare (som bara
  // skapade "Ny sida 1", "Ny sida 2" osv. lokalt i webbläsaren utan att
  // spara något alls) ber vi nu kunden om ett riktigt namn direkt, och
  // sparar sidan på den faktiska sajten med samma.
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState<{ label: string; path: string } | null>(null);

  // Samma sajt-id som redigeraren skickade med hit (se
  // app/redigera/page.tsx/DashboardClient.tsx) — annars faller den här
  // panelen tillbaka på "senaste sajten", vilket på ett konto med flera
  // sajter kunde peka på en ANNAN sajt än den kunden faktiskt kom ifrån.
  const [siteIdParam, setSiteIdParam] = useState("");

  useEffect(() => {
    let requestedSiteId = "";
    try {
      requestedSiteId = new URLSearchParams(window.location.search).get("site") || "";
    } catch {
      // Ignorera — faller tillbaka på "senaste sajten" som innan.
    }
    setSiteIdParam(requestedSiteId);

    fetch(`/api/sites/mine${requestedSiteId ? `?id=${encodeURIComponent(requestedSiteId)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setLoadError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSite(data.site);
      })
      .catch(() => setLoadError("Kunde inte hämta sajten."));
  }, []);

  const redigeraHref = (extra?: string) => {
    const params = new URLSearchParams();
    if (siteIdParam) params.set("site", siteIdParam);
    if (extra) params.set("sida", extra);
    const qs = params.toString();
    return `/redigera${qs ? `?${qs}` : ""}`;
  };

  const pages = site?.content.pages || [];

  const startAdd = () => {
    setAdding(true);
    setNewLabel("");
    setAddError("");
  };

  const confirmAdd = async () => {
    const label = newLabel.trim();
    if (!label) {
      setAddError("Skriv ett namn för sidan.");
      return;
    }
    if (!site) return;
    setSaving(true);
    setAddError("");
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Kunde inte skapa sidan.");
        return;
      }
      setSite({ ...site, content: data.content });
      setAdding(false);
      setJustAdded({ label, path: data.newPath });
      setJustRemoved(null);
    } catch {
      setAddError("Kunde inte skapa sidan just nu.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async (path: string) => {
    if (!site) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Kunde inte ta bort sidan.");
        return;
      }
      const removedLabel = pages.find((p) => p.path === path)?.label || path;
      setSite({ ...site, content: data.content });
      setPendingRemovePath(null);
      setJustRemoved(removedLabel);
      setJustAdded(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">{site?.name || "Din sajt"}</div>
          </div>
        </div>
        <Link
          href={redigeraHref()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
        >
          ← Till redigeraren
        </Link>
      </div>

      <div className="flex-1 px-6 md:px-12 py-8 flex justify-center">
        <div className="w-full max-w-[680px]">
          <h1 className="text-[27px] font-medium mb-1.5">Sidor</h1>
          <p className="text-[13.5px] text-ink-dim mb-5.5">
            Hantera sidorna på er live-sajt. En borttagen sida slutar genast
            visas för besökare. En ny sida skapas tom — berätta för Millie i
            redigeraren vad den ska innehålla.
          </p>

          {loadError && (
            <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">
              {loadError}
            </div>
          )}

          {!loadError && !site && (
            <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">
              Hämtar din sajt …
            </div>
          )}

          {site && (
            <>
              <div className="flex flex-col gap-2.5 mb-4.5">
                {pages.map((p) => {
                  const locked = p.path === "/";
                  const confirming = pendingRemovePath === p.path;
                  const empty = p.sections.length === 0;
                  return (
                    <div key={p.path} className="border border-line rounded-xl px-4 py-3.5 bg-surface">
                      <div className="flex items-center gap-3">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <rect x="4" y="3" width="16" height="18" rx="2" />
                          <line x1="8" y1="8" x2="16" y2="8" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-[14.5px]">{p.label}</div>
                          <div className="text-[12px] text-ink-dim mt-0.5">
                            {p.path} · {empty ? "Inget innehåll än" : `${p.sections.length} ${p.sections.length === 1 ? "sektion" : "sektioner"}`}
                          </div>
                        </div>
                        {locked && (
                          <span className="text-[11px] text-ink-dim font-semibold">Krävs av sajten</span>
                        )}
                        {!locked && !confirming && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Link
                              href={redigeraHref(p.path)}
                              className="text-[12.5px] font-semibold text-ink-dim px-3 py-1.5 border border-line rounded-lg"
                            >
                              Öppna
                            </Link>
                            <button
                              onClick={() => setPendingRemovePath(p.path)}
                              aria-label={`Ta bort ${p.label}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-dim flex-shrink-0"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {confirming && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setPendingRemovePath(null)}
                              className="text-[12.5px] font-semibold text-ink-dim px-3 py-1.5 border border-line rounded-lg"
                            >
                              Avbryt
                            </button>
                            <button
                              onClick={() => confirmRemove(p.path)}
                              disabled={removing}
                              className="text-[12.5px] font-bold text-white bg-warm px-3 py-1.5 rounded-lg disabled:opacity-60"
                            >
                              {removing ? "Tar bort …" : "Ta bort permanent"}
                            </button>
                          </div>
                        )}
                      </div>
                      {confirming && (
                        <div className="mt-2.5 pt-2.5 border-t border-line text-[12.5px] text-warm font-semibold">
                          Detta tar bort sidan permanent från den publicerade sajten. Går inte att ångra.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {justRemoved && (
                <div className="flex items-center gap-2.5 bg-accent-soft rounded-lg px-4 py-3 mb-4.5 text-[13px] text-ink font-semibold">
                  &ldquo;{justRemoved}&rdquo; har tagits bort och syns inte längre på sajten.
                </div>
              )}

              {justAdded && (
                <div className="flex items-center justify-between gap-3 bg-accent-soft rounded-lg px-4 py-3 mb-4.5 text-[13px] text-ink font-semibold">
                  <span>&ldquo;{justAdded.label}&rdquo; är skapad och ligger redan i menyn.</span>
                  <Link
                    href={redigeraHref(justAdded.path)}
                    className="whitespace-nowrap underline"
                  >
                    Öppna i redigeraren →
                  </Link>
                </div>
              )}

              {!adding ? (
                <button onClick={startAdd} className="flex items-center gap-2 text-ink font-semibold text-[13.5px] py-1.5">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Lägg till ny sida
                </button>
              ) : (
                <div className="border border-line rounded-xl px-4 py-3.5 bg-surface">
                  <div className="text-[12.5px] font-semibold text-ink-dim mb-2">Namn på den nya sidan</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      autoFocus
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
                      placeholder="t.ex. Vårt team"
                      className="flex-1 min-w-[160px] border border-line rounded-lg px-3 py-2 text-[13.5px]"
                    />
                    <button
                      onClick={confirmAdd}
                      disabled={saving}
                      className="text-[12.5px] font-bold text-accent-ink bg-accent px-4 py-2 rounded-lg disabled:opacity-60"
                    >
                      {saving ? "Skapar …" : "Skapa"}
                    </button>
                    <button
                      onClick={() => setAdding(false)}
                      className="text-[12.5px] font-semibold text-ink-dim px-3 py-2 border border-line rounded-lg"
                    >
                      Avbryt
                    </button>
                  </div>
                  {addError && <div className="text-[12px] text-warm font-semibold mt-2">{addError}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
