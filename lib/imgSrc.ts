// Skickar kundens stora bilder genom Vercels bildtjänst (/_next/image) så att
// mobiler får en mindre version. Gäller bara bilder i vår egen Supabase-lagring
// (jpg, png, webp). Allt annat (gif, svg, andra adresser) visas som förut.
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname; } catch { return ""; }
})();

export function imgProps(url: string | null | undefined, sizes = "100vw"): { src?: string; srcSet?: string; sizes?: string } {
  if (!url || !SUPABASE_HOST) return {};
  try {
    const u = new URL(url);
    if (u.hostname !== SUPABASE_HOST || !u.pathname.includes("/storage/v1/object/public/")) return {};
    if (!/\.(jpe?g|png|webp)$/i.test(u.pathname)) return {};
  } catch {
    return {};
  }
  const enc = encodeURIComponent(url);
  const at = (w: number) => `/_next/image?url=${enc}&w=${w}&q=75`;
  return { src: at(1080), srcSet: `${at(640)} 640w, ${at(1080)} 1080w, ${at(1920)} 1920w`, sizes };
}
