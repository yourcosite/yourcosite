"use client";

import { SOCIAL_PLATFORMS, socialPlatformColor } from "@/lib/socialPlatforms";

export type SocialLinksValue = Record<string, string>;

// Alla vanliga plattformar visas direkt som egna fält — ingen "lägg till
// konto"-knapp behövs. Kunden fyller bara i de hon faktiskt har; tomma
// fält sparas inte. Varje rad har en färgad rund badge (igenkänningsfärg,
// inte den riktiga logotypen) så raden är lätt att skumma.
export default function SocialLinksFields({
  value,
  onChange,
}: {
  value: SocialLinksValue;
  onChange: (next: SocialLinksValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {SOCIAL_PLATFORMS.map((p) => (
        <div key={p.id} className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ background: socialPlatformColor(p.id) }}
            aria-hidden="true"
          >
            {p.label[0]}
          </div>
          <label htmlFor={`social-${p.id}`} className="w-[90px] flex-shrink-0 text-[13.5px] font-semibold">
            {p.label}
          </label>
          <input
            id={`social-${p.id}`}
            type="url"
            value={value[p.id] || ""}
            onChange={(e) => onChange({ ...value, [p.id]: e.target.value })}
            placeholder="https://"
            className="flex-1 box-border px-3.5 py-2.5 border border-line rounded-[10px] text-[14.5px]"
          />
        </div>
      ))}
    </div>
  );
}
