"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";
import { SOCIAL_PLATFORMS } from "@/lib/socialPlatforms";

type SocialRow = { platform: string; url: string };

export default function OnboardingStep2() {
  const router = useRouter();
  const [u1, setU1] = useState("");
  const [u2, setU2] = useState("");
  const [u3, setU3] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialRow[]>([{ platform: "instagram", url: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        const links: string[] = data.site?.inspiration_links || [];
        setU1(links[0] || "");
        setU2(links[1] || "");
        setU3(links[2] || "");
        const existingSocial: SocialRow[] = data.site?.social_links || [];
        if (existingSocial.length > 0) setSocialLinks(existingSocial);
      })
      .catch(() => {});
  }, []);

  const updateSocialRow = (i: number, field: "platform" | "url", value: string) =>
    setSocialLinks((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const addSocialRow = () =>
    setSocialLinks((rows) => [...rows, { platform: "facebook", url: "" }]);
  const removeSocialRow = (i: number) =>
    setSocialLinks((rows) => rows.filter((_, idx) => idx !== i));

  const next = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: [u1, u2, u3],
          socialLinks: socialLinks.filter((s) => s.url.trim() !== ""),
        }),
      });
      router.push("/onboarding/3");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={2} stepLabel="INSPIRATION">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">Vad gillar du?</h1>
        <p className="text-[15.5px] text-ink-dim mb-7">
          Klistra in sajter vars känsla eller stil du gillar. Vi tittar på
          ton, struktur och stämning — aldrig text eller bilder rakt av.
          Helt valfritt.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <div>
            <label htmlFor="u1" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 1
            </label>
            <input
              id="u1"
              type="url"
              value={u1}
              onChange={(e) => setU1(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u2" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 2 (valfritt)
            </label>
            <input
              id="u2"
              type="url"
              value={u2}
              onChange={(e) => setU2(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u3" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 3 (valfritt)
            </label>
            <input
              id="u3"
              type="url"
              value={u3}
              onChange={(e) => setU3(e.target.value)}
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>

          <div className="flex items-start gap-2.5 bg-accent-soft rounded-xl px-4 py-3.5 mt-2">
            <span className="text-[13.5px] text-ink leading-relaxed">
              Har du ingen favorit? Hoppa över det här steget.
            </span>
          </div>

          <div className="h-px bg-line my-2" />

          <div>
            <h2 className="text-[20px] font-medium mb-1.5">Sociala medier</h2>
            <p className="text-[14px] text-ink-dim mb-4">
              Lägg till dina konton — vi länkar dit från sidfoten och
              kontaktsidan. Helt valfritt.
            </p>

            <div className="flex flex-col gap-2.5 mb-3">
              {socialLinks.map((row, i) => (
                <div key={i} className="flex gap-2.5 items-center">
                  <select
                    value={row.platform}
                    onChange={(e) => updateSocialRow(i, "platform", e.target.value)}
                    className="box-border px-2.5 py-3 border border-line rounded-[10px] text-[14px] bg-surface w-[150px] flex-shrink-0"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={row.url}
                    onChange={(e) => updateSocialRow(i, "url", e.target.value)}
                    placeholder="https://"
                    className="flex-1 box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialRow(i)}
                    aria-label="Ta bort rad"
                    className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-ink-dim"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {socialLinks.length < 8 && (
              <button
                type="button"
                onClick={addSocialRow}
                className="flex items-center gap-2 text-ink font-semibold text-[13.5px] py-1.5 mb-2"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Lägg till ett till konto
              </button>
            )}
          </div>

          <div className="flex justify-between mt-4">
            <Link
              href="/onboarding/1"
              className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5"
            >
              ← Tillbaka
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px] disabled:opacity-60"
            >
              {saving ? "Sparar …" : "Nästa →"}
            </button>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
