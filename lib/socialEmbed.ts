// Gör om det kunden (eller Millie) klistrat in — en Facebook-länk, en
// Instagram-postlänk eller inbäddningskoden från en flödestjänst — till en
// SNÄV, förutbestämd beskrivning av vad som får visas. Renderingen använder
// ALDRIG den råa texten: bara id:n som klarat reglerna här stoppas in i
// kända adresser (samma princip som lib/youtube.ts). Därför kan ingen
// lägga in egen kod eller en godtycklig iframe via den här vägen.

export type SocialEmbed =
  | { kind: "facebook"; pageUrl: string }
  | { kind: "instagramPosts"; codes: string[] }
  | { kind: "behold"; feedId: string }
  | { kind: "elfsight"; appId: string }
  | { kind: "snapwidget"; widgetId: string }
  | { kind: "instagramProfile"; username: string };

export function parseSocialEmbed(source: string | undefined): SocialEmbed | null {
  if (!source) return null;
  const s = source.slice(0, 4000);

  // Behold: <behold-widget feed-id="…"> eller w.behold.so
  if (/behold/i.test(s)) {
    const m = s.match(/feed-id\s*=\s*["']?([A-Za-z0-9]{8,40})/i);
    if (m) return { kind: "behold", feedId: m[1] };
  }
  // Elfsight: class="elfsight-app-<uuid>"
  const elf = s.match(/elfsight-app-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (elf) return { kind: "elfsight", appId: elf[1].toLowerCase() };
  // SnapWidget: snapwidget.com/embed/<siffror>
  const snap = s.match(/snapwidget\.com\/embed\/(\d{4,12})/i);
  if (snap) return { kind: "snapwidget", widgetId: snap[1] };

  // Enskilda Instagram-inlägg (högst 6)
  const codes: string[] = [];
  const re = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,20})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && codes.length < 6) {
    if (!codes.includes(m[1])) codes.push(m[1]);
  }
  if (codes.length) return { kind: "instagramPosts", codes };

  // Facebook-sida utan eget namn: profile.php?id=<siffror>
  const fbId = s.match(/https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com)\/profile\.php\?(?:[^"'\s]*&)?id=(\d{5,20})/i);
  if (fbId) return { kind: "facebook", pageUrl: `https://www.facebook.com/profile.php?id=${fbId[1]}` };

  // Facebook-sida
  const fb = s.match(/https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com)\/([A-Za-z0-9._\-]+(?:\/[A-Za-z0-9._\-]+)?)/i);
  if (fb) {
    const first = fb[1].split("/")[0].toLowerCase();
    const blocked = ["plugins", "sharer", "sharer.php", "login", "dialog", "tr", "photo", "photo.php", "watch", "groups", "events", "share"];
    if (!blocked.includes(first)) return { kind: "facebook", pageUrl: `https://www.facebook.com/${fb[1]}` };
  }

  // Bara en Instagram-profil: går inte att visa som flöde utan flödestjänst.
  const ig = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?|\s|"|'|$)/i);
  if (ig && !["p", "reel", "reels", "tv", "explore", "accounts"].includes(ig[1].toLowerCase())) {
    return { kind: "instagramProfile", username: ig[1] };
  }
  return null;
}
