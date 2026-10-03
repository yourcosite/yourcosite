import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Pinnar kunden till SAMMA utkast genom hela onboardingen, istället för att
// varje steg gissa "senaste sajten utan innehåll" på nytt. Utan det här kan
// ett konto med flera halvfärdiga eller tidigare övergivna utkast (vanligt
// vid upprepad testning) råka koppla t.ex. steg 3:s bilduppladdning till EN
// sajt, medan /forslag och /webbplats sedan visar en ANNAN — precis det som
// orsakade "jag laddade upp 10 bilder men hero-bilden saknas ändå".
const DRAFT_COOKIE = "yc_draft_id";

// Max antal sajter (utkast + publicerade, borttagna räknas inte) ett
// kundkonto får ha samtidigt. Varje ny sajt som genereras kostar riktiga
// pengar (ett Claude-API-anrop), så gränsen finns för att ingen av
// misstag (eller med flit) ska kunna skapa obegränsat många. Kunden ser
// felmeddelandet och kan ta bort en gammal sajt på /dashboard för att
// frigöra en plats.
export const MAX_SITES_PER_ACCOUNT = 5;

export class DraftLimitError extends Error {
  constructor() {
    super(
      `Du har redan ${MAX_SITES_PER_ACCOUNT} sajter på kontot. Ta bort en på dashboarden innan du skapar en ny.`
    );
    this.name = "DraftLimitError";
  }
}

// Hämtar kundens pågående onboarding-utkast (en sajt som ännu inte har fått
// sitt AI-genererade innehåll). Finns ingen, skapas en tom med rimliga
// standardvärden — men bara om kontot inte redan ligger på gränsen.
// Varje onboarding-steg anropar den här för att slippa skicka med ett
// sajt-id fram och tillbaka mellan sidorna — det finns bara en aktiv
// onboarding åt gången per kund.
export async function getOrCreateDraftSite(supabase: SupabaseClient, ownerId: string) {
  const cookieStore = cookies();
  const pinnedId = cookieStore.get(DRAFT_COOKIE)?.value;

  // Försök först med den sajt kunden redan är pinnad till. Om den sajten
  // under tiden fått sitt innehåll byggt (content inte längre null) eller
  // tillhör ett annat konto matchar frågan inte längre — då faller vi
  // tillbaka på heuristiken nedan precis som innan, så en gammal/ogiltig
  // cookie aldrig kan blockera något.
  if (pinnedId) {
    const { data: pinned } = await supabase
      .from("sites")
      .select("*")
      .eq("id", pinnedId)
      .eq("owner_id", ownerId)
      .is("content", null)
      .maybeSingle();
    if (pinned) return pinned;
  }

  const { data: existing } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    cookieStore.set(DRAFT_COOKIE, existing.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return existing;
  }

  const { count } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if ((count ?? 0) >= MAX_SITES_PER_ACCOUNT) {
    throw new DraftLimitError();
  }

  const { data: created, error } = await supabase
    .from("sites")
    .insert({ owner_id: ownerId, name: "Min sajt" })
    .select("*")
    .single();

  if (error) throw error;

  cookieStore.set(DRAFT_COOKIE, created.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return created;
}

// Samma princip som ovan men utan att skapa något — används av platser som
// bara ska LÄSA det aktuella utkastet: dels onboardingens "fyll i det jag
// redan skrivit igen"-hämtning, dels själva sajtgenereringen (som måste
// bygga EXAKT den sajt kunden precis fyllde i, inte bara "senaste utkastet"
// om kontot råkar ha fler halvfärdiga utkast liggande samtidigt).
export async function getCurrentDraftSite(supabase: SupabaseClient, ownerId: string) {
  const pinnedId = cookies().get(DRAFT_COOKIE)?.value;

  if (pinnedId) {
    const { data: pinned } = await supabase
      .from("sites")
      .select("*")
      .eq("id", pinnedId)
      .eq("owner_id", ownerId)
      .is("content", null)
      .maybeSingle();
    if (pinned) return pinned;
  }

  const { data: existing } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return existing ?? null;
}

// Hämtar EXAKT den sajt kunden håller på med just nu, oavsett om den redan
// hunnit få sitt AI-genererade innehåll eller inte — till skillnad från
// getCurrentDraftSite ovan (som bara hittar opublicerade utkast, content
// IS NULL). Används av /api/sites/generate, som måste kunna bygga om en
// sajt som redan har innehåll: klickar kunden "Be YourCoSite skriva om
// alltihop" från /forslag pekar cookien fortfarande på rätt sajt, men den
// har redan fått sitt innehåll satt av den FÖRSTA genereringen — då
// missade getCurrentDraftSite den (content-filtret), vilket gjorde
// omskrivningen trasig ("Hittade inget onboarding-utkast att bygga sajt
// från.").
export async function getPinnedOrLatestSite(supabase: SupabaseClient, ownerId: string) {
  const pinnedId = cookies().get(DRAFT_COOKIE)?.value;

  if (pinnedId) {
    const { data: pinned } = await supabase
      .from("sites")
      .select("*")
      .eq("id", pinnedId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (pinned) return pinned;
  }

  const { data: existing } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return existing ?? null;
}

// Liten hjälpare så varje route inte behöver upprepa samma try/catch för
// att visa gränsfelet snyggt istället för en generisk 500:a.
export function draftLimitResponse(e: unknown): NextResponse | null {
  if (e instanceof DraftLimitError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return null;
}
