import { logAiUsage } from "@/lib/aiUsage";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { withErrorLog } from "@/lib/errorLog";
import { cleanFixtures, type FixtureInput } from "@/lib/fixtureOps";

// "Klistra in schema" i matchrutan: läser ut matcher ur löpande text (ett
// klistrat spelschema, ett mejl, en tabell). Sparar ingenting. Kunden ser
// matcherna i rutan, kan rätta dem och sparar själv.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TOOL = {
  name: "extract_fixtures",
  description: "Returnerar alla matcher som står i texten, exakt som de står.",
  input_schema: {
    type: "object" as const,
    properties: {
      fixtures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "ÅÅÅÅ-MM-DD" },
            time: { type: "string", description: "TT:MM, utelämna om tid saknas" },
            opponent: { type: "string", description: "Motståndarens namn, så som det står" },
            home: { type: "boolean", description: "true om hemmamatch, false om bortamatch. Står lagen som 'Hemmalag - Bortalag' och kundens lag är det ena, avgör det. Är det oklart: true." },
            venue: { type: "string" },
            competition: { type: "string" },
            ourScore: { type: "integer", description: "Mål för kundens lag, bara om matchen är spelad och resultatet står i texten." },
            theirScore: { type: "integer" },
            status: { type: "string", enum: ["scheduled", "played", "cancelled", "postponed"] },
            note: { type: "string" },
          },
          required: ["date", "opponent"],
        },
      },
      teamName: { type: "string", description: "Kundens lagnamn om det tydligt framgår av texten eller kundens uppgift, annars utelämna." },
      notes: { type: "string", description: "Kort på svenska: rader du hoppade över eller tolkade osäkert, annars tom." },
    },
    required: ["fixtures"],
  },
};

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`parsefx:user:${user.id}`, 40, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 30000) : "";
  const teamName = typeof body.teamName === "string" ? body.teamName.trim().slice(0, 80) : "";
  if (text.length < 8) return NextResponse.json({ error: t("Klistra in texten med matcherna först.") }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Dagens datum är ${today}. Läs texten nedan och plocka ut ALLA matcher, i den ordning de står, med exakt de lagnamn, tider och platser som står där. Hitta aldrig på något som inte står i texten.
${teamName ? `Kundens lag heter "${teamName}". Motståndaren är det andra laget i varje match.` : "Kundens lag framgår kanske av texten. Är det oklart vilket lag som är kundens, ta det lag som återkommer i alla matcher."}
Saknas år på ett datum: ta det närmaste kommande datumet. Datum som "lör 14/9", "14 sep" och "söndag 5 oktober" ska bli ÅÅÅÅ-MM-DD. Tid som "14.00" blir "14:00".
Står ett resultat (till exempel "3-1"), är matchen spelad. Första siffran är hemmalagets mål; avgör vilken siffra som är kundens lags mål utifrån om kundens lag spelade hemma eller borta. Rader utan läsbart datum eller motståndare hoppas över och nämns i "notes".

Text:
"""
${text}
"""`;

  let response;
  try {
    response = await getAnthropicClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 12000,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "extract_fixtures" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e: any) {
    return NextResponse.json({ error: t("Kunde inte läsa schemat just nu.") + " " + (e?.message || "") }, { status: 502 });
  }
  await logAiUsage({ kind: "edit", model: CLAUDE_MODEL, usage: response.usage, userId: user.id, siteId: null });

  const use = response.content.find((b) => b.type === "tool_use") as any;
  const input = use?.input as { fixtures?: FixtureInput[]; teamName?: string; notes?: string } | undefined;
  const { items, skipped } = cleanFixtures(Array.isArray(input?.fixtures) ? input!.fixtures : []);
  if (items.length === 0) return NextResponse.json({ error: t("Hittade inga matcher i texten. Kontrollera att datum och motståndare finns med.") }, { status: 422 });
  return NextResponse.json({
    fixtures: items,
    teamName: typeof input?.teamName === "string" ? input.teamName.trim().slice(0, 80) : "",
    notes: [typeof input?.notes === "string" ? input.notes.trim() : "", skipped ? t("{n} matcher hoppades över eftersom datum eller motståndare saknades.", { n: skipped }) : ""].filter(Boolean).join(" "),
  });
}

export const POST = withErrorLog("POST /api/sites/parse-fixtures", POST_handler);
