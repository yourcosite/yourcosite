import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";
import { SOCIAL_PLATFORMS } from "@/lib/socialPlatforms";

const VALID_PLATFORM_IDS = SOCIAL_PLATFORMS.map((p) => p.id);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const links = Array.isArray(body.links)
    ? body.links.filter((l: unknown) => typeof l === "string" && l.trim() !== "")
    : [];

  // Sociala medier-länkar: bara kända plattformar och bara rader där kunden
  // faktiskt fyllt i en URL. Max 8 så fältet inte kan missbrukas.
  const socialLinks = Array.isArray(body.socialLinks)
    ? body.socialLinks
        .filter(
          (s: any) =>
            s &&
            typeof s.platform === "string" &&
            VALID_PLATFORM_IDS.includes(s.platform) &&
            typeof s.url === "string" &&
            s.url.trim() !== ""
        )
        .slice(0, 8)
        .map((s: any) => ({ platform: s.platform, url: s.url.trim() }))
    : [];

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const { data: site, error } = await supabase
    .from("sites")
    .update({ inspiration_links: links, social_links: socialLinks })
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
