import type { SupabaseClient } from "@supabase/supabase-js";

// Hämtar kundens pågående onboarding-utkast (en sajt som ännu inte har fått
// sitt AI-genererade innehåll). Finns ingen, skapas en tom med rimliga
// standardvärden. Varje onboarding-steg anropar den här för att slippa
// skicka med ett sajt-id fram och tillbaka mellan sidorna — det finns bara
// en aktiv onboarding åt gången per kund.
export async function getOrCreateDraftSite(supabase: SupabaseClient, ownerId: string) {
  const { data: existing } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("sites")
    .insert({ owner_id: ownerId, name: "Min sajt" })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}
