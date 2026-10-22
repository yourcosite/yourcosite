import { createAdminClient } from "@/lib/supabase/admin";

// Loggar verklig förbrukning för varje AI-anrop (tabellen ai_usage), så att
// admin kan se vad varje kund faktiskt kostar. Priser i dollar per miljon
// tokens (Anthropics prislista); räkna om här om priserna ändras.
const PRICES: { match: RegExp; in: number; out: number; cacheRead: number; cacheWrite: number }[] = [
  { match: /haiku/i, in: 1, out: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  { match: /./, in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 }, // Sonnet 5 / 5.5
];

type Usage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function costUsd(model: string, u: Usage): number {
  const p = PRICES.find((x) => x.match.test(model)) ?? PRICES[PRICES.length - 1];
  const inp = u.input_tokens ?? 0;
  const out = u.output_tokens ?? 0;
  const cr = u.cache_read_input_tokens ?? 0;
  const cw = u.cache_creation_input_tokens ?? 0;
  return (inp * p.in + out * p.out + cr * p.cacheRead + cw * p.cacheWrite) / 1_000_000;
}

// Sväljer alla fel — loggningen får aldrig stoppa ett riktigt anrop.
export async function logAiUsage(opts: {
  kind: "generate" | "edit" | "news" | "terms" | "translate";
  model: string;
  usage: Usage | null | undefined;
  userId?: string | null;
  siteId?: string | null;
}): Promise<void> {
  try {
    if (!opts.usage) return;
    const u = opts.usage;
    await createAdminClient().from("ai_usage").insert({
      user_id: opts.userId ?? null,
      site_id: opts.siteId ?? null,
      kind: opts.kind,
      model: opts.model,
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      cost_usd: costUsd(opts.model, u),
    });
  } catch (e) {
    console.error("[aiUsage] kunde inte logga", e);
  }
}

// Ungefärlig växelkurs för visning i admin (kronor per dollar).
export const USD_SEK = 10;
