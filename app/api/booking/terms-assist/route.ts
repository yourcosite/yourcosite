import { logAiUsage } from "@/lib/aiUsage";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { siteLocale } from "@/lib/i18n/site-server";
import { LANGUAGE_ENGLISH } from "@/lib/i18n/config";

// "Be Millie skriva ett utkast" bland bokningsvillkoren (app/bokningar).
// Skriver bara ett FÖRSLAG som kunden själv läser, ändrar och tar ansvar för
// (kunden måste kryssa i att hen ansvarar för texten innan den publiceras).
// Sparar ingenting.
export const maxDuration = 30;

const TOOL = {
  name: "draft_booking_terms",
  description: "Returnerar ett utkast på bokningsvillkor som ren text.",
  input_schema: {
    type: "object" as const,
    properties: {
      terms: { type: "string", description: "Villkorstexten, i korta stycken eller punkter separerade med tomrad. Ren text, ingen markdown." },
    },
    required: ["terms"],
  },
};

export async function POST(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`termsassist:user:${user.id}`, 60, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 2000) : "";
  const current = typeof body.current === "string" ? body.current.trim().slice(0, 8000) : "";
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return NextResponse.json({ error: t("Saknar sajt.") }, { status: 400 });
  const { data: site } = await supabase.from("sites").select("id, name").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 });
  if (!instruction && !current) {
    return NextResponse.json({ error: t("Skriv kort vad villkoren ska innehålla, till exempel avbokning senast 24 timmar innan.") }, { status: 400 });
  }

  let client;
  try { client = getAnthropicClient(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const L = await siteLocale(createAdminClient(), siteId);
  const langName = LANGUAGE_ENGLISH[L.lang] ?? "Swedish";
  const prompt = `Du hjälper en företagare skriva bokningsvillkor (t.ex. avbokningsvillkor) som besökare ska godkänna när de bokar en tid på företagets sajt "${(site as any).name || ""}".

${current ? `Företagarens nuvarande text:\n"""\n${current}\n"""\n` : "Företagaren har inte skrivit något än.\n"}${instruction ? `Företagarens önskemål: "${instruction}"\n` : ""}
Regler:
- Skriv ett kort, tydligt och vänligt utkast, gärna som några korta punkter eller stycken. Vanliga ämnen: avbokning, sen ankomst, uteblivet besök, betalning. Ta bara med sådant företagaren bett om eller som är helt generellt.
- Hitta ALDRIG på konkreta uppgifter som företagaren inte nämnt (tidsgränser, avgifter, belopp, procent). Behöver en uppgift fyllas i, skriv den som en tydlig platshållare i hakparentes, t.ex. [antal timmar].
- Ge inga juridiska löften och påstå inte att texten följer lagen. Det är företagarens egen text och eget ansvar.
- Utgår du från företagarens text: behåll deras fakta och gör bara det de ber om.

Svara via verktyget "draft_booking_terms" på ${langName} (sajtens språk, även om önskemålet är på ett annat språk). Ren text, ingen markdown eller HTML.`;

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "draft_booking_terms" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e: any) {
    return NextResponse.json({ error: t("Kunde inte hämta ett förslag just nu.") }, { status: 502 });
  }
  await logAiUsage({ kind: "terms", model: CLAUDE_MODEL, usage: response.usage, userId: user.id, siteId });

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) return NextResponse.json({ error: t("Fick inget förslag.") }, { status: 502 });
  const terms = String((toolUse.input as any).terms || "").replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^>]*)?>/g, "").replace(/^[*#]+\s?/gm, "").trim();
  return NextResponse.json({ terms });
}
