import type { SupabaseClient } from "@supabase/supabase-js";

// Delad av /webbplats (förhandsvisning med webbläsarram) och
// /webbplats-innehall (samma sajt, men utan ramen — renderas i en iframe
// av /webbplats) så de garanterat alltid visar samma sajt, med samma
// "senaste sajten med genererat innehåll"-logik.
export async function getCurrentPublishedSite(supabase: SupabaseClient, userId: string) {
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
