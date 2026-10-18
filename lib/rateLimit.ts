import { createAdminClient } from "@/lib/supabase/admin";

// Enkel spärr mot missbruk. Varje anrop sparas som en rad i tabellen
// rate_limit_hits (nyckel + tid); är det för många rader för samma nyckel
// inom tidsfönstret nekas anropet. Räknas i databasen så att det fungerar
// även när Vercel kör flera instanser. Om tabellen inte finns än (SQL inte
// körd) eller databasen krånglar släpps anropet igenom, så att en riktig
// kund aldrig blockeras av vårt eget skydd.

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip") || "okand";
  return ip.slice(0, 64);
}

export async function rateLimited(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const db = createAdminClient();
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count, error } = await db
      .from("rate_limit_hits")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);
    if (error) return false;
    if ((count ?? 0) >= max) return true;
    await db.from("rate_limit_hits").insert({ key });
    // Städa gamla rader då och då så tabellen inte växer.
    if (Math.random() < 0.02) {
      await db.from("rate_limit_hits").delete().lt("created_at", new Date(Date.now() - 2 * 86400000).toISOString());
    }
    return false;
  } catch {
    return false;
  }
}

export const TOO_MANY = "För många försök på kort tid. Vänta en stund och försök igen.";
