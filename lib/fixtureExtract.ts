import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { cleanFixtures, type FixtureInput } from "@/lib/fixtureOps";

// Läser ut matcher ur löpande text med ett litet, fokuserat Claude-anrop.
// Används av "Klistra in schema" i matchrutan och som reservväg när Millie
// i chatten inte själv lyckas läsa ut ett inklistrat spelschema.
export const EXTRACT_TOOL = {
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

export async function extractFixtures(text: string, teamName: string): Promise<{ items: ReturnType<typeof cleanFixtures>["items"]; skipped: number; teamName: string; notes: string; usage: Anthropic.Usage }> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Dagens datum är ${today}. Läs texten nedan och plocka ut ALLA matcher, i den ordning de står, med exakt de lagnamn, tider och platser som står där. Hitta aldrig på något som inte står i texten.
${teamName ? `Kundens lag heter "${teamName}". Motståndaren är det andra laget i varje match.` : "Kundens lag framgår kanske av texten. Är det oklart vilket lag som är kundens, behandla varje rad som 'kundens lag mot motståndaren' och skriv motståndarens namn. Rader utan lagnamn: motståndaren är det lag som står efter bindestrecket."}
Saknas år på ett datum: ta det närmaste kommande datumet. Datum som "lör 14/9", "14 sep" och "söndag 5 oktober" ska bli ÅÅÅÅ-MM-DD. Tid som "14.00" blir "14:00".
Står ett resultat (till exempel "3-1"), är matchen spelad. Första siffran är hemmalagets mål; avgör vilken siffra som är kundens lags mål utifrån om kundens lag spelade hemma eller borta. Rader utan läsbart datum eller motståndare hoppas över och nämns i "notes".

Text:
"""
${text.slice(0, 30000)}
"""`;
  const response = await getAnthropicClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 12000,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_fixtures" },
    messages: [{ role: "user", content: prompt }],
  });
  const use = response.content.find((b) => b.type === "tool_use") as any;
  const input = use?.input as { fixtures?: FixtureInput[]; teamName?: string; notes?: string } | undefined;
  const { items, skipped } = cleanFixtures(Array.isArray(input?.fixtures) ? input!.fixtures : []);
  return {
    items,
    skipped,
    teamName: typeof input?.teamName === "string" ? input.teamName.trim().slice(0, 80) : "",
    notes: typeof input?.notes === "string" ? input.notes.trim() : "",
    usage: response.usage,
  };
}
