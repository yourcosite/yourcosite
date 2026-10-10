import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, isValidSitePage, type SiteContent, type SitePageContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { EDIT_PATCH_PROPERTIES, EDIT_PATCH_REQUIRED } from "@/lib/siteContentSchema";
import { normalizeCategory, uniqueSlugForSite, getSiteNewsCategories, type NewsArticle } from "@/lib/newsArticles";
import { isUnsplashImageUrl, unsplashKey, withCredit, UNSPLASH_PROFILE_PREFIX } from "@/lib/stockPhotos";
import { isSkinId } from "@/lib/skins";
import { dedupeMaps } from "@/lib/ensureImageSlots";

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
      newsArticle: {
        type: "object",
        description:
          "Skapar en NY nyhetsartikel (tabellen site_news_articles, skild från sajtens sidinnehåll) utifrån det kunden skrivit och/eller bifogat i DET HÄR meddelandet. Används ENDAST när kunden uttryckligen bett om att skapa/skriva/publicera en nyhet/artikel/inlägg. Utelämna annars helt — även om meddelandet nämner ordet \"nyhet\" i förbigående.",
        properties: {
          title: {
            type: "string",
            description:
              "Artikelns rubrik. Använd EXAKT vad kunden skrev som rubrik, eller den tydliga rubriken/första raden i ett bifogat dokument. Har kunden bara skrivit en kort text utan rubrik (eller bett dig utöka/skriva om den), skriv själv en kort, tydlig rubrik (högst ca 8 ord) och en ingress utifrån texten. Finns ingen text alls att utgå från, utelämna HELA \"newsArticle\"-objektet och fråga vad nyheten ska handla om i \"summary\".",
          },
          excerpt: {
            type: "string",
            description: "En kort sammanfattande mening (visas i artikellistan) — du får formulera den själv utifrån texten.",
          },
          body: {
            type: "string",
            description:
              "Artikelns brödtext, i stycken separerade med tomrad. Använd kundens egen text (skriven i meddelandet eller ett bifogat dokument) om sådan finns — korrigera bara uppenbara stavfel, skriv inte om innehållet. Saknas egen text helt (kunden bad bara \"skriv en nyhet om X\"), skriv en kort, professionell text utifrån det kunden beskrev. Ber kunden dig utöka eller skriva om en kort text de skrivit, gör det och behåll deras fakta.",
          },
          category: {
            type: "string",
            description:
              "Vilken kategori artikeln hör till — se listan över sajtens befintliga kategorier (inklusive standardförslagen Nyheter/Erbjudanden/Evenemang) längre ner i din instruktion. Matcha en BEFINTLIG kategori EXAKT (samma stavning/versalisering) om kunden syftar på samma sak, annars kan du sätta en helt ny kategori med kundens egen benämning. Är kategorin oklar, utelämna HELA \"newsArticle\"-objektet och fråga i \"summary\" istället (lista då sajtens befintliga kategorier som förslag).",
          },
          published: {
            type: "boolean",
            description:
              "true om kunden uttryckligen vill publicera direkt (t.ex. \"publicera\", \"lägg upp nu\"). false (eller utelämnat) om de vill spara som utkast, eller inte sagt något om det — nämn då i \"summary\" att de kan publicera den på Nyheter-sidan i panelen när de är nöjda.",
          },
        },
        required: ["title", "body", "category"],
      },
      summary: {
        type: "string",
        description:
          "En kort mening på svenska, riktad direkt till kunden (t.ex. \"Bytte rubriken och gjorde texten kortare.\"), som beskriver vad som ändrades — eller varför inget ändrades om önskemålet inte gick att utföra.",
      },
      exampleContentResolved: {
        type: "boolean",
        description:
          "Sätt till true när kundens önskemål innebär att ALLA exempelcitat, exempelnyckeltal och exempelfrågor på förstasidan nu är bortbytta eller borttagna (så sajten inte längre innehåller våra påhittade exempel). Annars utelämna.",
      },
      clarifyOptions: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
        description:
          "Använd när kundens önskemål är så pass otydligt att du annars skulle behöva gissa (t.ex. \"gör den snyggare\", flera sektioner passar in, eller flera rimliga tolkningar finns). Då gör du INGA ändringar (utelämna changedPages/theme helt) och ställer din fråga i \"summary\", plus 2-4 korta, tydliga svarsalternativ här som kunden kan klicka på. Varje alternativ ska vara ett KOMPLETT önskemål som går att skicka som det är, skrivet som kunden själv skulle skriva det (t.ex. \"Gör rubriken större på startsidan\"), inte \"Alternativ 1\". Sätt det mest sannolika först. Använd det sparsamt — bara när en gissning riskerar att bli fel, aldrig när önskemålet är tydligt.",
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
  pageOrder?: string[];
  changedPages?: SitePageContent[];
  removedPagePaths?: string[];
  newsArticle?: {
    title: string;
    excerpt?: string;
    body: string;
    category: string;
    published?: boolean;
  };
  summary: string;
  clarifyOptions?: string[];
  exampleContentResolved?: boolean;
  unsupported?: boolean;
};

type Attachment = {
  credit?: { name: string; profileUrl: string };
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
  selection: Selection | undefined,
  existingNewsCategories: string[]
) {
  const pagePaths = content.pages.map((p) => `${p.path} ("${p.label}")`).join(", ");
  const currentPage = currentPath ? content.pages.find((p) => p.path === currentPath) : undefined;
  const currentPageNote = currentPage
    ? `\nKunden tittar just nu på sidan "${currentPage.path}" ("${currentPage.label}") i förhandsvisningen. Är önskemålet oklart om VILKEN sida det gäller (t.ex. "byt rubriken" utan att nämna sida), anta med STOR sannolikhet att det är den här sidan, inte en annan.\n`
    : "";
  // Vad den markerade sektionen faktiskt ÄR (typ + layout), så Millie inte
  // behöver gissa vilken sektion "den här" syftar på.
  const selSection = selection
    ? (content.pages.find((p) => p.path === selection.pagePath)?.sections.find((sec) => sec.id === selection.sectionId) as any)
    : undefined;
  const selSectionInfo = selSection
    ? ` Sektionen är av typen "${selSection.type}"${selSection.layout ? ` med layouten "${selSection.layout}"` : ""}${selSection.heading ? ` och rubriken "${selSection.heading}"` : ""}.`
    : "";
  const selectionNote =
    selection?.target === "image"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en specifik bild i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"${
          selection.kind === "gridItem" || selection.kind === "galleryItem"
            ? `, rutan med index ${selection.itemIndex} i den sektionens "items"-lista`
            : ""
        }). Handlar önskemålet om att byta, ta bort eller ändra "bilden"/"bilden ovan" utan att tydligt peka ut en annan bild, syftar kunden med STOR sannolikhet på just DEN markerade bilden — gör då ändringen på exakt den noden, inte på en annan bild på sidan.${selSectionInfo}\n`
      : selection?.target === "field"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT ETT SPECIFIKT textfält i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}", fältet "${selection.field}" — matchar exakt den egenskapen i innehållsmodellen, t.ex. "headline" eller "items.1.title" för rad 2 i en lista). Önskemålet gäller med STOR sannolikhet att ändra EXAKT det fältet (hela dess nya text, inte bara en del), inte något annat fält i samma eller en annan sektion — gör då ändringen bara där.${selSectionInfo}\n`
      : selection?.target === "section"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en hel sektion i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"). ${selSectionInfo} Kunden har valt den för att det är DÄR ändringen ska göras: alla önskemål som inte uttryckligen nämner ett annat ställe ("lägg en bild bredvid texten", "gör den större", "byt färg", "lägg till en knapp") gäller DEN markerade sektionen — rör ALDRIG en annan sektion (t.ex. hero) när något är markerat, om inte kunden uttryckligen nämner den. Passar önskemålet inte sektionens typ (t.ex. bild bredvid text i en sektion som inte kan visa bild), följ regeln om bild bredvid en textruta nedan: gör om just DEN sektionen eller förklara i "summary" — flytta aldrig ändringen till en annan sektion.\n`
      : "";
  return `Du redigerar en BEFINTLIG kundwebbplats hos YourCoSite. Nedan är sajtens NUVARANDE innehåll som JSON, bara som underlag för dig — du skriver INTE ut det igen (innehållsmodellen i lib/contentModel.ts):

${JSON.stringify(content, null, 2)}

Sajtens sidor just nu: ${pagePaths}
${currentPageNote}${selectionNote}${attachmentNote}
Kundens önskemål just nu: "${message}"

Uppdatera ENDAST det som faktiskt behövs för att uppfylla önskemålet.

VIKTIGT — svara smalt: lägg i "changedPages" ENDAST de hela sidobjekt (path, label, alla sektioner) som denna ändring faktiskt påverkar. Rör en ändring bara EN sida, ta bara med den sidan — skriv INTE ut sajtens övriga, oberörda sidor, de lämnas automatiskt som de är. Gäller ändringen en sektion mitt på en sida, skriv ut HELA den sidans sektionslista (med den ändrade sektionen uppdaterad och resten oförändrad), inte bara den enskilda sektionen. Utelämna "theme" helt om inget färgtema-/typsnittsbyte efterfrågades.

VIKTIGT — bilder: rör ALDRIG ett befintligt "imageUrl"-värde (varken ta bort, byta ut eller hitta på ett nytt) om inte kunden uttryckligen bett om en bildändring du inte kan utföra på annat sätt — de sätts av vårt system utifrån kundens egna uppladdade foton, aldrig av dig. Flyttas en sektion följer dess imageUrl med. Lägger du till en helt ny sektion som behöver en bild, UTELÄMNA "imageUrl" helt för den (ingen påhittad url, ingen tom sträng) — en snygg platshållare visas automatiskt istället.

VIKTIGT — knapplänkar: hero- och cta-sektioner kan ha ett "ctaLink". Ber kunden att en knapp ska leda till en av sajtens sidor, sätt ctaLink till exakt den sidans "path" (se listan ovan) — hitta aldrig på en sökväg som inte finns där. Ber kunden om en extern länk, använd en fullständig URL (https://...). Vill kunden att knappen inte ska gå att klicka på, utelämna ctaLink helt. Samma gäller de små "Läs mer →"-raderna: i en about-sektion (layouterna "image-full"/"image-stats") sätts länken i sektionens "ctaLink", och i en grid-sektion (layouterna "divided-columns"/"intro-divided") i det enskilda objektets "link" i "items" (räkna ut VILKET objekt kunden menar, rör inte de andra). Samma regler för värdet (exakt sidpath eller fullständig URL). Skriver du om en sektion av annan anledning ska redan satta ctaLink/link följa med oförändrade, precis som imageUrl.

VIKTIGT — bakgrundsfärg på EN enskild sida (t.ex. "gör Om oss-sidan svart/mörk"): detta STÖDS, via "backgroundMode" på sidobjektet i "changedPages" — se verktygets fältbeskrivning. Välj det av de tre lägena (light/warm/dark) som bäst matchar vad kunden bad om, texten justeras automatiskt. Gäller önskemålet istället HELA sajtens färgtema (t.ex. "byt till svart genomgående" eller bara "byt accentfärg"), använd "theme" högst upp som vanligt, inte detta fält.

VIKTIGT — exempelinnehåll: förstasidan kan innehålla EXEMPELcitat, exempelnyckeltal ("stats") och exempelfrågor som vi satt dit för att visa vad som finns${content.exampleContent ? " (den här sajten har sådana)" : ""}. Ber kunden dig ta bort/byta dem ("ta bort citaten", "jag har inga såna siffror", "skriv egna omdömen") — gör det direkt: ta bort hela sektionen eller utelämna "stats". Skriver kunden egna citat/siffror, använd EXAKT kundens ord.

VIKTIGT — ändra layout på en sektion ("visa tjänsterna som en lista", "gör Om oss med en stor bild"): byt sektionens "layout"-värde till ett giltigt för den sektionstypen (se verktygets schema) och behåll allt annat innehåll, alla bgColor/ctaColor/ctaLink/link och imageUrl oförändrade. Pekar kunden ut en markerad sektion, ändra just den. Välj layouten som bäst matchar ordvalet (t.ex. "lista" → "list", "stor bild" → "image-full", "siffror" → "stats-split"). Saknar sektionen innehåll en ny layout behöver (t.ex. nyckeltal), fyll i rimliga EXEMPELvärden.

VIKTIGT — flytta/ordna om: "flytta citaten högst upp" = skriv ut sidans sektioner i den nya ordningen i changedPages (hero ska alltid ligga först, och sidans kontakt/cta nära slutet om inget annat sägs). "Lägg Kontakt före Nyheter i menyn"/"byt ordning på sidorna" = ange "pageOrder" med ALLA sidors path i ny ordning; startsidan ("/") ska normalt vara först. Ändra inget annat än ordningen.

VIKTIGT — utseendereglage för hela sajten, i "theme": "buttonStyle" (pill/square/underline = runda, kantiga, understrukna knappar), "headerLayout" (left/centered-stacked/split = menyns placering), "sectionSpacing" (compact/normal/airy = tätare/standard/luftigare). Ange bara det kunden bett om.

VIKTIGT — kontrollfrågor: är önskemålet så oklart att du måste gissa (t.ex. "gör det snyggare", "ändra rubriken" när flera rubriker finns, eller flera helt olika tolkningar är rimliga) — gissa inte. Ställ en kort fråga i "summary" och ge 2-4 klickbara svar i "clarifyOptions" (kompletta önskemål, mest sannolikt först), och gör INGA ändringar. Fråga bara när en felgissning skulle märkas eller vara jobbig att ångra; är det tydligt nog, utför det direkt. ${selection ? "Kunden har just nu MARKERAT något i förhandsvisningen (se ovan) — då vet du redan VAR ändringen ska göras, så fråga ALDRIG var eller vilken sektion/text/rubrik; utför ändringen på det markerade direkt. Fråga högst om själva ändringen, och bara om den verkligen inte går att tolka." : ""} Meddelanden kan vara dikterade med rösten: de är ofta korta, utan skiljetecken och informella ("gör den lite större", "byt till mer personlig") — tolka dem välvilligt och handla hellre än att fråga. Ställ aldrig två kontrollfrågor i rad om samma sak — har kunden redan svarat på din fråga, utför det.

VIKTIGT — bild BREDVID en textruta ("lägg en bild bredvid texten", "bild till höger om rutan"): bara vissa sektioner kan visa en bild. En Om oss-sektion ("about") får det med layouten "image-right" (bild till höger) eller "image-left" (bild till vänster) — byt layout till en av dem och sätt "imageUrl" (kundens bifogade bild, exakt adress) på sektionen; saknas en bild, byt ändå layouten (en snygg platshållare visas) och be kunden bifoga en bild. En hero med layouterna "split-left"/"split-right" har också en bild bredvid texten. Sektionerna "cta", "contactForm", "faq" och citat-sektioner kan INTE visa en bild bredvid texten (centrerad text utan bildplats ritar aldrig ut en bild). Gäller önskemålet en sådan sektion: sätt aldrig "imageUrl" och påstå inte att du lagt till en bild — gör antingen om den till en Om oss-sektion med bild bredvid (behåll rubrik och text) om det passar, eller förklara kort i "summary" att det inte går och föreslå det. Skriv ALDRIG att en bild lagts till om den inte syns med den layout sektionen nu har.

VIKTIGT — tätare/luftigare på EN sektion och textjustering: ber kunden om tätare eller luftigare avstånd (mindre/mer luft) på en enskild sektion ("gör den här sektionen tajtare"), sätt "spacing" på just den sektionen — compact = tätare, airy = luftigare, normal = tillbaka till sajtens vanliga. Pekar kunden ut en markerad sektion, ändra just den; annars den som beskrivs. Rör ALDRIG theme.sectionSpacing för en enskild sektion, och inga andra sektioner. Hero-sektionen har inget justerbart avstånd — förklara det kort i "summary" om kunden ber om det. Ber kunden om vänster-, höger- eller mittjusterad text ("centrera texten", "vänsterställ rubriken och texten", "högerjustera"), sätt "textAlign" (left/center/right) på sektionen/sektionerna det gäller; "på hela sidan" = alla den sidans sektioner, "på hela sajten" = "theme.textAlign" (auto tar bort). Texten, bilderna och allt annat i sektionen lämnas oförändrat. Har ett rutnät färre rutor än kolumner (t.ex. två rutor kvar i en rad om tre) centreras rutorna automatiskt; "textAlign" left/right på den sektionen lägger dem istället till vänster/höger. Skriver du om en sektion av annan anledning ska redan satta "spacing"/"textAlign" följa med oförändrade. Nuvarande sajtinställning för text: ${content.theme.textAlign ?? "mallens egen"}.

VIKTIGT — sökmotorer och delning: ber kunden om bättre Google-text/"så sidan syns i sökningar"/delningstext, sätt "seoTitle" (under 60 tecken, sidans viktigaste sökord + gärna företagsnamn) och "seoDescription" (120-155 tecken, sann och lockande) på sidan/sidorna det gäller i changedPages — och skriv ut resten av sidan oförändrad. Gäller önskemålet "alla sidor", gör det för alla sidor (det är en liten ändring). Hitta inte på fakta om verksamheten, utgå från sidans egen text.

VIKTIGT — ton och omskrivning, EN SIDA I TAGET: ber kunden dig skriva om texten i en annan ton ("mer personligt", "kortare", "mer formellt") — gör det BARA på en sida per svar: den sida kunden pekar ut, annars sidan de tittar på just nu (se ovan). Rör aldrig fler sidor med en tonändring, även om kunden skriver "hela sajten". Avsluta "summary" med en vänlig fråga om vilken sida du ska ta härnäst (nämn gärna nästa sida vid namn). Bevara fakta, namn, siffror, länkar, bilder och struktur — bara formuleringarna ändras.

VIKTIGT — typografi och färgpaket för HELA sajten: ber kunden om en annan stil/känsla ("gör den mörk och elegant", "fetare typsnitt", "mjukare och pastell", "byt typografi") — sätt "theme.skin" till det av paketen som passar bäst (se fältets beskrivning; "ingen" går tillbaka till det vanliga temat). Ber kunden om större eller mindre rubriker ("gör rubrikerna större") — sätt "theme.headingScale" (utgå från nuvarande värde om det finns, annars 1). Ange bara de theme-delfält som ändras. Kundens accentfärg behålls av alla paket. Nuvarande paket: "${content.theme.skin ?? "ingen"}", rubrikskala: ${content.theme.headingScale ?? 1}.

VIKTIGT — färg på EN ENSKILD sektion, ruta/kort eller knapp (t.ex. "gör bara den sektionen mörkblå", "färga mittenrutan orange", "gör knappen i kontaktsektionen grön"): till skillnad från bakgrundsfärg på en HEL sida (backgroundMode, se ovan) eller HELA sajtens tema ("theme.accentColor"/"theme.secondaryColors") finns tre separata, FRIA hex-färgfält för exakt den här mindre skalan:
  • "bgColor" på VILKEN sektion som helst (hero/about/grid/testimonials/cta/contact/gallery/faq/map/contactForm/newsList) — sätt den BARA på den/de sektioner kunden uttryckligen pekar ut, aldrig på hela sidan eller sajten.
  • "bgColor" på ETT enskilt objekt i en grid-sektions "items" (en "ruta"/"kort" bland flera, t.ex. "mittenrutan" eller "den tredje"). Räkna ut VILKET index kunden menar utifrån sammanhanget (ordningsföljden i items, eller rubriken/texten de nämner) och sätt "bgColor" bara på det objektet — rör inte de andra.
  • "ctaColor" på en enskild knapp — hero- och cta-sektioner samt grid-sektionens egen knapp (layout "intro-divided") kan ha en egen "ctaColor", oberoende av sajtens accentfärg.
Alla tre tar en fri hex-färg ("#RRGGBB", eller ett vanligt färgnamn du själv översätter till hex, t.ex. "orange" → "#F97316") — till skillnad från backgroundMode (bara tre fasta, alltid kontrastsäkra lägen) väljer du HÄR exakt den nyans kunden bad om; text-/kortfärgen runt den räknas ut automatiskt så den alltid syns, du behöver inte själv tänka på kontrast. Ändringen gäller BARA den utpekade ytan — resten av sektionen/sidan/sajten är orörd. Vill kunden ta BORT en sådan enskild färg (gå tillbaka till det vanliga temat), utelämna fältet helt i ditt svar (sätt INTE en tom sträng). VIKTIGT: till skillnad från "backgroundMode" (som bevaras automatiskt av vårt system om du utelämnar det) ingår "bgColor"/"ctaColor" i sektionens/rutans EGNA fält — skriver du om en sektion eller ruta av en helt annan anledning (t.ex. bara ändrar rubriken) måste du skriva med dess REDAN satta bgColor/ctaColor precis som den var, annars försvinner färgen av misstag. Samma regel som för "imageUrl" ovan.

VIKTIGT — kartsektion ("map"): fältet "address" ska vara EXAKT den adress kunden gett dig (gata, postnummer, ort) — hitta ALDRIG på en adress. Saknar kunden en adress att ange, fråga efter den i "summary" istället för att lägga till sektionen med en påhittad adress.

VIKTIGT — video ("video"-sektion): ber kunden att få en YouTube-video inbäddad och GER dig en länk, lägg till en "video"-sektion med "videoUrl" satt till EXAKT den länk kunden gav (vilken YouTube-länkform som helst fungerar) — hitta ALDRIG på en länk eller ett video-id. Saknas länken, fråga efter den i "summary" istället för att lägga till sektionen. Bara YouTube stöds; ber kunden om Vimeo eller annan videotjänst, förklara det kort i "summary" (och sätt "unsupported" till true). Placera sektionen där kunden vill ha den; "full-bleed" om kunden vill ha den över hela bredden.

VIKTIGT — sektioner läggs ALLTID under varandra, ALDRIG bredvid varandra, oavsett typ (en sida är en enkel lista av sektioner, inget rutnät av sektioner). Ber kunden om "X och Y bredvid varandra" eller "i samma sektion/rad" där X/Y är två OLIKA sektionstyper, finns bara EN kombination som faktiskt stöds: ett kontaktformulär med en karta bredvid — sätt då "contactForm"-sektionens "layout" till "split-map" och fyll i dess "address" (samma regel som för "map" ovan: EXAKT kundens adress, aldrig påhittad), ISTÄLLET FÖR en separat "map"-sektion. Har kunden redan en separat "map"-sektion med samma adress när de ber om detta, ta bort den (lägg inte till dess path i "changedPages" igen, eller skriv ut sidans sektionslista utan den) så det inte blir dubbelt. Någon annan kombination av sektioner sida vid sida går inte att göra — förklara det kort i "summary" och föreslå att lägga dem efter varandra istället.

VIKTIGT — nyhetssektionen ("newsList"): visar kundens PUBLICERADE nyhetsartiklar som ett rutnät på en sida — själva sektionen innehåller inga artiklar, bara en rubrik. Ber kunden om en nyhetssida/nyhetssektion, lägg till "newsList"-sektionen på den sidan (högst en per sida).

VIKTIGT — skapa en nyhetsARTIKEL: det här går numera att göra direkt här i chatten, via det separata fältet "newsArticle" (skiljt från sajtens sidor — artiklar lagras för sig och visas via "newsList"-sektionen ovan). Använd det BARA när kunden uttryckligen ber om att skapa/skriva/publicera en nyhet/artikel, t.ex. "skriv en nyhet om att vi fått nya skor i lager" eller genom att bifogera text och/eller en bild med en begäran om att göra en nyhet av det. Rubrik får ALDRIG hittas på — se fältbeskrivningen. Saknas en tydlig rubrik eller är kategorin oklar, utelämna HELA "newsArticle" och fråga efter det som saknas i "summary" istället. Sajtens befintliga kategorier just nu: ${existingNewsCategories.join(", ")} — matcha en av dessa EXAKT om kunden syftar på samma sak, annars kan du sätta en ny kategori med kundens egen benämning (lista då gärna de befintliga som förslag om du istället behöver fråga). En bifogad bild används automatiskt som artikelns bild av vårt system — nämn inte bilden i "newsArticle" på något sätt, den hanteras utanför den här strukturen precis som andra bilder. Har kunden INTE bifogat någon bild alls, skapas artikeln helt enkelt utan bild. Schemalagd publicering går INTE att be om här i chatten än — vill kunden schemalägga, hänvisa till Nyheter-sidan i panelen istället. Skapar du en artikel samtidigt som kunden ber om en nyhetssida/nyhetssektion de inte redan har, lägg gärna till "newsList"-sektionen i samma svar också. ${content.pages.some((pg) => pg.sections.some((sec) => sec.type === "newsList")) ? "Sajten HAR en nyhetslista." : "Sajten har just nu INGEN nyhetslista — skapar du en artikel MÅSTE du i samma svar lägga till en \"newsList\"-sektion (på en befintlig nyhetssida om en finns, annars på en ny sida \"Nyheter\" med path \"/nyheter\"), annars syns artikeln inte för besökarna."} Ta ALDRIG bort en befintlig "newsList"-sektion eller nyhetssida om inte kunden uttryckligen ber om det — skriver du om en sida som innehåller en, ska den följa med oförändrad.

VIKTIGT — Google Analytics/Meta Pixel: ber kunden att koppla på Google Analytics eller Meta (Facebook) Pixel och GER dig ett ID i samma meddelande, sätt det i "gaMeasurementId" respektive "metaPixelId". Ber kunden om det men utan att ange något ID, svara i "summary" och be om ID:t istället — hitta aldrig på ett. Vill kunden koppla BORT en redan kopplad tagg, sätt motsvarande fält till en tom sträng. Scripten laddas bara in på sajten efter att besökaren godkänt "Alla cookies" i cookiebannern — nämn det kort om kunden undrar varför de inte ser något direkt i förhandsvisningen utan att godkänna den.

Svara alltid via verktyget "edit_site", plus ett kort "summary" riktat direkt till kunden.

Går önskemålet inte att utföra inom innehållsmodellen, eller är det för oklart för att agera på — gör INGA ändringar (utelämna "changedPages" eller lämna den tom) och förklara kort varför i "summary". Beror det specifikt på att innehållsmodellen saknar stöd (inte bara otydlighet), sätt även "unsupported" till true — det visar kunden en knapp för att skicka önskemålet vidare till oss.`;
}

function buildAttachmentNote(attachments: Attachment[]): string {
  if (attachments.length === 0) return "";
  const images = attachments.filter((a) => a.kind === "image");
  const documents = attachments.filter((a) => a.kind === "document");
  let note = "";

  if (images.length === 1) {
    const a = images[0];
    note += `\nKunden har bifogat en bild i det här meddelandet, "${a.name}" (visas för dig som bild). Dess permanenta webbadress — använd EXAKT den som "imageUrl" om kunden vill använda bilden någonstans på sajten, hitta aldrig på en annan — är: ${a.url}\nSätt bara in den om kundens meddelande faktiskt ber om att använda/lägga till/byta ut en bild med den. Är bilden bara skickad som referens (t.ex. en stilbild), beskriv den inte i onödan — fokusera på det kunden faktiskt skrev.\n`;
  } else if (images.length > 1) {
    const list = images.map((a, i) => `${i + 1}. "${a.name}": ${a.url}`).join("\n");
    note += `\nKunden har bifogat ${images.length} bilder i det här meddelandet (visas för dig i tur och ordning nedan). Deras permanenta webbadresser — använd EXAKT dessa som "imageUrl", hitta aldrig på andra — är:\n${list}\nBer kunden om ett bildgalleri/bildspel ("gallery") eller att lägga till flera bilder på en gång (t.ex. till en "grid"-sektion), använd bilderna i SAMMA ordning som listan ovan, en bild per rad i sektionens "items". Ber de istället om EN specifik bild någon annanstans på sajten (t.ex. hero), välj den de tydligast pekar ut i sitt meddelande — annars den första i listan. Är bilderna bara skickade som referens (t.ex. stilbilder), beskriv dem inte i onödan — fokusera på det kunden faktiskt skrev.\n`;
  }

  if (documents.length === 1) {
    const d = documents[0];
    const text = (d.text || "").trim();
    note += `\nKunden har bifogat dokumentet "${d.name}". Textinnehåll (kan vara avkortat):\n"""\n${text}\n"""\nAnvänd det som källa bara om kundens meddelande faktiskt ber om det (t.ex. "lägg in texten ovan", "sammanfatta det bifogade dokumentet som brödtext"). Hitta inte på innehåll utöver det du ser här eller det kunden själv skriver.\n`;
  } else if (documents.length > 1) {
    const blocks = documents.map((d) => `--- "${d.name}" ---\n${(d.text || "").trim()}`).join("\n\n");
    note += `\nKunden har bifogat ${documents.length} dokument i det här meddelandet. Textinnehåll (kan vara avkortat):\n"""\n${blocks}\n"""\nAnvänd dem som källa bara om kundens meddelande faktiskt ber om det. Hitta inte på innehåll utöver det du ser här eller det kunden själv skriver.\n`;
  }

  return note;
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
      changed
        ? {
            ...changed,
            backgroundMode: changed.backgroundMode ?? page.backgroundMode,
            // Samma sak för sökmotortitel/-beskrivning (seoTitle/seoDescription).
            seoTitle: changed.seoTitle ?? page.seoTitle,
            seoDescription: changed.seoDescription ?? page.seoDescription,
          }
        : page
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
  if (patch.theme) {
    // "ingen" = ta bort färg-/typografipaketet; okända värden ignoreras.
    const rawSkin = (patch.theme as { skin?: string }).skin;
    if (rawSkin !== undefined) {
      if (isSkinId(rawSkin)) merged.theme.skin = rawSkin;
      else if (rawSkin === "ingen") delete merged.theme.skin;
      else if (content.theme.skin) merged.theme.skin = content.theme.skin;
      else delete merged.theme.skin;
    }
    // Rubrikskala: begränsas till 0.7-1.6, 1 (standard) sparas inte alls.
    const rawScale = (patch.theme as { headingScale?: number }).headingScale;
    if (rawScale !== undefined) {
      const n = Number(rawScale);
      if (!Number.isFinite(n) || Math.abs(n - 1) < 0.02) delete merged.theme.headingScale;
      else merged.theme.headingScale = Math.min(1.6, Math.max(0.7, n));
    }
  }
  if (patch.theme) {
    const t = patch.theme as { buttonStyle?: string; headerLayout?: string; sectionSpacing?: string };
    if (t.buttonStyle !== undefined && !["pill", "square", "underline"].includes(t.buttonStyle)) {
      if (content.theme.buttonStyle) merged.theme.buttonStyle = content.theme.buttonStyle;
      else delete merged.theme.buttonStyle;
    }
    if (t.headerLayout !== undefined && !["left", "centered-stacked", "split"].includes(t.headerLayout)) {
      if (content.theme.headerLayout) merged.theme.headerLayout = content.theme.headerLayout;
      else delete merged.theme.headerLayout;
    }
    if (t.sectionSpacing !== undefined) {
      if (t.sectionSpacing === "compact" || t.sectionSpacing === "airy") merged.theme.sectionSpacing = t.sectionSpacing;
      else delete merged.theme.sectionSpacing;
    }
  }
  // Textjustering för hela sajten: "auto" tar bort, okända värden ignoreras.
  if (patch.theme) {
    const ta = (patch.theme as { textAlign?: string }).textAlign;
    if (ta !== undefined) {
      if (ta === "left" || ta === "center" || ta === "right") merged.theme.textAlign = ta;
      else if (ta === "auto") delete merged.theme.textAlign;
      else if (content.theme.textAlign) merged.theme.textAlign = content.theme.textAlign;
      else delete merged.theme.textAlign;
    }
  }
  // Sektionernas egna reglage (spacing/textAlign): ogiltiga värden ignoreras,
  // "normal" tar bort avståndsinställningen, och skriver Millie om en sektion
  // utan att nämna dem behålls det kunden redan har (samma id) — annars
  // skulle en ren textändring råka nollställa t.ex. ett tajtare avstånd.
  {
    const oldById = new Map<string, any>();
    for (const pg of content.pages) for (const sec of pg.sections) oldById.set(sec.id, sec);
    for (const pg of merged.pages) {
      for (const sec of pg.sections as any[]) {
        const old = oldById.get(sec.id);
        if (sec.spacing === undefined && old?.spacing) sec.spacing = old.spacing;
        if (sec.spacing !== undefined && sec.spacing !== "compact" && sec.spacing !== "airy") delete sec.spacing;
        // En NY bild på en Om oss-sektion vars layout inte kan visa någon
        // bild (t.ex. "centered") skulle annars sparas men aldrig synas —
        // byt då till layouten med bilden bredvid texten.
        if (
          sec.type === "about" &&
          sec.imageUrl &&
          sec.imageUrl !== old?.imageUrl &&
          !["image-full", "image-stats", "image-left", "image-right"].includes(sec.layout)
        ) {
          sec.layout = "image-right";
        }
        if (sec.textAlign === undefined && old?.textAlign) sec.textAlign = old.textAlign;
        if (sec.textAlign !== undefined && !["left", "center", "right"].includes(sec.textAlign)) delete sec.textAlign;
      }
    }
  }
  // Sidornas ordning (menyn): bara kända paths, resten läggs sist i sin
  // gamla ordning — en ofullständig lista får aldrig tappa en sida.
  if (Array.isArray(patch.pageOrder) && patch.pageOrder.length > 0) {
    const byPath = new Map(merged.pages.map((pg) => [pg.path, pg]));
    const ordered: SitePageContent[] = [];
    for (const path of patch.pageOrder) {
      const pg = byPath.get(path);
      if (pg) {
        ordered.push(pg);
        byPath.delete(path);
      }
    }
    merged.pages = [...ordered, ...merged.pages.filter((pg) => byPath.has(pg.path))];
  }
  // Sökmotortexter: trimmas och kortas (tom sträng = ta bort).
  for (const pg of merged.pages) {
    if (pg.seoTitle !== undefined) {
      const v = String(pg.seoTitle).trim().slice(0, 70);
      if (v) pg.seoTitle = v;
      else delete pg.seoTitle;
    }
    if (pg.seoDescription !== undefined) {
      const v = String(pg.seoDescription).trim().slice(0, 170);
      if (v) pg.seoDescription = v;
      else delete pg.seoDescription;
    }
  }
  // Startsidans stilaxlar (theme.heroLayout/aboutLayout/gridLayout/ctaLayout,
  // satta när kunden valde förslag) skriver över layouten på startsidans
  // FÖRSTA sektion av respektive typ. Ber kunden Millie byta layout på just
  // den sektionen skulle ändringen annars aldrig synas — då släpper vi axeln.
  {
    const oldHome = content.pages.find((pg) => pg.path === "/");
    const newHome = merged.pages.find((pg) => pg.path === "/");
    if (oldHome && newHome) {
      const axes = [
        ["hero", "heroLayout"],
        ["about", "aboutLayout"],
        ["grid", "gridLayout"],
        ["cta", "ctaLayout"],
      ] as const;
      for (const [type, axis] of axes) {
        if (!merged.theme[axis]) continue;
        const nu = newHome.sections.find((sec) => sec.type === type) as any;
        const old = nu ? (oldHome.sections.find((sec) => sec.id === nu.id) as any) : undefined;
        const oldEffective = old ? merged.theme[axis] : undefined;
        if (nu && old && nu.layout !== old.layout && nu.layout !== oldEffective) {
          delete merged.theme[axis];
        }
      }
    }
  }
  // Tomma strängar är kundens sätt att be Claude koppla BORT en tagg (se
  // promptens instruktion) — sparas aldrig som en tom sträng, fältet tas
  // bort helt istället, annars tolkar renderaren det som "sätt in en
  // Google Analytics-tagg med ID:t '' ". undefined (fältet utelämnat)
  // betyder "orört", inte "ta bort" — därför den uttryckliga kollen.
  if (patch.exampleContentResolved === true) delete merged.exampleContent;
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
  // Vilken av kundens (eventuellt flera) sajter redigeringen gäller — skickas
  // med från app/redigera/page.tsx. Se getCurrentPublishedSite för varför
  // den annars kunde träffa fel sajt på ett konto med flera.
  const siteId = typeof body.siteId === "string" ? body.siteId : null;

  // Flera bilagor på en gång (t.ex. en hel hög bilder till ett nytt
  // bildgalleri) — se handleFiles i app/redigera/page.tsx. Taket här är
  // samma som klientens MAX_ATTACHMENTS, bara som ett andra skydd.
  const rawAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : [];
  const attachments: Attachment[] = [];
  for (const rawAttachment of rawAttachments) {
    if (!rawAttachment || typeof rawAttachment !== "object") continue;
    const kind = rawAttachment.kind === "image" || rawAttachment.kind === "document" ? rawAttachment.kind : undefined;
    const url = typeof rawAttachment.url === "string" ? rawAttachment.url : "";
    // Säkerhetskoll: bilagan måste ligga i kundens egen uppladdningsmapp i
    // vår "uploads"-bucket — annars ignoreras den tyst istället för att
    // låta ett godtyckligt klientskickat objekt styra vad som skickas till
    // Claude (eller, för bilder, vilken extern URL som kan landa i en
    // sparad imageUrl).
    // Undantag: en stockbild från Unsplash (vald via sökningen i
    // chattredigeraren) — ligger på Unsplashs egen server, inte hos oss,
    // men bara just den värden släpps igenom, och bara som bild.
    const isStockPhoto = kind === "image" && isUnsplashImageUrl(url);
    if (kind && (isStockPhoto || url.includes(`/uploads/${user.id}/`))) {
      const rawCredit = rawAttachment.credit;
      const credit =
        isStockPhoto &&
        rawCredit &&
        typeof rawCredit.name === "string" &&
        typeof rawCredit.profileUrl === "string" &&
        rawCredit.profileUrl.startsWith(UNSPLASH_PROFILE_PREFIX)
          ? { name: rawCredit.name.slice(0, 80), profileUrl: rawCredit.profileUrl.slice(0, 300) }
          : undefined;
      attachments.push({
        credit,
        kind,
        url,
        name: typeof rawAttachment.name === "string" ? rawAttachment.name : "bifogad fil",
        mimeType: typeof rawAttachment.mimeType === "string" ? rawAttachment.mimeType : undefined,
        text: typeof rawAttachment.text === "string" ? rawAttachment.text.slice(0, 20000) : undefined,
      });
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

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt att redigera." }, { status: 400 });
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const existingNewsCategories = await getSiteNewsCategories(supabase, site.id);
  const promptText = buildEditPrompt(site.content, message, buildAttachmentNote(attachments), currentPath, selection, existingNewsCategories);

  // Bara bildbilagor görs om till egna innehållsblock i ett multimodalt
  // meddelande (Claude ser själva bilderna, en efter en) — textdokument är
  // redan omvandlade till ren text i prompten ovan, de behöver inget eget
  // innehållsblock.
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const finalContent: Anthropic.MessageParam["content"] =
    imageAttachments.length > 0
      ? [
          ...imageAttachments.map((a) => ({ type: "image" as const, source: { type: "url" as const, url: a.url } })),
          { type: "text" as const, text: promptText },
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
  // Kontrollfråga: Millie är osäker och ger kunden alternativ att klicka på
  // istället för att gissa. Inget ändras eller sparas.
  const clarifyOptions = Array.isArray(patch.clarifyOptions)
    ? patch.clarifyOptions
        .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
        .map((o) => o.trim().slice(0, 120))
        .slice(0, 4)
    : [];
  if (clarifyOptions.length >= 2 && patch.summary) {
    return NextResponse.json({
      content: site.content,
      summary: patch.summary,
      unsupported: false,
      options: clarifyOptions,
      newsArticle: null,
    });
  }
  if (patch.changedPages && !patch.changedPages.every(isValidSitePage)) {
    return NextResponse.json({ error: "AI-svaret hade fel format." }, { status: 502 });
  }

  const updatedContent = dedupeMaps(applyPatch(site.content, patch), "flatten-form");
  if (!updatedContent.pages.length) {
    return NextResponse.json({ error: "Ändringen skulle lämna sajten utan sidor." }, { status: 502 });
  }

  // Loggan och sociala länkar sätts i kod från onboardingen, aldrig av
  // AI:n — samma säkerhetsnät som i /api/sites/generate, ifall Claude
  // skulle tappa bort dem på vägen trots instruktionen att bevara allt.
  // Fotografer för valda stockbilder sparas på sajten så de kan visas i
  // sidfoten (Unsplashs krav) — i kod, aldrig av AI:n.
  for (const a of attachments) {
    const key = a.credit ? unsplashKey(a.url) : null;
    if (a.credit && key) {
      updatedContent.photoCredits = { ...(updatedContent.photoCredits || {}), [key]: a.credit };
    }
  }
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

  // Skapar en ny nyhetsartikel i en EGEN tabell (site_news_articles) om
  // Claude bad om det (patch.newsArticle) — skild från sajtens sidinnehåll
  // ovan, se NewsArticle i lib/newsArticles.ts. Precis som för bilder i
  // sajtens sektioner väljer koden (inte Claude) vilken bild artikeln får:
  // den FÖRSTA bifogade bilden i det här meddelandet, om någon — Claude
  // ombeds aldrig ange en bild-URL själv (se verktygets fältbeskrivning).
  let newsArticle: NewsArticle | null = null;
  let newsSaveFailed = false;
  const newsCategory = patch.newsArticle ? normalizeCategory(patch.newsArticle.category) : null;
  if (patch.newsArticle && newsCategory && patch.newsArticle.title?.trim() && patch.newsArticle.body?.trim()) {
    const title = patch.newsArticle.title.trim().slice(0, 120);
    const slug = await uniqueSlugForSite(supabase, site.id, title);
    // En stockbild bär fotografen med sig i adressen (se withCredit) så
    // artikeln kan visa "Foto: …" under bilden.
    const firstAttachment = imageAttachments[0];
    const firstImage = firstAttachment
      ? firstAttachment.credit
        ? withCredit(firstAttachment.url, firstAttachment.credit)
        : firstAttachment.url
      : null;
    const nowIso = new Date().toISOString();
    const { data: inserted, error: newsError } = await supabase
      .from("site_news_articles")
      .insert({
        site_id: site.id,
        title,
        slug,
        excerpt: patch.newsArticle.excerpt?.trim().slice(0, 300) || null,
        body: patch.newsArticle.body.trim().slice(0, 20000),
        image_url: firstImage,
        category: newsCategory,
        published: patch.newsArticle.published === true,
        published_at: patch.newsArticle.published === true ? nowIso : null,
      })
      .select("*")
      .single();
    // Ett misslyckat artikelsparande ska inte få hela ändringen (som redan
    // sparats ovan) att se ut som att den misslyckades för kunden — bara
    // artikeln uteblir, resten av svaret går igenom som vanligt.
    if (!newsError) newsArticle = inserted as NewsArticle;
    else newsSaveFailed = true;
  }

  // Varningar kunden ska få veta om direkt: en nyhet som inte syns någonstans,
  // en nyhet som inte gick att spara, eller en borttagen nyhetslista.
  const hasNewsList = (c: SiteContent) => c.pages.some((pg) => pg.sections.some((sec) => sec.type === "newsList"));
  // En befintlig sida som heter något med "nyhet" (t.ex. "Nyheter") — då
  // erbjuds nyhetslistan där i stället för att skapa en ny sida.
  const newsPage = updatedContent.pages.find((pg) => /nyhet/i.test(pg.label) || /nyhet/i.test(pg.path));
  let warning: string | undefined;
  let followUp: string[] | undefined;
  if (newsSaveFailed) {
    warning = "Nyheten gick inte att spara just nu, så den finns inte med. Försök igen om en stund, eller skriv den under Nyheter i panelen.";
  } else if (newsArticle && !hasNewsList(updatedContent)) {
    warning = `Nyheten "${newsArticle.title}" är sparad som ${newsArticle.published ? "publicerad" : "utkast"}, men ingen sida på sajten har en nyhetslista, så den syns inte för besökarna än. Vill du att jag lägger till en?`;
    followUp = [
      newsPage ? `Lägg till nyhetslistan på sidan ${newsPage.label}` : "Skapa en ny sida som heter Nyheter med nyhetslistan",
      "Lägg till en nyhetslista längst ner på startsidan",
    ];
  } else if (hasNewsList(site.content) && !hasNewsList(updatedContent)) {
    const { count } = await supabase
      .from("site_news_articles")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id);
    if (count && count > 0) {
      warning = `Nyhetslistan är borttagen från sajten, så dina ${count} nyheter syns inte längre för besökarna. Vill du ha tillbaka den?`;
      // Sidan som tidigare hade listan, annars en sida som heter något med "nyhet".
      const formerPage = (site.content as SiteContent).pages.find(
        (pg) => pg.sections.some((sec) => sec.type === "newsList") && updatedContent.pages.some((u) => u.path === pg.path)
      );
      const target = formerPage || newsPage;
      followUp = [
        target ? `Lägg tillbaka nyhetslistan på sidan ${target.label}` : "Skapa en ny sida som heter Nyheter med nyhetslistan",
        "Nej, låt den vara borta",
      ];
    }
  }

  return NextResponse.json({
    content: updatedContent,
    summary: patch.summary,
    unsupported: patch.unsupported === true,
    newsArticle,
    warning,
    followUp,
  });
}
