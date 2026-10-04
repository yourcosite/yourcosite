import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, isValidSitePage, type SiteContent, type SitePageContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { EDIT_PATCH_PROPERTIES, EDIT_PATCH_REQUIRED } from "@/lib/siteContentSchema";

// Chattredigeraren (/redigera) — till skillnad från /api/sites/generate
// (som skriver EN HELT NY sajt från onboardingens brief) tar den här
// emot EN riktad ändringsönskan mot en sajt som redan finns.
//
// Den skriver INTE om hela sajten varje gång. Tidigare gjorde den det (bad
// Claude svara med alla sidors fulla innehåll på nytt för varje ändring),
// vilket gjorde även en enkel rubrikändring långsam på en sajt med flera
// sidor — mängden text Claude måste SKRIVA UT styr hur lång tid svaret tar,
// inte hur stor sajten är i övrigt. Nu ber vi istället Claude svara med en
// "patch": bara de sidor som ändringen faktiskt rörde (se
// lib/siteContentSchema.ts, EDIT_PATCH_PROPERTIES), och klistrar in dem i
// den befintliga sajten här på servern — se applyPatch() nedan.
export const maxDuration = 60;

const EDIT_TOOL = {
  name: "edit_site",
  description:
    "Returnerar de DELAR av sajtens innehåll som ändrats för att uppfylla kundens önskemål (inte hela sajten), plus en kort sammanfattning.",
  input_schema: {
    type: "object" as const,
    properties: {
      ...EDIT_PATCH_PROPERTIES,
      summary: {
        type: "string",
        description:
          "En kort mening på svenska, riktad direkt till kunden (t.ex. \"Bytte rubriken och gjorde texten kortare.\"), som beskriver vad som ändrades — eller varför inget ändrades om önskemålet inte gick att utföra.",
      },
      unsupported: {
        type: "boolean",
        description:
          "Sätt till true ENDAST om önskemålet inte gick att utföra för att innehållsmodellen (lib/contentModel.ts) saknar stöd för det (t.ex. en helt ny sektionstyp, eller annat som skulle kräva att ändra själva sidmallen/designkoden, inte bara innehållet) — INTE om önskemålet bara var otydligt (be om förtydligande i summary istället då). Utelämnas eller false annars.",
      },
    },
    required: [...EDIT_PATCH_REQUIRED, "summary"],
  },
};

type EditPatch = {
  theme?: Partial<SiteContent["theme"]>;
  gaMeasurementId?: string;
  metaPixelId?: string;
  changedPages?: SitePageContent[];
  removedPagePaths?: string[];
  summary: string;
  unsupported?: boolean;
};

type Attachment = {
  kind: "image" | "document";
  url: string;
  name: string;
  mimeType?: string;
  // Bara för kind "document" — redan extraherad text (se
  // /api/sites/attachments/extract), skickas aldrig som rå fil hit.
  text?: string;
};

// Något kunden uttryckligen klickat på/markerat i förhandsvisningen (se
// components/SitePreview.tsx, "Klicka för att välja" och
// app/redigera/page.tsx) — skickas med så Claude inte behöver gissa VILKEN
// bild eller sektion ett otydligt önskemål ("byt bilden", "ändra texten
// här") syftar på. sectionId/itemIndex pekar exakt ut noden i
// innehållsmodellen (lib/contentModel.ts); label är en redan
// människoläsbar beskrivning (byggd i SitePreview.tsx) som också kan
// klistras rakt in i prompten. "image" = en specifik bild (hero eller en
// grid-ruta); "section" = hela sektionen (klickat på rubrik/brödtext/
// bakgrund) — för textändringar eller när kunden pekar ut "den här
// sektionen" snarare än en bild.
type Selection =
  | { target: "image"; pagePath: string; sectionId: string; kind: "hero" | "gridItem" | "galleryItem"; itemIndex?: number; label: string }
  | { target: "field"; pagePath: string; sectionId: string; field: string; label: string }
  | { target: "section"; pagePath: string; sectionId: string; label: string };

function buildEditPrompt(
  content: SiteContent,
  message: string,
  attachmentNote: string,
  currentPath: string | undefined,
  selection: Selection | undefined
) {
  const pagePaths = content.pages.map((p) => `${p.path} ("${p.label}")`).join(", ");
  const currentPage = currentPath ? content.pages.find((p) => p.path === currentPath) : undefined;
  const currentPageNote = currentPage
    ? `\nKunden tittar just nu på sidan "${currentPage.path}" ("${currentPage.label}") i förhandsvisningen. Är önskemålet oklart om VILKEN sida det gäller (t.ex. "byt rubriken" utan att nämna sida), anta med STOR sannolikhet att det är den här sidan, inte en annan.\n`
    : "";
  const selectionNote =
    selection?.target === "image"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en specifik bild i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"${
          selection.kind === "gridItem" || selection.kind === "galleryItem"
            ? `, rutan med index ${selection.itemIndex} i den sektionens "items"-lista`
            : ""
        }). Handlar önskemålet om att byta, ta bort eller ändra "bilden"/"bilden ovan" utan att tydligt peka ut en annan bild, syftar kunden med STOR sannolikhet på just DEN markerade bilden — gör då ändringen på exakt den noden, inte på en annan bild på sidan.\n`
      : selection?.target === "field"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT ETT SPECIFIKT textfält i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}", fältet "${selection.field}" — matchar exakt den egenskapen i innehållsmodellen, t.ex. "headline" eller "items.1.title" för rad 2 i en lista). Önskemålet gäller med STOR sannolikhet att ändra EXAKT det fältet (hela dess nya text, inte bara en del), inte något annat fält i samma eller en annan sektion — gör då ändringen bara där.\n`
      : selection?.target === "section"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en hel sektion i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"). Är önskemålet oklart om VILKEN rubrik/text/sektion det gäller, syftar kunden med STOR sannolikhet på just DEN markerade sektionen — gör då ändringen där, inte i en annan sektion på sidan.\n`
      : "";
  return `Du redigerar en BEFINTLIG kundwebbplats hos YourCoSite. Nedan är sajtens NUVARANDE innehåll som JSON, bara som underlag för dig — du skriver INTE ut det igen (innehållsmodellen i lib/contentModel.ts):

${JSON.stringify(content, null, 2)}

Sajtens sidor just nu: ${pagePaths}
${currentPageNote}${selectionNote}${attachmentNote}
Kundens önskemål just nu: "${message}"

Uppdatera ENDAST det som faktiskt behövs för att uppfylla önskemålet.

VIKTIGT — svara smalt: lägg i "changedPages" ENDAST de hela sidobjekt (path, label, alla sektioner) som denna ändring faktiskt påverkar. Rör en ändring bara EN sida, ta bara med den sidan — skriv INTE ut sajtens övriga, oberörda sidor, de lämnas automatiskt som de är. Gäller ändringen en sektion mitt på en sida, skriv ut HELA den sidans sektionslista (med den ändrade sektionen uppdaterad och resten oförändrad), inte bara den enskilda sektionen. Utelämna "theme" helt om inget färgtema-/typsnittsbyte efterfrågades.

VIKTIGT — bilder: rör ALDRIG ett befintligt "imageUrl"-värde (varken ta bort, byta ut eller hitta på ett nytt) om inte kunden uttryckligen bett om en bildändring du inte kan utföra på annat sätt — de sätts av vårt system utifrån kundens egna uppladdade foton, aldrig av dig. Flyttas en sektion följer dess imageUrl med. Lägger du till en helt ny sektion som behöver en bild, UTELÄMNA "imageUrl" helt för den (ingen påhittad url, ingen tom sträng) — en snygg platshållare visas automatiskt istället.

VIKTIGT — knapplänkar: hero- och cta-sektioner kan ha ett "ctaLink". Ber kunden att en knapp ska leda till en av sajtens sidor, sätt ctaLink till exakt den sidans "path" (se listan ovan) — hitta aldrig på en sökväg som inte finns där. Ber kunden om en extern länk, använd en fullständig URL (https://...). Vill kunden att knappen inte ska gå att klicka på, utelämna ctaLink helt.

VIKTIGT — bakgrundsfärg på EN enskild sida (t.ex. "gör Om oss-sidan svart/mörk"): detta STÖDS, via "backgroundMode" på sidobjektet i "changedPages" — se verktygets fältbeskrivning. Välj det av de tre lägena (light/warm/dark) som bäst matchar vad kunden bad om, texten justeras automatiskt. Gäller önskemålet istället HELA sajtens färgtema (t.ex. "byt till svart genomgående" eller bara "byt accentfärg"), använd "theme" högst upp som vanligt, inte detta fält.

VIKTIGT — kartsektion ("map"): fältet "address" ska vara EXAKT den adress kunden gett dig (gata, postnummer, ort) — hitta ALDRIG på en adress. Saknar kunden en adress att ange, fråga efter den i "summary" istället för att lägga till sektionen med en påhittad adress.

VIKTIGT — Google Analytics/Meta Pixel: ber kunden att koppla på Google Analytics eller Meta (Facebook) Pixel och GER dig ett ID i samma meddelande, sätt det i "gaMeasurementId" respektive "metaPixelId". Ber kunden om det men utan att ange något ID, svara i "summary" och be om ID:t istället — hitta aldrig på ett. Vill kunden koppla BORT en redan kopplad tagg, sätt motsvarande fält till en tom sträng. Scripten laddas bara in på sajten efter att besökaren godkänt "Alla cookies" i cookiebannern — nämn det kort om kunden undrar varför de inte ser något direkt i förhandsvisningen utan att godkänna den.

Svara alltid via verktyget "edit_site", plus ett kort "summary" riktat direkt till kunden.

Går önskemålet inte att utföra inom innehållsmodellen, eller är det för oklart för att agera på — gör INGA ändringar (utelämna "changedPages" eller lämna den tom) och förklara kort varför i "summary". Beror det specifikt på att innehållsmodellen saknar stöd (inte bara otydlighet), sätt även "unsupported" till true — det visar kunden en knapp för att skicka önskemålet vidare till oss.`;
}

function buildAttachmentNote(attachment: Attachment | undefined): string {
  if (!attachment) return "";
  if (attachment.kind === "image") {
    return `\nKunden har bifogat en bild i det här meddelandet, "${attachment.name}" (visas för dig som bild). Dess permanenta webbadress — använd EXAKT den som "imageUrl" om kunden vill använda bilden någonstans på sajten, hitta aldrig på en annan — är: ${attachment.url}\nSätt bara in den om kundens meddelande faktiskt ber om att använda/lägga till/byta ut en bild med den. Är bilden bara skickad som referens (t.ex. en stilbild), beskriv den inte i onödan — fokusera på det kunden faktiskt skrev.\n`;
  }
  const text = (attachment.text || "").trim();
  return `\nKunden har bifogat dokumentet "${attachment.name}". Textinnehåll (kan vara avkortat):\n"""\n${text}\n"""\nAnvänd det som källa bara om kundens meddelande faktiskt ber om det (t.ex. "lägg in texten ovan", "sammanfatta det bifogade dokumentet som brödtext"). Hitta inte på innehåll utöver det du ser här eller det kunden själv skriver.\n`;
}

// Klistrar in Claudes patch i den befintliga, redan sparade sajten:
// ersätter matchande sidor (på path), lägger till nya, tar bort begärda —
// allt annat lämnas exakt som det var, orört av den här ändringen.
function applyPatch(content: SiteContent, patch: EditPatch): SiteContent {
  const removed = new Set(patch.removedPagePaths || []);
  const changedByPath = new Map((patch.changedPages || []).map((p) => [p.path, p]));

  const pages: SitePageContent[] = [];
  for (const page of content.pages) {
    if (removed.has(page.path)) continue;
    const changed = changedByPath.get(page.path);
    // changedPages skickar HELA sidobjektet tillbaka (se promptens
    // instruktion), men Claude ombeds bara ange "backgroundMode" när just
    // DEN ändras — en patch som rör sidans text av annan anledning saknar
    // då fältet helt. Utan den här raden skulle det tolkas som "nollställ
    // bakgrunden", och en tidigare satt sidbakgrund försvinna igen nästa
    // gång kunden ber om en helt orelaterad ändring på samma sida.
    pages.push(
      changed ? { ...changed, backgroundMode: changed.backgroundMode ?? page.backgroundMode } : page
    );
    changedByPath.delete(page.path);
  }
  // Det som blir kvar i changedByPath är helt nya sidor — läggs sist.
  for (const page of changedByPath.values()) pages.push(page);

  const merged: SiteContent = {
    ...content,
    theme: patch.theme ? { ...content.theme, ...patch.theme } : content.theme,
    pages,
  };
  // Tomma strängar är kundens sätt att be Claude koppla BORT en tagg (se
  // promptens instruktion) — sparas aldrig som en tom sträng, fältet tas
  // bort helt istället, annars tolkar renderaren det som "sätt in en
  // Google Analytics-tagg med ID:t '' ". undefined (fältet utelämnat)
  // betyder "orört", inte "ta bort" — därför den uttryckliga kollen.
  if (patch.gaMeasurementId !== undefined) {
    if (patch.gaMeasurementId) merged.gaMeasurementId = patch.gaMeasurementId;
    else delete merged.gaMeasurementId;
  }
  if (patch.metaPixelId !== undefined) {
    if (patch.metaPixelId) merged.metaPixelId = patch.metaPixelId;
    else delete merged.metaPixelId;
  }
  return merged;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Skriv vad du vill ändra." }, { status: 400 });

  const rawAttachment = body.attachment;
  let attachment: Attachment | undefined;
  if (rawAttachment && typeof rawAttachment === "object") {
    const kind = rawAttachment.kind === "image" || rawAttachment.kind === "document" ? rawAttachment.kind : undefined;
    const url = typeof rawAttachment.url === "string" ? rawAttachment.url : "";
    // Säkerhetskoll: bilagan måste ligga i kundens egen uppladdningsmapp i
    // vår "uploads"-bucket — annars ignoreras den tyst istället för att
    // låta ett godtyckligt klientskickat objekt styra vad som skickas till
    // Claude (eller, för bilder, vilken extern URL som kan landa i en
    // sparad imageUrl).
    if (kind && url.includes(`/uploads/${user.id}/`)) {
      attachment = {
        kind,
        url,
        name: typeof rawAttachment.name === "string" ? rawAttachment.name : "bifogad fil",
        mimeType: typeof rawAttachment.mimeType === "string" ? rawAttachment.mimeType : undefined,
        text: typeof rawAttachment.text === "string" ? rawAttachment.text.slice(0, 20000) : undefined,
      };
    }
  }

  // Bara de senaste turerna — räcker för att förstå uppföljningar som
  // "gör den lite större", utan att låta samtalet växa obegränsat i
  // varje anrop (den fulla, FÄRSKA sajten skickas ändå alltid med i
  // själva instruktionen nedan, så historiken behöver bara bära den
  // språkliga tråden, inte innehållet).
  const history: { from: "user" | "bot"; text: string }[] = Array.isArray(body.history)
    ? body.history.slice(-10)
    : [];

  const currentPath = typeof body.currentPath === "string" ? body.currentPath : undefined;

  const rawSelection = body.selection;
  let selection: Selection | undefined;
  if (
    rawSelection &&
    typeof rawSelection === "object" &&
    typeof rawSelection.pagePath === "string" &&
    typeof rawSelection.sectionId === "string" &&
    typeof rawSelection.label === "string"
  ) {
    if (
      rawSelection.target === "image" &&
      (rawSelection.kind === "hero" || rawSelection.kind === "gridItem" || rawSelection.kind === "galleryItem")
    ) {
      selection = {
        target: "image",
        kind: rawSelection.kind,
        pagePath: rawSelection.pagePath,
        sectionId: rawSelection.sectionId,
        label: rawSelection.label,
        itemIndex: typeof rawSelection.itemIndex === "number" ? rawSelection.itemIndex : undefined,
      };
    } else if (rawSelection.target === "field" && typeof rawSelection.field === "string") {
      selection = {
        target: "field",
        pagePath: rawSelection.pagePath,
        sectionId: rawSelection.sectionId,
        field: rawSelection.field,
        label: rawSelection.label,
      };
    } else if (rawSelection.target === "section") {
      selection = {
        target: "section",
        pagePath: rawSelection.pagePath,
        sectionId: rawSelection.sectionId,
        label: rawSelection.label,
      };
    }
  }

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

  const promptText = buildEditPrompt(site.content, message, buildAttachmentNote(attachment), currentPath, selection);

  // Bara bildbilagor görs om till ett multimodalt meddelande (Claude ser
  // själva bilden) — textdokument är redan omvandlade till ren text i
  // prompten ovan, de behöver inget eget innehållsblock.
  const finalContent: Anthropic.MessageParam["content"] =
    attachment?.kind === "image"
      ? [
          { type: "image", source: { type: "url", url: attachment.url } },
          { type: "text", text: promptText },
        ]
      : promptText;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: finalContent },
  ];

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      // Svaret är nu proportionerligt mot ÄNDRINGEN (en eller ett par
      // sidor) istället för mot hela sajten, så 8000 var ett tak som i
      // praktiken nästan aldrig behövdes — sänkt för att inte ge modellen
      // utrymme att av misstag ändå skriva ut mer än nödvändigt.
      max_tokens: 4000,
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

  const patch = toolUse.input as EditPatch;
  if (patch.changedPages && !patch.changedPages.every(isValidSitePage)) {
    return NextResponse.json({ error: "AI-svaret hade fel format." }, { status: 502 });
  }

  const updatedContent = applyPatch(site.content, patch);
  if (!updatedContent.pages.length) {
    return NextResponse.json({ error: "Ändringen skulle lämna sajten utan sidor." }, { status: 502 });
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
      // senare, orelaterat chattmeddelande.
      accent_color: updatedContent.theme.accentColor,
      secondary_colors: updatedContent.theme.secondaryColors,
    })
    .eq("id", site.id);

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({
    content: updatedContent,
    summary: patch.summary,
    unsupported: patch.unsupported === true,
  });
}
