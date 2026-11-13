import { buildDemoState, type DemoState } from "./demoSite";

// Webbläsarens del av demon på /demo. Gör att redigeraren kan köras utan
// inloggning: alla anrop till /api/... skickas till /api/demo/proxy tillsammans
// med demosajtens hela tillstånd, som sedan följer med tillbaka. Tillståndet
// finns bara här i minnet, så en omladdning nollställer demon.
// Bokningen i förhandsvisningen fås av en liten lokal låtsasmodul nedan.

let state: DemoState | null = null;
let installed = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function tzHourOffset(utc: Date): number {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" }).format(utc));
  return h - utc.getUTCHours();
}

// "Klockan h i Stockholm den dagen" som en ISO-tid.
function stockholm(y: number, m: number, d: number, h: number): string {
  const guess = new Date(Date.UTC(y, m, d, h));
  let off = tzHourOffset(guess);
  if (off > 12) off -= 24;
  if (off < -12) off += 24;
  return new Date(guess.getTime() - off * 3600000).toISOString();
}

const PACKAGES = [
  { id: "demo-p1", name: "Herrklippning", description: "Maskin och sax, tvätt och styling ingår.", duration_min: 45, price_sek: 450 },
  { id: "demo-p2", name: "Klippning och skägg", description: "Vår mest bokade kombination.", duration_min: 75, price_sek: 690 },
  { id: "demo-p3", name: "Rakning med kniv", description: "Varm handduk, rakolja och rakkniv.", duration_min: 40, price_sek: 395 },
  { id: "demo-p4", name: "Skäggtrimning", description: "Form, kontur och skäggolja.", duration_min: 30, price_sek: 290 },
];

function availability(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const now = new Date();
  for (let i = 1; i <= 28; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const wd = d.getUTCDay();
    if (wd === 0) continue;
    const hours = wd === 6 ? [10, 11, 12, 13, 14, 15] : [9, 10, 11, 13, 14, 15, 16, 17, 18];
    const free = hours.filter((h) => (d.getUTCDate() + h) % 4 !== 0);
    if (free.length) out[d.toISOString().slice(0, 10)] = free.map((h) => stockholm(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h));
  }
  return out;
}

async function handle(real: typeof fetch, path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  if (path.startsWith("/api/public/booking")) {
    if (method !== "GET") return json({ error: "Bokning är avstängd i demon." }, 400);
    const q = new URLSearchParams(path.split("?")[1] || "");
    if (q.get("packageId")) return json({ availability: availability(), timezone: "Europe/Stockholm" });
    return json({ packages: PACKAGES, timezone: "Europe/Stockholm", terms: null });
  }
  if (path.startsWith("/api/public/form-submit")) return json({ ok: true });
  if (path.startsWith("/api/analytics") || path.startsWith("/api/errors")) return json({ ok: true });

  let body: unknown = undefined;
  if (typeof init?.body === "string" && init.body) {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = undefined;
    }
  }
  if (!state) state = buildDemoState();
  const res = await real("/api/demo/proxy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, method, body, state }),
  });
  if (!res.ok) return json({ error: "Demon svarade inte just nu. Försök igen." }, 502);
  const out = await res.json();
  if (out.state) state = out.state as DemoState;
  return json(out.body ?? {}, typeof out.status === "number" ? out.status : 200);
}

export function installDemoFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const real = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : "";
    if (url.startsWith("/api/") && !url.startsWith("/api/demo/")) return handle(real, url, init);
    return real(input, init);
  };
}
