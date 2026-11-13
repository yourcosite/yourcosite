import type { SupabaseClient } from "@supabase/supabase-js";
import { inDemo } from "@/lib/demoStore";

// Spärr på antal ändringar per månad OCH SAJT: varje sajt har egna 30 (50 de
// första 30 dagarna efter att sajten skapats). Extra ändringar
// (tillägget "50 extra ändringar") läggs in av admin per månad i tabellen
// change_addons. En "ändring" är ett Millie-svar som faktiskt ändrade sajten
// (rad i site_changes) — frågor och avvisade önskemål räknas inte, inte heller
// egna textändringar i redigeraren. Tabellerna skapas med
// supabase/andringar-spark.sql; saknas de är spärren avstängd (enabled false).
export const BASE_CHANGES = 30;
// De första 30 dagarna efter registreringen ingår 50 ändringar, eftersom
// kunden behöver ställa in sin nya sajt. Därefter 30 per kalendermånad.
export const START_CHANGES = 50;
const START_DAYS = 30;

export type ChangeUsage = { enabled: boolean; used: number; limit: number; extra: number };

function monthKey(d = new Date()): string {
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit" }).format(d);
  return p.slice(0, 7); // "2026-11"
}

function monthStartIso(d = new Date()): string {
  const [y, m] = monthKey(d).split("-").map(Number);
  // Midnatt svensk tid den 1:a (vinter UTC+1, sommar UTC+2), med marginal åt säkra hållet.
  return new Date(Date.UTC(y, m - 1, 1, -2)).toISOString();
}

// siteId: sajten som räknas (varje sajt har egen gräns). Utan siteId räknas
// kontots alla ändringar, med kontots registreringsdatum som start.
// createdAt: när sajten skapades (annars kontot).
export async function getChangeUsage(supabase: SupabaseClient, userId: string, createdAt?: string | null, siteId?: string | null): Promise<ChangeUsage> {
  const off = { enabled: false, used: 0, limit: BASE_CHANGES, extra: 0 };
  if (inDemo()) return off;
  try {
    // Startperioden: 50 ändringar räknat från registreringen. Efter den
    // räknas kalendermånaden, men aldrig bakåt in i startperioden.
    const created = createdAt ? new Date(createdAt).getTime() : NaN;
    const startEnd = Number.isNaN(created) ? 0 : created + START_DAYS * 86400000;
    const inStart = Date.now() < startEnd;
    const since = inStart ? new Date(created).toISOString() : new Date(Math.max(new Date(monthStartIso()).getTime(), startEnd)).toISOString();
    const base = inStart ? START_CHANGES : BASE_CHANGES;
    let countQuery = supabase
      .from("site_changes")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .gte("created_at", since);
    if (siteId) countQuery = countQuery.eq("site_id", siteId);
    const { count, error } = await countQuery;
    if (error) return off;
    // Tillägg gäller en sajt (site_id). Äldre rader utan site_id gäller kontots alla sajter.
    let addonQuery = supabase
      .from("change_addons")
      .select("amount")
      .eq("owner_id", userId)
      .eq("month", monthKey());
    if (siteId) addonQuery = addonQuery.or(`site_id.eq.${siteId},site_id.is.null`);
    const { data: addons, error: addErr } = await addonQuery;
    const extra = addErr ? 0 : (addons || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
    return { enabled: true, used: count ?? 0, limit: base + extra, extra };
  } catch {
    return off;
  }
}

export async function recordChange(supabase: SupabaseClient, userId: string, siteId: string): Promise<void> {
  if (inDemo()) return;
  try {
    await supabase.from("site_changes").insert({ owner_id: userId, site_id: siteId });
  } catch {
    // Räknaren får aldrig stoppa en ändring som redan sparats.
  }
}

export { monthKey };
