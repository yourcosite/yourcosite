import type { SupabaseClient } from "@supabase/supabase-js";

// Delad av /webbplats (förhandsvisning med webbläsarram) och
// /webbplats-innehall (samma sajt, men utan ramen — renderas i en iframe
// av /webbplats) så de garanterat alltid visar samma sajt, med samma
// "senaste sajten med genererat innehåll"-logik.
//
// siteId (valfri): kunden kan ha FLERA genererade sajter på samma konto
// (se MAX_SITES_PER_ACCOUNT i onboardingSite.ts) — utan den här kraschade
// hela redigeringsflödet ihop till "senaste skapade sajten" oavsett vilken
// sajt kunden klickade på i kundzonen (app/dashboard/DashboardClient.tsx),
// vilket gjorde att två av kundens sajter öppnade samma sajt i redigeraren
// och bara en av dem gick att redigera. Anges siteId, används den (om den
// verkligen ägs av kunden och har innehåll) — annars faller vi tillbaka på
// den gamla "senaste sajten"-heuristiken precis som innan, så alla äldre
// länkar utan sajt-id fortfarande fungerar.
export async function getCurrentPublishedSite(supabase: SupabaseClient, userId: string, siteId?: string | null) {
  if (siteId) {
    const { data: requested } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("owner_id", userId)
      .not("content", "is", null)
      .maybeSingle();
    if (requested) return requested;
  }

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", userId)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return site;
}
