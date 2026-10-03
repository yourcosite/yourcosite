import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { summarizeInspirationLinks, fetchInspirationImages } from "@/lib/inspiration";
import { assignUploadedImages } from "@/lib/assignUploadedImages";
import { ensureImageSlots } from "@/lib/ensureImageSlots";
import { getCurrentDraftSite } from "@/lib/supabase/onboardingSite";

// Sajtgenerering kan ta längre än Vercels standardtimeout (10s) eftersom
// Claude ska skriva texter för flera sidor i ett svar. Förlänger till 60s.
export const maxDuration = 60;

// JSON-schemat för verktyget vi tvingar Claude att svara med. Genom att
// låta AI:n "ringa" ett verktyg istället för att bara skriva fritext får vi
// garanterat giltig, strukturerad JSON tillbaka — aldrig rå HTML och aldrig
// fält utanför vår innehållsmodell (se lib/contentModel.ts).
const SECTION_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "hero" },
        layout: { type: "string", enum: ["centered", "split-left", "split-right", "overlay-bottom"] },
        eyebrow: { type: "string" },
        headline: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
      },
      required: ["id", "type", "layout", "headline", "body"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "about" },
        heading: { type: "string" },
        body: { type: "string" },
      },
      required: ["id", "type", "heading", "body"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "grid" },
        layout: { type: "string", enum: ["cards", "alternating-rows", "list", "numbered"] },
        heading: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, body: { type: "string" } },
            required: ["title", "body"],
          },
        },
      },
      required: ["id", "type", "layout", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "testimonials" },
        layout: { type: "string", enum: ["single-quote", "carousel-row", "side-by-side"] },
        heading: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { quote: { type: "string" }, author: { type: "string" } },
            required: ["quote", "author"],
          },
        },
      },
      required: ["id", "type", "layout", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "cta" },
        layout: { type: "string", enum: ["centered", "split"] },
        heading: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
      },
      required: ["id", "type", "layout", "heading", "body", "ctaLabel"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "contact" },
        layout: { type: "string", enum: ["centered", "split-info"] },
        heading: { type: "string" },
        body: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
      },
      required: ["id", "type", "layout", "heading", "body"],
    },
  ],
};

const GENERATE_TOOL = {
  name: "generate_site",
  description: "Skapar det strukturerade innehållet för en helt ny kundsajt.",
  input_schema: {
    type: "object" as const,
    properties: {
      theme: {
        type: "object",
        properties: {
          accentColor: { type: "string" },
          secondaryColors: { type: "array", items: { type: "string" } },
          font: { type: "string", enum: ["serif", "sans"] },
        },
        required: ["accentColor", "secondaryColors", "font"],
      },
      pages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            label: { type: "string" },
            sections: { type: "array", items: SECTION_SCHEMA },
          },
          required: ["path", "label", "sections"],
        },
      },
    },
    required: ["theme", "pages"],
  },
};

// Ren instruktion ("variera!") räcker sällan ensam — språkmodeller har en
// stark tendens att konvergera mot samma "säkra" val om och om igen även
// när de uttryckligen ombeds variera, särskilt för kunder med liknande
// bransch/ton. Därför slumpar vi fram en konkret riktning PER GENERERING i
// kod och lägger in den som en knuff i prompten — det är det som faktiskt
// sprider ut valen mellan kunder över tid, inte bara en vädjan om variation.
function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Övervägande (inte uteslutande) "overlay-bottom" eftersom det är den mest
// imponerande startsidelayouten — men inte så dominant att nästan alla
// kunders startsidor ser likadana ut, vilket var läget innan.
const HOME_HERO_LAYOUT_POOL = [
  "overlay-bottom",
  "overlay-bottom",
  "overlay-bottom",
  "split-left",
  "split-right",
  "centered",
];

const LAYOUT_TENDENCY_POOL = [
  "renare och mer återhållsam — luta åt layouter som \"centered\", \"list\" och \"single-quote\" där det passar",
  "dynamisk och bildtung — luta åt layouter som \"split-left\"/\"split-right\", \"alternating-rows\" och \"numbered\" där det passar",
  "en jämn blandning, utan tydlig slagsida åt någotdera hållet",
];

function buildPrompt(
  site: any,
  pages: any[],
  inspiration: { promptText: string; heroImageSignal: "yes" | "no" | "unknown" },
  inspirationImageCount: number
) {
  const pagesDesc = pages
    .map(
      (p) =>
        `- "${p.label}" (path: ${p.path})${p.brief ? ` — kundens brief: ${p.brief}` : ""}`
    )
    .join("\n");
  const inspirationText = inspiration.promptText;

  // Prioritetsordning för startsidans hero-layout: (1) uppladdade
  // inspirationsbilder — de är riktig bilddata AI:n kan titta på direkt,
  // starkare än att gissa utifrån HTML; (2) den HTML-baserade signalen från
  // referenslänkarna (se lib/inspiration.ts); (3) bara när vi inte har
  // NÅGON signal alls (inga länkar/bilder, eller inget som gick att läsa)
  // faller vi tillbaka på en slumpad knuff i kod, så att kunder utan
  // referenser ändå inte alla konvergerar mot exakt samma val (språkmodeller
  // har annars en stark tendens att välja "det säkra" om och om igen).
  const heroLayoutInstruction =
    inspirationImageCount > 0
      ? `Kunden har bifogat ${inspirationImageCount} egna inspirationsbild${inspirationImageCount === 1 ? "" : "er"} i det här meddelandet (skärmdumpar/foton av sajter eller stilar de gillar) — det är din STARKASTE signal för layoutval, starkare än både ton/bransch och nedanstående riktlinjer. Titta noga på dem: har de en stor, framträdande bild/hero högst upp, välj layouten "overlay-bottom" (fullbred bild bakom menyn) för startsidans hero; känns de mer återhållsamma/textfokuserade, välj en lugnare layout som "centered" istället.`
      : inspiration.heroImageSignal === "yes"
      ? `Kundens egna referenssajter har tydligt en stor, framträdande bild/hero högst upp på startsidan — gör likadant här: välj layouten "overlay-bottom" (fullbred bild bakom menyn, som stora hotell-/spa-sajter) för startsidans hero, om inget i kundens beskrivning starkt talar emot det.`
      : inspiration.heroImageSignal === "no"
      ? `Kundens egna referenssajter har INTE någon framträdande bild/hero högst upp — de är mer textfokuserade. Spegla det: välj en mer återhållsam layout för startsidans hero, t.ex. "centered", istället för en fullbred bilddominerad lösning, om inget i kundens beskrivning starkt talar emot det.`
      : `Som utgångspunkt för DEN HÄR sajten (ingen tydlig signal från referenser att utgå från): luta åt layouten "${pickRandom(HOME_HERO_LAYOUT_POOL)}" för startsidans hero om inget i kundens egna ord, bransch eller ton tydligt talar för en annan — men välj fritt bland "overlay-bottom" (fullbred bild bakom menyn, som stora hotell-/spa-sajter), "split-left"/"split-right" eller "centered" om något av dem passar tydligt bättre.`;

  const suggestedTendency = pickRandom(LAYOUT_TENDENCY_POOL);

  const textFillInstruction =
    site.allow_ai_text_fill === false
      ? `VIKTIGT — texten ska hålla sig nära det kunden faktiskt skrivit: kunden har INTE godkänt att du fyller ut saknad information med egna påhittade detaljer. Utgå bara från briefen, beskrivningen och branschen ovan. Hitta inte på konkreta erbjudanden, siffror, historia eller funktioner kunden inte nämnt. Där en sida eller sektion saknar underlag — håll texten kort, allmän och varumärkesneutral hellre än att fylla ut med påhittat innehåll.`
      : `Skriv genuint bra, konkret copy på svenska för varje sida — ingen platshållartext ("Lorem ipsum" eller liknande är förbjudet). Utgå från beskrivningen och branschen för att hitta rätt detaljer och ton, och fyll gärna i rimliga, generiska detaljer där kundens egen brief är sparsam.`;

  return `Du ska skriva innehållet till en helt ny webbplats, åt en kund hos YourCoSite (en AI-driven hemsidesbyggare för svenska småföretag).

Företag: ${site.name}
Bransch: ${site.industry || "ej angiven"}
Beskrivning från kunden: ${site.description || "ej angiven"}
Önskad ton: ${site.tone || "Personlig"}
Visuell stil: ${site.style_id || "warm"}
${inspirationText}
${inspirationImageCount > 0 ? `\nKunden har också bifogat ${inspirationImageCount} egna inspirationsbild${inspirationImageCount === 1 ? "" : "er"} till det här meddelandet (skärmdumpar/foton av sajter eller stilar de gillar) — titta på dem för KÄNSLA, TON och STRUKTUR precis som referenslänkarna ovan, kopiera aldrig text eller exakta formuleringar.\n` : ""}
Sidor som ska skapas, i denna ordning:
${pagesDesc}

${textFillInstruction} Varje sida ska ha minst 2-3 sektioner som passar innehållet (t.ex. en hero längst upp, sedan about/grid/testimonials/cta/contact där det är relevant) — du väljer fritt vilka sektionstyper som passar varje sida bäst, så länge du håller dig till de sektionstyper verktyget stödjer.

VIKTIGT — varje sida MÅSTE inledas med en "hero"-sektion (den är sidans enda garanterade bildplats tillsammans med "grid" — se till att minst en av dem finns på varje sida, annars blir sidan bildlös).

VIKTIGT — startsidans hero ska vara ett riktigt "wow"-intryck: det är besökarens första sekund på sajten. Skriv en kort, slagkraftig rubrik (inte en lång mening) och låt eyebrow/CTA dra blicken. ${heroLayoutInstruction}

VIKTIGT — variation mellan olika kunder, i den här prioritetsordningen: (1) kundens egen beskrivning och eventuella referenslänkar väger TYNGST — strukturen ovan och bransch-/tonval nedan ska i första hand komma från vad KUNDEN faktiskt visat och skrivit, inte hittas på; (2) saknas tydliga signaler där, luta generellt åt en ${suggestedTendency} för den här sajten. Två sajter i samma bransch och ton ska ändå inte kunna förväxlas — variera aktivt layoutval, sektionsordning och vilka sektionstyper som används mellan olika sidor/kunder.

VIKTIGT — layout per sektion: varje sektion (utom "about") har ett obligatoriskt "layout"-fält med ett fåtal fördefinierade uppbyggnader (se verktygets schema för giltiga värden per sektionstyp). Välj layout utifrån företagets ton, bransch, beskrivning och eventuell inspiration — inte slumpmässigt och inte alltid samma. Två kunder med samma ton ska ändå kunna hamna olika beroende på vad de själva beskrivit. Variera gärna layout MELLAN sektionerna på samma sida också (t.ex. inte bild-vänster på alla sektioner) så sidan känns komponerad snarare än mallad. Riktlinjer, inte regler att följa slaviskt: en lugn/professionell ton passar ofta renare layouter ("centered", "list", "single-quote"), en personlig/lekfull ton passar ofta mer dynamiska ("split-left/right", "alternating-rows", "numbered"), men låt alltid kundens egna ord väga tyngst.

Anropa verktyget "generate_site" med hela resultatet.`;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  // Samma utkast kunden faktiskt fyllde i (sidor, foton, logga m.m.) i
  // onboardingen — inte bara "senaste utkastet utan innehåll" rakt av, som
  // kunde peka fel om kontot hade fler halvfärdiga utkast samtidigt.
  const site = await getCurrentDraftSite(supabase, user.id);

  if (!site) {
    return NextResponse.json(
      { error: "Hittade inget onboarding-utkast att bygga sajt från." },
      { status: 400 }
    );
  }

  const { data: pages } = await supabase
    .from("site_pages")
    .select("*")
    .eq("site_id", site.id)
    .order("sort_order", { ascending: true });

  if (!pages || pages.length === 0) {
    return NextResponse.json(
      { error: "Inga sidor valda — gå tillbaka till steg 3 i onboardingen." },
      { status: 400 }
    );
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const inspiration = await summarizeInspirationLinks(site.inspiration_links || []);
  const inspirationImages = await fetchInspirationImages(site.inspiration_image_urls || []);

  // Bilderna läggs FÖRE textprompten i samma meddelande — Claude väger in
  // bilder bättre när de kommer innan texten som refererar till dem, enligt
  // Anthropics egna rekommendationer för multimodala anrop.
  const promptContent: Anthropic.MessageParam["content"] = [
    ...inspirationImages.map(
      (img): Anthropic.ImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType as any, data: img.base64 },
      })
    ),
    { type: "text", text: buildPrompt(site, pages, inspiration, inspirationImages.length) },
  ];

  let message;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      tools: [GENERATE_TOOL],
      tool_choice: { type: "tool", name: "generate_site" },
      messages: [{ role: "user", content: promptContent }],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Kunde inte generera sajten just nu: " + (e?.message || "okänt fel") },
      { status: 502 }
    );
  }

  const toolUse = message.content.find(
    (b): b is Extract<typeof message.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "AI-svaret innehöll inget sajtinnehåll." }, { status: 502 });
  }

  const content = toolUse.input as SiteContent;
  if (!isValidSiteContent(content)) {
    return NextResponse.json({ error: "AI-svaret hade fel format." }, { status: 502 });
  }

  // Kundens färgval från onboarding steg 4 är ett beslut kunden redan
  // fattat — inte en gissning AI:n får skriva över. Tvingar därför alltid
  // igenom de valda färgerna, oavsett vad modellen själv föreslog.
  // backgroundMode sätts till ett förvalt startläge; kunden väljer sedan
  // mellan tre stilvarianter (lib/themeVariants.ts) på /forslag.
  content.theme.accentColor = site.accent_color || content.theme.accentColor;
  content.theme.secondaryColors =
    site.secondary_colors?.length ? site.secondary_colors : content.theme.secondaryColors;
  content.theme.backgroundMode = "light";
  if (site.logo_url) content.logoUrl = site.logo_url;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) {
    content.socialLinks = site.social_links;
  }

  // Säkerställer att varje sida har minst en bildbärande sektion (hero
  // eller grid) innan vi delar ut kundens foton — annars kan en sida som
  // bara fick t.ex. about+contact hamna helt utan bild.
  const contentWithImageSlots = ensureImageSlots(content);

  // Egna uppladdade foton (steg 3) placeras deterministiskt i layouten i
  // kod — AI:n har inte sett eller valt dem.
  const { data: imageAssets, error: assetsError } = await supabase
    .from("site_assets")
    .select("file_url")
    .eq("site_id", site.id)
    .eq("kind", "image")
    .order("created_at", { ascending: true });

  // Loggas (syns i Vercels funktionsloggar) istället för att tyst falla
  // tillbaka på "inga bilder" — annars är ett riktigt databasfel omöjligt
  // att skilja från att kunden faktiskt inte laddat upp några foton.
  if (assetsError) {
    console.error("generate: kunde inte hämta site_assets", { siteId: site.id, error: assetsError });
  }
  // Loggas alltid (inte bara vid fel) så vi kan se i Vercels loggar exakt
  // hur många bilder som faktiskt hittades för en given sajt, utan att
  // behöva gissa om kunden la till foton eller inte.
  console.log("generate: bilder hittade för sajt", {
    siteId: site.id,
    imagesFound: imageAssets?.length ?? 0,
  });

  const imageUrls = (imageAssets ?? []).map((a) => a.file_url);
  const finalContent = assignUploadedImages(contentWithImageSlots, imageUrls, site.hero_image_url);

  // Inspirationsbilderna (skärmdumpar av ANDRA sajter kunden visat som
  // referens) har nu gjort sitt jobb — de användes ovan bara för att styra
  // layoutvalet, aldrig som bilder i den färdiga sajten. Vi lovar kunden att
  // de inte sparas kvar, så vi städar bort dem ur Storage och tömmer fältet
  // i samma veva som sajtens innehåll sparas. (Skulle själva AI-anropet
  // eller spar-steget ovan fela innan vi når hit lämnas bilderna kvar, så
  // kunden slipper ladda upp dem på nytt vid ett omförsök.)
  const inspirationUrls: string[] = Array.isArray(site.inspiration_image_urls)
    ? site.inspiration_image_urls
    : [];
  if (inspirationUrls.length > 0) {
    const paths = inspirationUrls
      .map((url) => {
        const marker = "/uploads/";
        const idx = url.indexOf(marker);
        return idx >= 0 ? url.slice(idx + marker.length) : null;
      })
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from("uploads").remove(paths);
      if (removeError) {
        console.error("generate: kunde inte radera inspirationsbilder", {
          siteId: site.id,
          error: removeError,
        });
      }
    }
  }

  const { error: saveError } = await supabase
    .from("sites")
    .update({ content: finalContent, status: "draft", inspiration_image_urls: [] })
    .eq("id", site.id);

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({ ok: true, siteId: site.id });
}
