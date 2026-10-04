import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const links = Array.isArray(body.links)
    ? body.links.filter((l: unknown) => typeof l === "string" && l.trim() !== "")
    : [];
  // Färgvalet satt ihop med inspirationen sen det flyttades hit från det
  // gamla "Stil"-steget (som tog bort stilkortsvalet Minimalistisk/Djärv/osv —
  // kunden får ändå finjustera den känslan senare i chatten/redigeraren).
  const accentColor = typeof body.accentColor === "string" ? body.accentColor : undefined;
  const secondaryColors = Array.isArray(body.secondaryColors) ? body.secondaryColors : undefined;

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const update: Record<string, unknown> = { inspiration_links: links };
  if (accentColor) update.accent_color = accentColor;
  if (secondaryColors) update.secondary_colors = secondaryColors;

  const { data: site, error } = await supabase
    .from("sites")
    .update(update)
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
