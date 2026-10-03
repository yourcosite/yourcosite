import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";
import { generatePrivacyPolicyText } from "@/lib/privacyPolicyTemplate";

// Onboarding steg 5 — kundens integritetspolicy för SIN sajt. Två lägen:
// "uploaded" (kunden har redan en fil, t.ex. från sin jurist — vi sparar
// bara länken, läser aldrig innehållet) eller "generated" (vi skriver en
// enkel standardtext åt dem utifrån org.nr/adress/e-post, se
// lib/privacyPolicyTemplate.ts). Att skicka in mode "uploaded" rensar
// bort en ev. tidigare genererad text och tvärtom, så det alltid bara
// finns EN aktiv policy åt gången.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const mode = body.mode;

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  let update: Record<string, unknown>;

  if (mode === "uploaded") {
    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
    // Samma skydd som övriga uppladdningsrouter — filen måste faktiskt
    // ligga under kundens egen mapp i Storage, annars kunde vem som helst
    // skicka in en godtycklig extern länk som "sin policy".
    if (!fileUrl || !fileUrl.includes(`/uploads/${user.id}/`)) {
      return NextResponse.json({ error: "Ogiltig fil." }, { status: 400 });
    }
    update = {
      privacy_policy_mode: "uploaded",
      privacy_policy_file_url: fileUrl,
      privacy_policy_text: null,
    };
  } else if (mode === "generated") {
    const orgNumber = typeof body.orgNumber === "string" ? body.orgNumber.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!orgNumber || !address || !email) {
      return NextResponse.json(
        { error: "Fyll i organisationsnummer, adress och e-post." },
        { status: 400 }
      );
    }
    const text = generatePrivacyPolicyText({
      companyName: draft.name,
      orgNumber,
      address,
      email,
    });
    update = {
      privacy_policy_mode: "generated",
      privacy_policy_file_url: null,
      privacy_policy_text: text,
      privacy_policy_org_number: orgNumber,
      privacy_policy_address: address,
      privacy_policy_email: email,
    };
  } else if (mode === null) {
    // Kunden hoppar över / rensar sitt tidigare val.
    update = {
      privacy_policy_mode: null,
      privacy_policy_file_url: null,
      privacy_policy_text: null,
    };
  } else {
    return NextResponse.json({ error: "Ogiltigt läge." }, { status: 400 });
  }

  const { data: site, error } = await supabase
    .from("sites")
    .update(update)
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
