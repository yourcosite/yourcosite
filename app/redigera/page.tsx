"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SitePreview from "@/components/SitePreview";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";

type ChatMessage = { from: "user" | "bot"; text: string };

type SiteMeta = {
  id: string;
  name: string;
  domain: string | null;
  status: "draft" | "live" | "pausad";
  privacy_policy_mode: "uploaded" | "generated" | null;
  privacy_policy_file_url: string | null;
  privacy_policy_text: string | null;
};

// Chattredigeraren — till skillnad från /webbplats (som bara VISAR sajten,
// i en iframe) renderar den här kundens RIKTIGA SitePreview direkt i
// sidan (ingen iframe), så ett AI-svar kan uppdatera "content"-state och
// förhandsvisningen uppdateras ögonblickligen utan omladdning. Sidbyte i
// menyn sker via onNavigate (se SitePreview/Header) istället för riktiga
// länkar, av samma skäl — annars tappas hela chatt-historiken vid varje
// klick.
export default function EditorPage() {
  const [site, setSite] = useState<SiteMeta | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activePath, setActivePath] = useState("/");
  const [loadError, setLoadError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "Hej! Skriv vad du vill ändra — t.ex. \"byt rubriken på startsidan\" eller \"lägg till en sektion om våra tjänster\". Jag uppdaterar sajten åt dig direkt.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/sites/mine")
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setLoadError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSite(data.site);
        if (isValidSiteContent(data.site.content)) setContent(data.site.content);
        else setLoadError("Sajtens innehåll kunde inte läsas.");
      })
      .catch(() => setLoadError("Kunde inte hämta sajten."));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const history = messages;
    setMessages((m) => [...m, { from: "user", text }]);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/sites/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel.");
      setContent(data.content);
      setMessages((m) => [...m, { from: "bot", text: data.summary || "Klart!" }]);
    } catch (e: any) {
      setMessages((m) => [...m, { from: "bot", text: `Det gick inte: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">{site?.name || "Din sajt"}</div>
            <div className="text-[11.5px] text-ink-dim">
              {site ? (site.status === "live" ? "Live" : "Utkast") : "…"}
              {site?.domain ? ` · ${site.domain}` : " · ingen domän ännu"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <Link href="/sidor" className="text-[12.5px] font-bold text-ink bg-bg border border-line px-3.5 py-2 rounded-full">
            Sidor
          </Link>
          <Link
            href="/webbplats"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13.5px] font-semibold text-ink border border-line px-4 py-2.5 rounded-lg"
          >
            Förhandsgranska
          </Link>
          <button
            type="button"
            disabled
            title="Publicering till en riktig domän byggs i ett senare steg"
            className="text-[13.5px] font-semibold text-ink-dim bg-bg border border-line px-4.5 py-2.5 rounded-lg cursor-not-allowed opacity-70"
          >
            Publicera (kommer snart)
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-[#E5E3DD] flex items-center justify-center p-7 overflow-hidden">
          {loadError && (
            <div className="bg-white rounded-2xl p-10 text-center text-ink-dim text-[14.5px] max-w-[420px]">
              {loadError}{" "}
              <Link href="/onboarding/1" className="font-semibold underline">
                Gå till onboardingen
              </Link>
            </div>
          )}

          {!loadError && !content && (
            <div className="bg-white rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">Hämtar din sajt …</div>
          )}

          {content && (
            <div className="w-full h-full max-w-[1400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
              <div className="h-[38px] bg-[#F1EFE9] flex items-center gap-1.5 px-3.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
                <div className="flex-1 text-center text-[11.5px] text-ink-dim truncate px-2">
                  {site?.name?.toLowerCase().replace(/\s+/g, "")}.yourcosite.com{activePath !== "/" ? activePath : ""}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto relative">
                {sending && (
                  <div className="absolute inset-0 bg-white/40 z-40 flex items-start justify-center pt-10 pointer-events-none">
                    <div className="bg-ink text-white text-[12.5px] font-semibold px-4 py-2 rounded-full shadow-lg">
                      Uppdaterar sajten …
                    </div>
                  </div>
                )}
                <SitePreview
                  content={content}
                  siteName={site?.name}
                  activePath={activePath}
                  onNavigate={setActivePath}
                  privacyPolicyMode={site?.privacy_policy_mode}
                  privacyPolicyFileUrl={site?.privacy_policy_file_url}
                  privacyPolicyText={site?.privacy_policy_text}
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-[400px] border-l border-line bg-surface flex flex-col flex-shrink-0">
          <div className="px-5 py-4 border-b border-line">
            <div className="font-semibold text-[14.5px]">Be om ändringar</div>
            <div className="text-[12px] text-ink-dim mt-0.5">Skriv precis som du skulle till en kollega.</div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4.5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-[13.5px] leading-relaxed px-3.5 py-2.5 ${
                  m.from === "user"
                    ? "self-end bg-accent text-accent-ink rounded-[14px_14px_4px_14px]"
                    : "self-start bg-bg rounded-[14px_14px_14px_4px]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="self-start bg-bg rounded-[14px_14px_14px_4px] text-[13.5px] text-ink-dim px-3.5 py-2.5">
                Tänker …
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-line">
            <div className="flex items-center gap-2.5 bg-bg border border-line rounded-xl py-1.5 pl-4 pr-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Be om en ändring …"
                disabled={sending || !content}
                className="flex-1 text-[13.5px] bg-transparent outline-none text-ink-dim placeholder:text-ink-dim disabled:opacity-60"
              />
              <button
                onClick={send}
                disabled={sending || !content}
                aria-label="Skicka"
                className="w-[34px] h-[34px] rounded-[9px] bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0C1004" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
