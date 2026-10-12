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
