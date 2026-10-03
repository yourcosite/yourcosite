// Enkla, igenkännbara ikon-glyfer för varje socialt medie-plattform. Inga
// varumärkesskyddade logotyp-filer används — det här är samma typ av
// generiska "brand icon"-glyfer som t.ex. Font Awesome erbjuder, bara
// ritade själva som SVG-paths. fill="currentColor" så färgen styrs av CSS.
import type { SocialPlatformId } from "./socialPlatforms";

function FacebookGlyph() {
  return (
    <path d="M14.5 8.5h2V5.7c-.34-.05-1.52-.15-2.9-.15-2.93 0-4.6 1.73-4.6 4.73v2.22H6.5v3.2H9v7.3h3.3v-7.3h2.78l.42-3.2H12.3v-1.9c0-1.08.33-1.57 2.2-1.57z" />
  );
}
function InstagramGlyph() {
  return (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.85" cy="7.15" r="1.05" />
    </>
  );
}
function LinkedinGlyph() {
  return (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.7" y="10" width="2.1" height="7.3" />
      <circle cx="7.75" cy="7" r="1.25" />
      <path d="M11.3 10h2.1v1.05c.5-.73 1.25-1.25 2.4-1.25 2 0 3 1.3 3 3.75V17.3h-2.1v-3.4c0-1.15-.4-1.9-1.5-1.9-.9 0-1.5.6-1.75 1.2-.1.23-.15.52-.15.85V17.3h-2.1z" />
    </>
  );
}
function TiktokGlyph() {
  return (
    <path d="M14.3 3.2c.4 2 1.75 3.3 3.95 3.5v2.65c-1.35.05-2.55-.35-3.9-1.15v6.05c0 3.1-2.25 5.25-5.1 5.25-2.1 0-3.9-1.25-4.7-3.05-.3-.65-.45-1.35-.45-2.1 0-2.75 2.1-5.05 4.95-5.2.4-.02.8 0 1.2.07v2.75c-.35-.1-.72-.16-1.1-.14-1.35.08-2.4 1.15-2.4 2.5 0 .35.07.68.2.98.4.9 1.3 1.5 2.3 1.5 1.5 0 2.55-1.15 2.55-2.9V3.2z" />
  );
}
function YoutubeGlyph() {
  return (
    <>
      <rect x="2.8" y="6" width="18.4" height="12" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.3 9.3l5 2.7-5 2.7z" />
    </>
  );
}
function XGlyph() {
  return (
    <path d="M5 4.5l6 7.3-6.3 7.7h1.8l5.4-6.6 5 6.6H21l-6.3-7.6L21 4.5h-1.8l-5 6.1-4.5-6.1z" />
  );
}
function PinterestGlyph() {
  return (
    <path d="M12 3.2C7.4 3.2 4.6 6.35 4.6 9.95c0 2.15.95 4 2.75 4.65.2.08.4 0 .45-.22l.3-1.15c.05-.18.03-.32-.1-.5-.3-.4-.5-1-.5-1.75 0-2.3 1.6-4.25 4.15-4.25 2.25 0 3.5 1.45 3.5 3.4 0 2.6-1.1 4.65-2.7 4.65-.9 0-1.55-.78-1.35-1.72.25-1.15.75-2.4.75-3.25 0-.75-.38-1.38-1.2-1.38-.95 0-1.72 1-1.72 2.35 0 .6.2 1.02.2 1.02s-.68 2.9-.8 3.42c-.25 1.02-.02 2.28-.02 2.28s0 .03.02.1c.03.1.08.18.16.25l.12.1c.1.07.22.03.3-.07.15-.18.42-.55.6-.9.1-.2.4-1.55.4-1.55.3.58 1.2 1.08 2.15 1.08 2.83 0 4.9-2.6 4.9-5.95.02-3.2-2.6-5.6-5.9-5.6z" />
  );
}

const GLYPHS: Record<SocialPlatformId, () => JSX.Element> = {
  facebook: FacebookGlyph,
  instagram: InstagramGlyph,
  linkedin: LinkedinGlyph,
  tiktok: TiktokGlyph,
  youtube: YoutubeGlyph,
  x: XGlyph,
  pinterest: PinterestGlyph,
};

export function SocialGlyph({ id, size = 18 }: { id: string; size?: number }) {
  const Glyph = GLYPHS[id as SocialPlatformId];
  if (!Glyph) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <Glyph />
    </svg>
  );
}
