import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { SITE_CONTENT_PROPERTIES, SITE_CONTENT_REQUIRED } from "@/lib/siteContentSchema";

// Chattredigeraren (/redigera) — till skillnad från /api/sites/generate
// (som skriver EN HELT NY sajt från onboardingens brief) tar den här
// emot EN riktad ändringsönskan mot en sajt som redan finns, och skriver
// om bara det som behövs. Samma mönster som gav onboardingen pålitlig
// JSON tillbaka (tvingat verktygsanrop mot contentModel.ts) återanvänds
// här, se lib/siteContentSchema.ts.
export const maxDuration = 60;

const EDIT_TOOL = {
  name: "edit_site",
  description:
    "Returnerar HELA sajtens uppdaterade innehåll efter att ha gjort den ändring kunden bad om, plus en kort sammanfattning av vad som ändrades.",
  input_schema: {
    type: "object" as const,
    properties: {
      ...SITE_CONTENT_PROPERTIES,
      summary: {
        type: "string",
        description:
          "En kort mening på svenska, riktad direkt till kunden (t.ex. \"Bytte rubriken och gjorde texten kortare.\"), som beskriver vad som ändrades — eller varför inget ändrades om önskemålet inte gick att utföra.",
      },
    },
    required: [...SITE_CONTENT_REQUIRED, "summary"],
  },
};

function buildEditPrompt(content: SiteContent, message: string) {
  return `Du redigerar en BEFINTLIG kundwebbplats hos YourCoSite. Nedan är sajtens nuvarande innehåll som JSON (innehållsmodellen i lib/contentModel.ts):

${JSON.stringify(content, null, 2)}

Kundens önskemål just nu: "${message}"

Uppdatera ENDAST det som faktiskt behövs för att uppfylla önskemålet — bevara allt annat exakt som det är (exakt text, id, sidordning, sektioner som inte berörs).

VIKTIGT — bilder: rör ALDRIG ett befintligt "imageUrl"-värde (varken ta bort, byta ut eller hitta på ett nytt) om inte kunden uttryckligen bett om en bildändring du inte kan utföra på annat sätt — de sätts av vårt system utifrån kundens egna uppladdade foton, aldrig av dig. Flyttas en sektion följer dess imageUrl med. Lägger du till en helt ny sektion/sida som behöver en bild, UTELÄMNA "imageUrl" helt för den (ingen påhittad url, ingen tom sträng) — en snygg platshållare visas automatiskt istället.

VIKTIGT — knapplänkar: hero- och cta-sektioner kan ha ett "ctaLink". Ber kunden att en knapp ska leda till en av sajtens sidor, sätt ctaLink till exakt den sidans "path" ur listan av sidor ovan (t.ex. "/kontakt") — hitta aldrig på en sökväg som inte finns där. Ber kunden om en extern länk, använd en fullständig URL (https://...). Vill kunden att knappen inte ska gå att klicka på, utelämna ctaLink helt.

Svara alltid med HELA sajtens innehåll (alla sidor, inte bara den som ändrades) via verktyget "edit_site", plus ett kort "summary" riktat direkt till kunden.

Går önskemålet inte att utföra inom innehållsmodellen, eller är det för oklart för att agera på — gör INGA ändringar (returnera innehållet precis som det kom in) och förklara kort varför i "summary".`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Skriv vad du vill ändra." }, { status: 400 });

  // Bara de senaste turerna — räcker för att förstå uppföljningar som
  // "gör den lite större", utan att låta samtalet växa obegränsat i
  // varje anrop (den fulla, FÄRSKA sajten skickas ändå alltid med i
  // själva instruktionen nedan, så historiken behöver bara bära den
  // språkliga tråden, inte innehållet).
  const history: { from: "user" | "bot"; text: string }[] = Array.isArray(body.history)
    ? body.history.slice(-10)
    : [];

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt att redigera." }, { status: 400 });
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: buildEditPrompt(site.content, message) },
  ];

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      tools: [EDIT_TOOL],
      tool_choice: { type: "tool", name: "edit_site" },
      messages,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Kunde inte genomföra ändringen just nu: " + (e?.message || "okänt fel") },
      { status: 502 }
    );
  }

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "AI-svaret innehöll ingen uppdatering." }, { status: 502 });
  }

  const input = toolUse.input as SiteContent & { summary: string };
  const { summary, ...rest } = input;
  const updatedContent = rest as SiteContent;

  if (!isValidSiteContent(updatedContent)) {
    return NextResponse.json({ error: "AI-svaret hade fel format." }, { status: 502 });
  }

  // Loggan och sociala länkar sätts i kod från onboardingen, aldrig av
  // AI:n — samma säkerhetsnät som i /api/sites/generate, ifall Claude
  // skulle tappa bort dem på vägen trots instruktionen att bevara allt.
  if (site.logo_url) updatedContent.logoUrl = site.logo_url;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) {
    updatedContent.socialLinks = site.social_links;
  }

  const { error: saveError } = await supabase
    .from("sites")
    .update({
      content: updatedContent,
      // Färgerna kan kunden faktiskt be om att ändra i chatten — till
      // skillnad från genereringen vid onboarding tillåter vi det här, men
      // sparar då undan det nya valet så det inte råkar nollställas av ett
      // senare, orelaterat chattmeddelande (som bara skickar in sajtens
      // nuvarande innehåll, inklusive den redan ändrade färgen).
      accent_color: updatedContent.theme.accentColor,
      secondary_colors: updatedContent.theme.secondaryColors,
    })
    .eq("id", site.id);

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({ content: updatedContent, summary });
}
