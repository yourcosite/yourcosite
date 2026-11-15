import { logAiUsage } from "@/lib/aiUsage";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { siteLocale } from "@/lib/i18n/site-server";
import { LANGUAGE_ENGLISH } from "@/lib/i18n/config";
import { isValidSiteContent } from "@/lib/contentModel";
import { withErrorLog } from "@/lib/errorLog";

// "Förslag från Millie" för rubrik och text vid delning (Inställningar).
// Skriver bara ett förslag som kunden själv läser, ändrar och sparar. Sparar
// ingenting och räknas inte som en ändring.
export const maxDuration = 30;

const TOOL = {
  name: "suggest_share_text",
  description: "Returnerar en rubrik och en kort beskrivning för delning på sociala medier.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Rubrik, högst 60 tecken." },
      description: { type: "string", description: "Beskrivning, 1-2 meningar, högst 160 tecken." },
    },
    required: ["title", "description"],
  },
};

const clean = (s: unknown, max: number) =>
  String(s || "").replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^>]*)?>/g, "").replace(/^[*#]+\s?/gm, "").replace(/\s+/g, " ").trim().slice(0, max);

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`shareassist:user:${user.id}`, 40, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  const { data: site } = await supabase.from("sites").select("id, name, content").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site || !isValidSiteContent((site as any).content)) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 });

  const content = (site as any).content;
  const home = content.pages.find((p: any) => p.path === "/") ?? content.pages[0];
  const text = (home?.sections || [])
    .map((s: any) => [s.heading, s.subheading, s.body, ...(s.items || []).slice(0, 4).map((i: any) => `${i.title || ""}: ${i.body || ""}`)].filter(Boolean).join(" "))
    .join("\n")
    .slice(0, 3500);
  const wish = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 500) : "";

  let client;
  try { client = getAnthropicClient(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  const L = await siteLocale(createAdminClient(), siteId);
  const langName = LANGUAGE_ENGLISH[L.lang] ?? "Swedish";

  const prompt = `Du skriver rubrik och beskrivning som visas när sajten "${(site as any).name || ""}" delas på Facebook, LinkedIn eller i ett meddelande, och i Googles sökresultat.

Startsidans innehåll:
"""
${text}
"""
${wish ? `Företagarens önskemål: "${wish}"\n` : ""}
Regler:
- Rubriken ska vara kort och tydlig (högst 60 tecken), gärna med verksamhetens namn eller vad den gör.
- Beskrivningen ska vara 1-2 vinkelmeningar (högst 160 tecken) som får någon att vilja klicka.
- Hitta ALDRIG på uppgifter, priser, platser eller löften som inte står i innehållet ovan.
- Ren text, ingen markdown, inga emojis.

Svara via verktyget "suggest_share_text" på ${langName}.`;

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "suggest_share_text" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch {
    return NextResponse.json({ error: t("Kunde inte hämta ett förslag just nu.") }, { status: 502 });
  }
  await logAiUsage({ kind: "share", model: CLAUDE_MODEL, usage: response.usage, userId: user.id, siteId });

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) return NextResponse.json({ error: t("Fick inget förslag.") }, { status: 502 });
  const input = toolUse.input as any;
  return NextResponse.json({ title: clean(input.title, 90), description: clean(input.description, 220) });
}

export const POST = withErrorLog("POST /api/sites/share-text-assist", POST_handler);
