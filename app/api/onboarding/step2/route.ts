import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const links = Array.isArray(body.links)
    ? body.links.filter((l: unknown) => typeof l === "string" && l.trim() !== "")
    : [];

  const draft = await getOrCreateDraftSite(supabase, user.id);

  const { data: site, error } = await supabase
    .from("sites")
    .update({ inspiration_links: links })
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
