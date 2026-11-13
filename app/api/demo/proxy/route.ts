import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { clientIp, rateLimited } from "@/lib/rateLimit";
import { demoStore } from "@/lib/demoStore";
import { buildDemoState, type DemoState } from "@/lib/demoSite";

// Kör de riktiga redigerar-rutterna för demon på /demo, mot en låtsasdatabas
// som bara lever under anropet (lib/demoStore.ts). Webbläsaren skickar med
// hela demosajtens tillstånd och får tillbaka det nya; inget sparas här och
// ingen inloggning behövs. Bara rutterna i listan nedan släpps igenom, och
// de som anropar AI har en egen, strängare spärr per besökare och per dygn.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
type Loader = () => Promise<Record<string, unknown>>;

const SIMPLE: Record<string, Loader> = {
  "/api/sites/mine": () => import("@/app/api/sites/mine/route"),
  "/api/sites/chat": () => import("@/app/api/sites/chat/route"),
  "/api/sites/edit": () => import("@/app/api/sites/edit/route"),
  "/api/sites/edit-text": () => import("@/app/api/sites/edit-text/route"),
  "/api/sites/edit-theme": () => import("@/app/api/sites/edit-theme/route"),
  "/api/sites/edit-layout": () => import("@/app/api/sites/edit-layout/route"),
  "/api/sites/edit-menu": () => import("@/app/api/sites/edit-menu/route"),
  "/api/sites/edit-team": () => import("@/app/api/sites/edit-team/route"),
  "/api/sites/edit-gallery": () => import("@/app/api/sites/edit-gallery/route"),
  "/api/sites/edit-icon": () => import("@/app/api/sites/edit-icon/route"),
  "/api/sites/edit-button-style": () => import("@/app/api/sites/edit-button-style/route"),
  "/api/sites/edit-fixtures": () => import("@/app/api/sites/edit-fixtures/route"),
  "/api/sites/parse-fixtures": () => import("@/app/api/sites/parse-fixtures/route"),
  "/api/sites/restore": () => import("@/app/api/sites/restore/route"),
  "/api/sites/replace-image": () => import("@/app/api/sites/replace-image/route"),
  "/api/sites/versions": () => import("@/app/api/sites/versions/route"),
  "/api/news": () => import("@/app/api/news/route"),
};

const AI_PATHS = new Set(["/api/sites/edit", "/api/sites/parse-fixtures"]);

function resolve(path: string, method: string): { load: Loader; params?: Record<string, string> } | null {
  if (SIMPLE[path]) return { load: SIMPLE[path] };
  let m = path.match(/^\/api\/news\/([\w-]+)$/);
  if (m) return { load: () => import("@/app/api/news/[id]/route"), params: { id: m[1] } };
  // Sidorna i "Sidor"-panelen. Att ta bort hela sajten släpps aldrig igenom.
  m = path.match(/^\/api\/sites\/([\w-]+)$/);
  if (m && method === "PATCH") return { load: () => import("@/app/api/sites/[id]/route"), params: { id: m[1] } };
  return null;
}

export async function POST(request: Request) {
  let input: { path?: string; method?: string; body?: unknown; state?: DemoState | null };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltigt anrop." }, { status: 400 });
  }
  const path = typeof input.path === "string" ? input.path.split("?")[0] : "";
  const query = typeof input.path === "string" && input.path.includes("?") ? input.path.slice(input.path.indexOf("?")) : "";
  const method = (input.method || "GET").toUpperCase();
  const target = resolve(path, method);
  if (!target) {
    return NextResponse.json({ status: 501, body: { error: "Det här finns inte i demon." }, state: input.state ?? null });
  }

  const ip = clientIp(request);
  const userId = "demo-" + createHash("sha1").update(ip).digest("hex").slice(0, 12);

  // Tillståndet kommer från webbläsaren: kolla att det ser rimligt ut, annars börja om.
  let state = input.state;
  const okState = !!state && typeof state === "object" && !!state.tables && Array.isArray(state.tables.sites) && state.tables.sites.length === 1;
  if (!okState) state = buildDemoState();
  const demoState = state as DemoState;
  demoState.tables.sites[0].owner_id = userId;
  demoState.tables.sites[0].id = "demo-site";

  if (AI_PATHS.has(path)) {
    if ((await rateLimited(`demo:ai:${ip}`, 15, 3600)) || (await rateLimited("demo:ai:all", 600, 86400))) {
      return NextResponse.json({
        status: 429,
        body: { error: getT()("Demon har nått sin gräns för AI-hjälp just nu. Prova igen om en stund, eller skapa en egen sajt så får du full tillgång.") },
        state: demoState,
      });
    }
  }

  const headers = new Headers({ "content-type": "application/json" });
  for (const h of ["x-forwarded-for", "x-real-ip", "accept-language", "cookie"]) {
    const v = request.headers.get(h);
    if (v && h !== "cookie") headers.set(h, v);
  }
  const hasBody = method !== "GET" && method !== "HEAD";
  const inner = new Request(`http://demo.local${path}${query}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(input.body ?? {}) : undefined,
  });

  const result = await demoStore.run({ state: demoState, ip, userId }, async () => {
    const mod = await target.load();
    const fn = mod[method] as Handler | undefined;
    if (!fn) return { status: 405, body: { error: "Metoden finns inte i demon." } };
    const res = await fn(inner, target.params ? { params: Promise.resolve(target.params) } : undefined);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  });

  return NextResponse.json({ ...result, state: demoState });
}
