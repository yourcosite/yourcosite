import type { SupabaseClient } from "@supabase/supabase-js";

// Sparar en kopia av sajtens NUVARANDE innehåll innan det skrivs över, så
// att en felaktig ändring (av Millie, ångra eller något annat) alltid går att
// återställa. Tabellen site_versions skapas med supabase/versioner-sajter.sql;
// saknas den (eller något annat går fel) hoppas sparandet över tyst — det får
// aldrig stoppa själva ändringen.
const KEEP = 50;

export async function saveSiteVersion(
  supabase: SupabaseClient,
  site: { id: string; owner_id?: string; content: unknown },
  reason: string
) {
  try {
    if (!site?.content) return;
    let ownerId = site.owner_id;
    if (!ownerId) {
      const { data } = await supabase.auth.getUser();
      ownerId = data.user?.id;
    }
    if (!ownerId) return;
    // Hoppa över om innehållet är identiskt med den senaste sparade versionen.
    const { data: last } = await supabase
      .from("site_versions")
      .select("id, content")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (last && last[0] && JSON.stringify(last[0].content) === JSON.stringify(site.content)) return;
    const { error } = await supabase.from("site_versions").insert({ site_id: site.id, owner_id: ownerId, content: site.content, reason });
    if (error) return;
    const { data: old } = await supabase
      .from("site_versions")
      .select("id")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .range(KEEP, KEEP + 200);
    if (old && old.length) await supabase.from("site_versions").delete().in("id", old.map((r: { id: string }) => r.id));
  } catch {
    // Versionshistorik är best effort.
  }
}
