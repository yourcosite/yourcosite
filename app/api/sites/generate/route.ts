import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { summarizeInspirationLinks, fetchInspirationImages } from "@/lib/inspiration";
import { assignUploadedImages } from "@/lib/assignUploadedImages";
import { ensureImageSlots, enforceHomepageImageRichness, dedupeMaps } from "@/lib/ensureImageSlots";
import { ensureShowcaseSections } from "@/lib/showcaseContent";
import { getPinnedOrLatestSite } from "@/lib/supabase/onboardingSite";
import { SITE_CONTENT_PROPERTIES, SITE_CONTENT_REQUIRED } from "@/lib/siteContentSchema";

// Sajtgenerering kan ta längre än Vercels standardtimeout (10s) eftersom
// Claude ska skriva texter för flera sidor i ett svar. Förlänger till 60s.
export const maxDuration = 60;

// JSON-schemat för verktyget vi tvingar Claude att svara med (delat med
// /api/sites/edit — se lib/siteContentSchema.ts). Genom att låta AI:n
// "ringa" ett verktyg istället för att bara skriva fritext får vi
// garanterat giltig, strukturerad JSON tillbaka — aldrig rå HTML och aldrig
// fält utanför vår innehållsmodell (se lib/contentModel.ts).
const GENERATE_TOOL = {
  name: "generate_site",
  description: "Skapar det strukturerade innehållet för en helt ny kundsajt.",
  input_schema: {
    type: "object" as const,
    properties: SITE_CONTENT_PROPERTIES,
    required: SITE_CONTENT_REQUIRED,
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
  "fade-bottom",
  "fade-bottom",
];

// Hero-layouten för SIDOR UTANFÖR startsidan — startsidan har sin egen,
// mer utförliga instruktion ovan (prioriterar inspirationsbilder/-länkar
// före den här poolen), men undersidornas hero fick annars ingen egen
// "luta åt"-knuff alls och tenderade att alltid landa på samma val. Jämnare
// fördelning än hemsidans pool eftersom "wow-intrycket" inte är lika
// viktigt där.
const SUBPAGE_HERO_LAYOUT_POOL = ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom"];

const LAYOUT_TENDENCY_POOL = [
  "renare och mer återhållsam — luta åt layouter som \"centered\", \"list\" och \"single-quote\" där det passar",
  "dynamisk och bildtung — luta åt layouter som \"split-left\"/\"split-right\", \"alternating-rows\" och \"numbered\" där det passar",
  "en jämn blandning, utan tydlig slagsida åt någotdera hållet",
];

// Samma mönster som HOME_HERO_LAYOUT_POOL ovan, men för de ÖVRIGA
// sektionstyperna — annars tenderade Claude att alltid välja samma "säkra"
// layout per sektionstyp (t.ex. alltid "cards" för grid) oavsett kund, vilket
// var en stor del av varför genererade sajter kändes mallade/lika. En av
// varje pool slumpas fram PER GENERERING och vävs in som en knuff i
// prompten nedan — fortfarande "luta åt", aldrig en regel som trumfar vad
// kunden faktiskt skrivit.
const GRID_LAYOUT_POOL = ["cards", "alternating-rows", "list", "numbered", "bento", "icon-row", "divided-columns", "intro-divided"];
const TESTIMONIALS_LAYOUT_POOL = ["single-quote", "carousel-row", "side-by-side", "full-bleed", "carousel-arrows"];
const CTA_LAYOUT_POOL = ["centered", "split", "image-bleed", "dark-split"];
const CONTACT_LAYOUT_POOL = ["centered", "split-info"];
const GALLERY_LAYOUT_POOL = ["grid", "carousel"];
const ABOUT_LAYOUT_POOL = ["text-left", "centered", "stats-split", "image-full", "image-stats"];
const FAQ_LAYOUT_POOL = ["stacked", "two-column"];
const MAP_LAYOUT_POOL = ["inline", "full-bleed"];

// VARFÖR DET HÄR BEHÖVS: prompt-knuffarna ovan (sectionLayoutLean) är bara
// en VÄDJAN till AI:n — och vi har sett i praktiken att språkmodeller
// ändå konvergerar mot samma "säkra" layout om och om igen, även när de
// uttryckligen ombeds variera (samma anledning till att
// enforceHomepageImageRichness i lib/ensureImageSlots.ts tvingar fram
// stora bilder i kod istället för att bara be om det). Men att TVINGA
// FRAM EN enda fast layout (som vi gjorde för förstasidans bildsektion)
// löser bildproblemet men gör designen helt deterministisk — varje
// omgenerering ser likadan ut, bara texten byts ut. Den här funktionen
// löser båda samtidigt: den SLUMPAR om layout-fältet för praktiskt taget
// alla sektioner EFTER att AI:n svarat, med en NY slumpning vid varje
// generering — så varje "skriv om alltihop" ger ett genuint annorlunda
// designförslag, inte bara nya ord i samma mall. Rör aldrig
// rubrik/text/bilder, bara layout-fältet.
//
// Förstasidans EGEN hero och dess FÖRSTA "grid"-sektion rörs inte här —
// de hanteras separat: hero via variantens egen känsla på /forslag (se
// lib/themeVariants.ts), och grid-sektionen tvingas ALLTID till "cards"
// (nedan) — det kompakta, "ingångar/kort"-intrycket från
// Restaurangen/Snickeriet i /exempel, inte stora staplade bild+text-rader.
// Förstasidans "testimonials" (om någon finns) tvingas separat till
// "full-bleed" av enforceHomepageImageRichness i lib/ensureImageSlots.ts,
// som körs EFTER den här funktionen och alltid vinner för just den
// sektionen — det är sidans dramatiska "stora bild"-moment. Allt annat —
// testimonials på undersidor, cta, contact, about, faq, map, gallery,
// EXTRA grid-sektioner, och hero på ALLA sidor utom förstasidan — är
// fritt att slumpas/variera.
function randomizeSectionLayouts(content: SiteContent, homePath: string): SiteContent {
  for (const page of content.pages) {
    const isHome = page.path === homePath;
    let sawFirstGridOnHome = false;

    for (const section of page.sections as any[]) {
      switch (section.type) {
        case "hero":
          if (!isHome) section.layout = pickRandom(SUBPAGE_HERO_LAYOUT_POOL);
          break;
        case "grid":
          if (isHome && !sawFirstGridOnHome) {
            // Medvetet FAST, aldrig slumpad — "cards" är den kompakta
            // ingångs-stil kunden faktiskt bad om (se kommentaren ovan
            // funktionen), inte en vädjan som "alternating-rows" annars
            // skulle kunna slå igenom som.
            section.layout = "cards";
            sawFirstGridOnHome = true;
          } else {
            section.layout = pickRandom(GRID_LAYOUT_POOL);
          }
          break;
        case "testimonials":
          section.layout = pickRandom(TESTIMONIALS_LAYOUT_POOL);
          break;
        case "cta":
          section.layout = pickRandom(CTA_LAYOUT_POOL);
          break;
        case "contact":
          section.layout = pickRandom(CONTACT_LAYOUT_POOL);
          break;
        case "gallery":
          section.layout = pickRandom(GALLERY_LAYOUT_POOL);
          break;
        case "about":
          section.layout = pickRandom(ABOUT_LAYOUT_POOL);
          break;
        case "faq":
          section.layout = pickRandom(FAQ_LAYOUT_POOL);
          break;
        case "map":
          section.layout = pickRandom(MAP_LAYOUT_POOL);
          break;
      }
    }
  }

  return content;
}

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
      ? `Kunden har bifogat ${inspirationImageCount} egna inspirationsbild${inspirationImageCount === 1 ? "" : "er"} i det här meddelandet (skärmdumpar/foton av sajter eller stilar de gillar) — det är din STARKASTE signal för layoutval, starkare än både ton/bransch och nedanstående riktlinjer. Titta noga på dem: har de en stor, framträdande bild/hero högst upp, välj layouten "overlay-bottom" (fullbred bild bakom menyn) för startsidans hero; känns de mer återhållsamma/textfokuserade, välj en lugnare layout som "centered" eller "fade-bottom" (bilden tonar mjukt ut i bakgrunden) istället.`
      : inspiration.heroImageSignal === "yes"
      ? `Kundens egna referenssajter har tydligt en stor, framträdande bild/hero högst upp på startsidan — gör likadant här: välj layouten "overlay-bottom" (fullbred bild bakom menyn, som stora hotell-/spa-sajter) för startsidans hero, om inget i kundens beskrivning starkt talar emot det.`
      : inspiration.heroImageSignal === "no"
      ? `Kundens egna referenssajter har INTE någon framträdande bild/hero högst upp — de är mer textfokuserade. Spegla det: välj en mer återhållsam layout för startsidans hero, t.ex. "centered" eller "fade-bottom", istället för en fullbred bilddominerad lösning, om inget i kundens beskrivning starkt talar emot det.`
      : `Som utgångspunkt för DEN HÄR sajten (ingen tydlig signal från referenser att utgå från): luta åt layouten "${pickRandom(HOME_HERO_LAYOUT_POOL)}" för startsidans hero om inget i kundens egna ord, bransch eller ton tydligt talar för en annan — men välj fritt bland "overlay-bottom" (fullbred bild bakom menyn, som stora hotell-/spa-sajter), "split-left"/"split-right", "centered" eller "fade-bottom" (bilden tonar mjukt ut i sidans bakgrund, inget hårt kant/kortintryck) om något av dem passar tydligt bättre.`;

  const suggestedTendency = pickRandom(LAYOUT_TENDENCY_POOL);

  // En slumpad "luta åt"-layout per sektionstyp, se poolerna ovan.
  // "hero" gäller bara SIDOR UTANFÖR startsidan — startsidans hero styrs
  // redan av den mer utförliga heroLayoutInstruction ovan.
  const sectionLayoutLean = [
    `"hero" (på andra sidor än startsidan): luta åt "${pickRandom(SUBPAGE_HERO_LAYOUT_POOL)}"`,
    `"grid": luta åt "${pickRandom(GRID_LAYOUT_POOL)}" där inget annat talar emot`,
    `"testimonials": luta åt "${pickRandom(TESTIMONIALS_LAYOUT_POOL)}"`,
    `"cta": luta åt "${pickRandom(CTA_LAYOUT_POOL)}"`,
    `"contact": luta åt "${pickRandom(CONTACT_LAYOUT_POOL)}"`,
    `"gallery": luta åt "${pickRandom(GALLERY_LAYOUT_POOL)}"`,
    `"about": luta åt "${pickRandom(ABOUT_LAYOUT_POOL)}"`,
    `"faq": luta åt "${pickRandom(FAQ_LAYOUT_POOL)}"`,
    `"map": luta åt "${pickRandom(MAP_LAYOUT_POOL)}"`,
  ].join("; ");

  const textFillInstruction =
    site.allow_ai_text_fill === false
      ? `VIKTIGT — texten ska hålla sig nära det kunden faktiskt skrivit: kunden har INTE godkänt att du fyller ut saknad information med egna påhittade detaljer. Utgå bara från briefen, beskrivningen och branschen ovan. Hitta inte på konkreta erbjudanden, historia, priser eller funktioner kunden inte nämnt. Där en sida eller sektion saknar underlag — håll texten kort, allmän och varumärkesneutral. UNDANTAG: de EXEMPELSEKTIONER som beskrivs i stycket om exempelinnehåll nedan (citat, nyckeltal, vanliga frågor) ska ändå finnas — de är tydliga platshållare som kunden byter eller tar bort.`
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

${textFillInstruction} Varje sida ska ha minst 2-3 sektioner som passar innehållet (t.ex. en hero längst upp, sedan about/grid/testimonials/cta/contact/gallery/faq/map/contactForm där det är relevant) — du väljer fritt vilka sektionstyper som passar varje sida bäst, så länge du håller dig till de sektionstyper verktyget stödjer. "gallery" (bildspel/galleri), "faq" (vanliga frågor), "map" (inbäddad karta) och "contactForm" (ett riktigt ifyllbart kontaktformulär) är valfria extrasektioner — lägg bara in dem där de faktiskt passar innehållet, inte på varje sajt.

VIKTIGT — en sida vars syfte (se briefen ovan) är att visa kundens EGNA nyheter/erbjudanden/uppdateringar (typiskt en sida som heter "Nyheter"): lägg till EXAKT EN "newsList"-sektion där (bara en rubrik, t.ex. "Senaste nytt") — hitta ALDRIG på enskilda nyheter/erbjudanden/inlägg som grid-rutor, testimonials eller annat innehåll på en sådan sida, även om det skulle fylla sidan bättre. Kunden har inga publicerade artiklar än vid det här laget (de skrivs och publiceras senare av kunden själv, se "newsList" i verktygets fältbeskrivning) — sidan ska bara ha en kort introduktion (t.ex. en hero/about-sektion) plus "newsList"-sektionen, och visar automatiskt "inga publicerade nyheter än" tills kunden skrivit sin första. Gäller INTE andra sidor — lägg ALDRIG till "newsList" på en sida vars syfte inte är just detta.

VIKTIGT — varje sida MÅSTE inledas med en "hero"-sektion (sidans bildplatser är "hero", "grid" och "gallery" — se till att minst EN till av dessa, utöver hero, finns på varje sida, så ingen sida blir bildlös förutom sin egen hero). En sida med bara "hero" följt av enbart textsektioner (about/testimonials/cta/faq/contact/map/contactForm) är INTE godkänt — lägg då till en "grid" eller "gallery"-sektion någonstans på sidan, även om innehållet annars känns klart.

VIKTIGT — förstasidans extra bildsektioner, EXAKT den stil som Restaurangen/Snickeriet i /exempel har ("snygg tonat längst upp, några ingångar, en bild som täcker hela bredden med text ovanpå, snyggt cleant"): (1) lägg till en "grid"-sektion med layout "cards" på förstasidan — några kompakta ingångar/kort (t.ex. tjänster, kategorier eller avdelningar) med en liten bild var, INTE stora staplade bild+text-rader; (2) lägg ÄVEN till en "testimonials"-sektion någonstans på förstasidan — den renderas med en EGEN stor bild som täcker hela sidans bredd med ett citat centrerat ovanpå, vilket är det dramatiska "stora bild"-momentet sajten annars saknar. Undvik "gallery" på FÖRSTASIDAN — dess små, kvadratiska rutnätsbilder (tänkt för en egen portfolio-/bildsida, t.ex. en sida som heter "Galleri" eller "Referensprojekt") ger ett tätt, katalogmässigt intryck som inte passar som själva entrén till sajten. "gallery" är bra på en sida vars enda syfte är att visa upp många bilder i rad — aldrig som bisak på förstasidan.

VIKTIGT — startsidans hero ska vara ett riktigt "wow"-intryck: det är besökarens första sekund på sajten. Skriv en kort, slagkraftig rubrik (inte en lång mening) och låt eyebrow/CTA dra blicken. ${heroLayoutInstruction}

VIKTIGT — fyll ÄVEN i headlineEmphasis och (om det finns verifierbara fakta) stats på startsidans hero-sektion, OAVSETT vilken layout du själv väljer för den — dessa fält används bara om kunden senare väljer en stilvariant som visar dem (t.ex. "Redaktionell och bildrik" eller "Ren och strukturerad" på /forslag), men ska finnas redo även då: headlineEmphasis är en kort, fristående fortsättning på rubriken (högst 4-5 ord, t.ex. rubrik "Skräddarsydda kök" + headlineEmphasis "byggda för att leva i"). stats är 2-3 korta, SANNA nyckeltal — använd kundens egna fakta om de finns (grundat år, antal anställda/orter, certifiering, t.ex. "Familjeägt sedan 2014"), annars hitta på rimliga EXEMPELnyckeltal som passar branschen (t.ex. "12 år" / "600+" nöjda kunder / "4,9" i betyg) — se stycket om exempelinnehåll nedan.

VIKTIGT — variation mellan olika kunder, i den här prioritetsordningen: (1) kundens egen beskrivning och eventuella referenslänkar väger TYNGST — strukturen ovan och bransch-/tonval nedan ska i första hand komma från vad KUNDEN faktiskt visat och skrivit, inte hittas på; (2) saknas tydliga signaler där, luta generellt åt en ${suggestedTendency} för den här sajten. Två sajter i samma bransch och ton ska ändå inte kunna förväxlas — variera aktivt layoutval, sektionsordning och vilka sektionstyper som används mellan olika sidor/kunder.

VIKTIGT — layout per sektion: varje sektion har ett obligatoriskt "layout"-fält med ett fåtal fördefinierade uppbyggnader (se verktygets schema för giltiga värden per sektionstyp). Välj layout utifrån företagets ton, bransch, beskrivning och eventuell inspiration — inte slumpmässigt och inte alltid samma. Två kunder med samma ton ska ändå kunna hamna olika beroende på vad de själva beskrivit. Variera gärna layout MELLAN sektionerna på samma sida också (t.ex. inte bild-vänster på alla sektioner) så sidan känns komponerad snarare än mallad. Riktlinjer, inte regler att följa slaviskt: en lugn/professionell ton passar ofta renare layouter ("centered", "list", "single-quote"), en personlig/lekfull ton passar ofta mer dynamiska ("split-left/right", "alternating-rows", "numbered"), men låt alltid kundens egna ord väga tyngst. Saknas en tydlig signal från kunden för en given sektionstyp, använd den här slumpade knuffen som utgångspunkt istället för att alltid välja samma "säkra" layout: ${sectionLayoutLean}.

VIKTIGT — EXEMPELINNEHÅLL (medvetet beslut): kunden vet ofta inte vilka sektioner och element som finns, och det är mycket lättare att ta bort något än att föreställa sig det. Därför ska förstasidan ALLTID visa upp bredden, även när kundens brief saknar underlag: (a) en "testimonials"-sektion med 3 påhittade, trovärdiga och branschanpassade kundcitat (kort, konkret, vardagligt språk) med förnamn + initial som "author"; (b) en "about"-sektion på förstasidan med "stats" (3 påhittade men rimliga nyckeltal, t.ex. år i branschen, antal nöjda kunder, betyg); (c) "stats" även på hero; (d) en "faq"-sektion med 3 branschanpassade frågor och svar; samt grid och cta som vanligt. Skriv exemplen som om de vore äkta så att sajten ser komplett ut — kunden byter eller tar bort det de inte vill ha. Begränsa inte urvalet: hellre fler olika sektionstyper än färre. Gäller bara exempelcitat, nyckeltal och vanliga frågor — hitta fortfarande inte på verkliga priser, erbjudanden eller historia.

Anropa verktyget "generate_site" med hela resultatet.`;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  // Samma sajt kunden faktiskt fyllde i (sidor, foton, logga m.m.) i
  // onboardingen — inte bara "senaste utkastet" rakt av, som kunde peka fel
  // om kontot hade fler halvfärdiga utkast samtidigt. Till skillnad från
  // onboardingens egna steg funkar det här ÄVEN när sajten redan har fått
  // sitt innehåll satt av en tidigare generering (kunden ber YourCoSite
  // skriva om alltihop från /forslag) — se getPinnedOrLatestSite.
  const site = await getPinnedOrLatestSite(supabase, user.id);

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
  // Fördelar förstasidans olika sektionsordningar på förslagen (se
  // lib/homeRecipes.ts) — ny slumpning vid varje generering.
  content.layoutSeed = Math.floor(Math.random() * 1000);
  if (site.logo_url) content.logoUrl = site.logo_url;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) {
    content.socialLinks = site.social_links;
  }

  // Slumpar om layout per sektion i kod (se randomizeSectionLayouts ovan)
  // så varje omgenerering ger ett genuint nytt designförslag, inte bara
  // ny text i samma mall — sedan: säkerställer att varje sida har minst
  // en bildbärande sektion (hero eller grid) innan vi delar ut kundens
  // foton, och tvingar till sist fram förstasidans bildstarka intryck.
  // ensureShowcaseSections fyller förstasidan med exempelcitat/nyckeltal/
  // frågor om AI:n inte skrev några — förslagen ska visa upp vad som finns.
  const contentWithImageSlots = enforceHomepageImageRichness(
    ensureImageSlots(dedupeMaps(ensureShowcaseSections(randomizeSectionLayouts(content, "/"), site.name)))
  );

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
