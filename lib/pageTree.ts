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

// Byter nivå på en befintlig sida: gör den till undersida under newParent,
// eller tillbaka till huvudsida (newParent = null). Sidans adress ändras
// (undersidor har huvudsidans adress som prefix) och alla länkar på sajten
// som pekade på den gamla adressen skrivs om. Returnerar ett felmeddelande
// på svenska om flytten inte är tillåten.
export function reparentPage<T extends PageLike & { sections: any[] }>(
  pages: T[],
  path: string,
  newParent: string | null
): { pages: T[]; newPath: string } | { error: string } {
  if (path === "/") return { error: "Startsidan går inte att flytta." };
  const page = pages.find((p) => p.path === path);
  if (!page) return { error: "Hittade ingen sida med den sökvägen." };
  if (childPagesOf(path, pages).length > 0) {
    return { error: "Sidan har egna undersidor. Flytta först ut dem, eftersom det bara finns en nivå av undersidor." };
  }
  const currentParent = parentPathOf(path, pages);
  if ((newParent ?? null) === currentParent) return { error: "Sidan ligger redan där." };
  if (newParent !== null) {
    if (newParent === "/" || newParent === path) return { error: "Den sidan kan inte vara huvudsida." };
    if (!pages.some((p) => p.path === newParent)) return { error: "Hittade ingen sådan huvudsida." };
    if (parentPathOf(newParent, pages)) return { error: "En undersida kan inte ha egna undersidor." };
  }

  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  const base = `${newParent ?? ""}/${lastSegment}`;
  const taken = new Set(pages.filter((p) => p.path !== path).map((p) => p.path));
  let newPath = base;
  for (let n = 2; taken.has(newPath); n++) newPath = `${base}-${n}`;

  const rewrite = (value: any): any => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = (k === "ctaLink" || k === "link") && v === path ? newPath : rewrite(v);
      }
      return out;
    }
    return value;
  };

  const moved = { ...page, path: newPath } as T;
  const rest = pages.filter((p) => p.path !== path).map((p) => ({ ...p, sections: rewrite(p.sections) }) as T);
  moved.sections = rewrite(page.sections);

  // Placering: som sista undersida under nya huvudsidan, eller sist bland
  // huvudsidorna.
  let insertAt = rest.length;
  if (newParent !== null) {
    insertAt =
      Math.max(
        rest.findIndex((p) => p.path === newParent),
        ...rest.map((p, i) => (parentPathOf(p.path, rest) === newParent ? i : -1))
      ) + 1;
  }
  const result = [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
  // Säkerställ trädordning (undersidor direkt efter sin huvudsida).
  return { pages: newParent === null ? pagesInTreeOrder(result) : result, newPath };
}
