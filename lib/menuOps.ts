import type { TFunction } from "./i18n/config";
import { MAX_MENU_CATEGORIES, MAX_MENU_ITEMS, MENU_TAGS, type MenuCategory, type MenuItem, type SiteContent } from "./contentModel";

export type MenuOp = {
  action: "addItem" | "updateItem" | "removeItem" | "addCategory" | "renameCategory" | "removeCategory" | "moveCategory" | "setMenu";
  sectionId?: string;
  category?: string;
  item?: string;
  newName?: string;
  description?: string;
  price?: string;
  tags?: string[];
  // Placering (1 = först). Utelämnad = sist.
  position?: number;
  categories?: { name: string; description?: string; items?: Partial<MenuItem>[] }[];
};

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function cleanTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = Array.from(new Set(raw.map((t) => String(t).trim().toLowerCase()).filter((t) => (MENU_TAGS as readonly string[]).includes(t))));
  return out;
}

export function cleanItem(raw: Partial<MenuItem> | undefined): MenuItem | null {
  const name = clip(raw?.name, 120);
  if (!name) return null;
  const item: MenuItem = { name };
  const description = clip(raw?.description, 400);
  if (description) item.description = description;
  const price = clip(raw?.price, 40);
  if (price) item.price = price;
  const tags = cleanTags(raw?.tags);
  if (tags && tags.length) item.tags = tags;
  return item;
}

export function cleanCategories(raw: MenuOp["categories"]): MenuCategory[] {
  const out: MenuCategory[] = [];
  for (const c of (raw || []).slice(0, MAX_MENU_CATEGORIES)) {
    const name = clip(c?.name, 80);
    if (!name) continue;
    const cat: MenuCategory = { name, items: [] };
    const description = clip(c?.description, 300);
    if (description) cat.description = description;
    for (const it of (c.items || []).slice(0, MAX_MENU_ITEMS)) {
      const clean = cleanItem(it);
      if (clean) cat.items.push(clean);
    }
    out.push(cat);
  }
  return out;
}

function place<T>(arr: T[], value: T, position?: number) {
  const idx = Number.isInteger(position) ? Math.min(Math.max((position as number) - 1, 0), arr.length) : arr.length;
  arr.splice(idx, 0, value);
}

// Utför Millies menyändringar på den sparade sajten. Fel läggs i errors (visas
// för kunden) och stoppar aldrig övriga ändringar.
export function applyMenuOps(content: SiteContent, ops: MenuOp[], currentPath: string | undefined, errors: string[], t: TFunction) {
  const all: { page: string; section: any }[] = [];
  for (const pg of content.pages) for (const sec of pg.sections as any[]) if (sec.type === "menu") all.push({ page: pg.path, section: sec });

  for (const op of ops.slice(0, 40)) {
    if (!op || typeof op.action !== "string") continue;
    let target = op.sectionId ? all.find((m) => m.section.id === op.sectionId) : undefined;
    if (!target) {
      const onPage = all.filter((m) => m.page === currentPath);
      target = onPage[0] ?? (all.length === 1 ? all[0] : all[0]);
    }
    if (!target) { errors.push(t("Hittade ingen menysektion att ändra.")); continue; }
    const sec = target.section;
    if (!Array.isArray(sec.categories)) sec.categories = [];
    const cats: MenuCategory[] = sec.categories;
    const findCat = (name?: string) => (name ? cats.find((c) => same(c.name, name)) : undefined);

    switch (op.action) {
      case "setMenu": {
        const next = cleanCategories(op.categories);
        if (next.length === 0) { errors.push(t("Menyn som skulle läggas in var tom.")); break; }
        sec.categories = next;
        break;
      }
      case "addCategory": {
        const name = clip(op.category ?? op.newName, 80);
        if (!name) break;
        if (findCat(name)) { errors.push(t("Kategorin “{name}” finns redan.", { name })); break; }
        if (cats.length >= MAX_MENU_CATEGORIES) { errors.push(t("Menyn har redan så många kategorier som ryms.")); break; }
        const cat: MenuCategory = { name, items: [] };
        const d = clip(op.description, 300);
        if (d) cat.description = d;
        place(cats, cat, op.position);
        break;
      }
      case "renameCategory": {
        const cat = findCat(op.category);
        const name = clip(op.newName, 80);
        if (!cat || !name) { errors.push(t("Hittade inte kategorin “{name}”.", { name: op.category ?? "" })); break; }
        cat.name = name;
        if (op.description !== undefined) {
          const d = clip(op.description, 300);
          if (d) cat.description = d; else delete cat.description;
        }
        break;
      }
      case "removeCategory": {
        const i = cats.findIndex((c) => same(c.name, op.category ?? ""));
        if (i < 0) { errors.push(t("Hittade inte kategorin “{name}”.", { name: op.category ?? "" })); break; }
        cats.splice(i, 1);
        break;
      }
      case "moveCategory": {
        const i = cats.findIndex((c) => same(c.name, op.category ?? ""));
        if (i < 0) { errors.push(t("Hittade inte kategorin “{name}”.", { name: op.category ?? "" })); break; }
        const [c] = cats.splice(i, 1);
        place(cats, c, op.position);
        break;
      }
      case "addItem": {
        let cat = findCat(op.category);
        if (!cat) {
          const name = clip(op.category, 80);
          if (!name) { errors.push(t("Rätten saknar kategori.")); break; }
          if (cats.length >= MAX_MENU_CATEGORIES) { errors.push(t("Menyn har redan så många kategorier som ryms.")); break; }
          cat = { name, items: [] };
          cats.push(cat);
        }
        const item = cleanItem({ name: op.item ?? op.newName, description: op.description, price: op.price, tags: op.tags });
        if (!item) { errors.push(t("En rätt saknade namn.")); break; }
        if (cat.items.length >= MAX_MENU_ITEMS) { errors.push(t("Kategorin “{name}” har redan så många rätter som ryms.", { name: cat.name })); break; }
        place(cat.items, item, op.position);
        break;
      }
      case "updateItem":
      case "removeItem": {
        // Rätten kan ligga i vilken kategori som helst om kategorin inte angetts.
        const searchCats = op.category ? [findCat(op.category)].filter(Boolean) as MenuCategory[] : cats;
        let found: { cat: MenuCategory; i: number } | null = null;
        for (const c of searchCats) {
          const i = c.items.findIndex((it) => same(it.name, op.item ?? ""));
          if (i >= 0) { found = { cat: c, i }; break; }
        }
        if (!found) { errors.push(t("Hittade inte rätten “{name}”.", { name: op.item ?? "" })); break; }
        if (op.action === "removeItem") { found.cat.items.splice(found.i, 1); break; }
        const it = found.cat.items[found.i];
        if (op.newName !== undefined) { const n = clip(op.newName, 120); if (n) it.name = n; }
        if (op.description !== undefined) { const d = clip(op.description, 400); if (d) it.description = d; else delete it.description; }
        if (op.price !== undefined) { const pr = clip(op.price, 40); if (pr) it.price = pr; else delete it.price; }
        if (op.tags !== undefined) { const tg = cleanTags(op.tags); if (tg && tg.length) it.tags = tg; else delete it.tags; }
        if (op.position !== undefined) {
          const [moved] = found.cat.items.splice(found.i, 1);
          place(found.cat.items, moved, op.position);
        }
        break;
      }
    }
  }
}
