// Huvudsidor och undersidor. Hierarkin lagras inte i en egen kolumn utan
// följer sökvägen: "/produkter/stol" är en undersida till "/produkter".
// Det fungerar därmed överallt (onboarding, Sidor-panelen, Millie) utan
// någon databasändring. Bara en nivå stöds, och startsidan "/" kan aldrig
// vara huvudsida.

type PageLike = { path: string; label: string };

function dirName(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "/" : path.slice(0, i);
}

// Sökvägen till sidans huvudsida, eller null om sidan är en huvudsida
// (eller om huvudsidan inte finns).
export function parentPathOf(path: string, pages: PageLike[]): string | null {
  const parent = dirName(path);
  if (parent === "/" || parent === path) return null;
  return pages.some((p) => p.path === parent) ? parent : null;
}

export function topLevelPages<T extends PageLike>(pages: T[]): T[] {
  return pages.filter((p) => parentPathOf(p.path, pages) === null);
}

export function childPagesOf<T extends PageLike>(path: string, pages: T[]): T[] {
  return pages.filter((p) => parentPathOf(p.path, pages) === path);
}

// Sidor sorterade så att varje undersida hamnar direkt efter sin huvudsida.
export function pagesInTreeOrder<T extends PageLike>(pages: T[]): T[] {
  const out: T[] = [];
  for (const p of topLevelPages(pages)) {
    out.push(p, ...childPagesOf(p.path, pages));
  }
  return out;
}

// Flyttar en sida ett steg upp eller ner bland sina syskon (huvudsidor bland
// huvudsidor, undersidor bland samma huvudsidas undersidor). Startsidan "/"
// ligger alltid först och kan inte flyttas. Returnerar null om sidan inte
// kan flyttas åt det hållet.
export function movePage<T extends PageLike>(pages: T[], path: string, dir: "up" | "down"): T[] | null {
  if (path === "/") return null;
  const parent = parentPathOf(path, pages);
  const group = parent ? childPagesOf(parent, pages) : topLevelPages(pages).filter((p) => p.path !== "/");
  const i = group.findIndex((p) => p.path === path);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= group.length) return null;
  const reordered = group.slice();
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];

  if (parent) {
    return topLevelPages(pages).flatMap((t) =>
      t.path === parent ? [t, ...reordered] : [t, ...childPagesOf(t.path, pages)]
    );
  }
  const home = pages.find((p) => p.path === "/");
  const tops = home ? [home, ...reordered] : reordered;
  return tops.flatMap((t) => [t, ...childPagesOf(t.path, pages)]);
}
