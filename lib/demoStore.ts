import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { DemoState } from "./demoSite";

// Demon på /demo kör de riktiga API-rutterna, men mot en liten databas som
// bara finns under ETT anrop: besökarens hela tillstånd skickas med i
// anropet (se app/api/demo/proxy), rutten läser och skriver mot den här
// låtsasklienten, och det nya tillståndet skickas tillbaka. Inget sparas på
// servern och inget rör den riktiga databasen.

export const demoStore = new AsyncLocalStorage<{ state: DemoState; ip: string; userId: string }>();

export function inDemo(): boolean {
  return !!demoStore.getStore();
}

type Row = Record<string, unknown>;
type Result = { data: unknown; error: null | { message: string }; count?: number | null };

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return (a as string | number) < (b as string | number) ? -1 : 1;
}

class Query implements PromiseLike<Result> {
  private rows: Row[];
  private filters: ((r: Row) => boolean)[] = [];
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private orderBy: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private from: number | null = null;
  private to: number | null = null;
  private wantsRows = false;
  private head = false;
  private count = false;
  private one: "single" | "maybe" | null = null;

  constructor(private table: string, private tables: Record<string, Row[]>) {
    if (!tables[table]) tables[table] = [];
    this.rows = tables[table];
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    this.wantsRows = true;
    if (opts?.head) this.head = true;
    if (opts?.count) this.count = true;
    return this;
  }
  insert(p: Row | Row[]) { this.mode = "insert"; this.payload = p; return this; }
  update(p: Row) { this.mode = "update"; this.payload = p; return this; }
  upsert(p: Row | Row[]) { return this.insert(p); }
  delete() { this.mode = "delete"; return this; }

  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, v: unknown[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  not(c: string, op: string, v: unknown) {
    if (op === "is") this.filters.push((r) => (v === null ? r[c] != null : r[c] !== v));
    else if (op === "eq") this.filters.push((r) => r[c] !== v);
    return this;
  }
  gt(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) > 0); return this; }
  gte(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) >= 0); return this; }
  lt(c: string, v: unknown) { this.filters.push((r) => r[c] != null && cmp(r[c], v) < 0); return this; }
  lte(c: string, v: unknown) { this.filters.push((r) => r[c] != null && cmp(r[c], v) <= 0); return this; }
  match(o: Row) { for (const k of Object.keys(o)) this.eq(k, o[k]); return this; }
  or() { return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orderBy.push({ col: c, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from = a; this.to = b; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private run(): Result {
    const matches = () => this.rows.filter((r) => this.filters.every((f) => f(r)));
    let out: Row[] = [];
    if (this.mode === "insert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const now = new Date().toISOString();
      for (const p of list) {
        const row = { id: randomUUID(), created_at: now, updated_at: now, ...p };
        this.rows.push(row);
        out.push(row);
      }
    } else if (this.mode === "update") {
      out = matches();
      const now = new Date().toISOString();
      for (const r of out) Object.assign(r, this.payload, { updated_at: now });
    } else if (this.mode === "delete") {
      out = matches();
      this.tables[this.table] = this.rows.filter((r) => !out.includes(r));
      this.rows = this.tables[this.table];
    } else {
      out = matches();
    }
    for (const o of [...this.orderBy].reverse()) out = [...out].sort((a, b) => (o.asc ? 1 : -1) * cmp(a[o.col], b[o.col]));
    const total = out.length;
    if (this.from != null && this.to != null) out = out.slice(this.from, this.to + 1);
    if (this.lim != null) out = out.slice(0, this.lim);
    const copy = out.map((r) => JSON.parse(JSON.stringify(r)) as Row);
    const count = this.count ? total : null;
    if (this.head) return { data: null, error: null, count };
    if (this.mode !== "select" && !this.wantsRows) return { data: null, error: null, count };
    if (this.one === "single") {
      return copy.length ? { data: copy[0], error: null, count } : { data: null, error: { message: "Ingen rad hittades." }, count };
    }
    if (this.one === "maybe") return { data: copy[0] ?? null, error: null, count };
    return { data: copy, error: null, count };
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

export function createDemoClient() {
  const store = demoStore.getStore()!;
  const tables = store.state.tables;
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: store.userId, email: "demo@yourcosite.com", app_metadata: {}, user_metadata: {} } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: (table: string) => new Query(table, tables),
    rpc: async () => ({ data: null, error: null }),
    storage: {
      from: () => {
        const off = async () => ({ data: null, error: { message: "Uppladdning är avstängd i demon." } });
        return { upload: off, remove: off, list: async () => ({ data: [], error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) };
      },
    },
  };
}
