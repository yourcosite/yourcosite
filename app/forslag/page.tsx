"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SitePreview from "@/components/SitePreview";
import type { SiteContent } from "@/lib/contentModel";

export default function SuggestionsPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sites/mine")
      .then((r) => r.json())
      .then((data) => {
        if (!data.site) {
          setError("Hittade ingen genererad sajt ännu.");
          return;
        }
        setSiteName(data.site.name);
        setContent(data.site.content);
      })
      .catch(() => setError("Kunde inte hämta sajten."));
  }, []);

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface">
        <Logo light={false} />
        <Link href="/dashboard" className="text-[14px] text-ink-dim font-medium">
          Avbryt
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-10 md:py-11">
        <div className="w-full max-w-[860px]">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-medium mb-2.5">
              Här är {siteName ? `${siteName}s` : "din"} nya sajt
            </h1>
            <p className="text-[15.5px] text-ink-dim max-w-[560px] mx-auto">
              Ett första utkast, skrivet utifrån det du berättade i
              onboardingen. Du kan ändra precis allt i nästa steg.
            </p>
          </div>

          {error && (
            <div className="bg-surface border border-line rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">
              {error}{" "}
              <Link href="/bygger" className="font-semibold underline">
                Försök bygga sajten igen
              </Link>
            </div>
          )}

          {!error && !content && (
            <div className="bg-surface border border-line rounded-2xl p-10 text-center text-ink-dim text-[14.5px]">
              Hämtar din sajt …
            </div>
          )}

          {content && (
            <div className="bg-surface border-[1.5px] border-line rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
              <div className="h-[38px] bg-[#F1EFE9] flex items-center gap-1.5 px-3.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
                <div className="flex-1 text-center text-[11.5px] text-ink-dim">
                  {siteName || "din-sajt"}.yourcosite.com
                </div>
              </div>
              <div className="bg-white max-h-[70vh] overflow-y-auto">
                <SitePreview content={content} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 mt-7">
            <Link href="/bygger" className="text-[13.5px] text-ink-dim font-semibold">
              ← Be YourCoSite skriva om alltihop
            </Link>
            {content && (
              <Link
                href="/redigera"
                className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px]"
              >
                Fortsätt till redigering →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
