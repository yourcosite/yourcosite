import { logAiUsage } from "@/lib/aiUsage";
import { getT, getLocale } from "@/lib/i18n/server";
import { LANGUAGE_ENGLISH, isLocale, msg } from "@/lib/i18n/config";
import { childPagesOf } from "@/lib/pageTree";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { HEADER_BUTTON_LAYOUTS, HEADER_LAYOUTS, isValidSiteContent, isValidSitePage, type SiteContent, type SitePageContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { EDIT_PATCH_PROPERTIES, EDIT_PATCH_REQUIRED } from "@/lib/siteContentSchema";
import { reparentPage } from "@/lib/pageTree";
import { normalizeCategory, uniqueSlugForSite, getSiteNewsCategories, getSiteNewsArticles, resolveNewsTiming, type NewsArticle } from "@/lib/newsArticles";
import { DEFAULT_TIMEZONE } from "@/lib/booking";
import { fillMissingImages, pagesNeedingImages } from "@/lib/ensureImageSlots";
import { isUnsplashImageUrl, unsplashKey, withCredit, UNSPLASH_PROFILE_PREFIX } from "@/lib/stockPhotos";
import { isSkinId } from "@/lib/skins";
import { dedupeMaps } from "@/lib/ensureImageSlots";
import { withErrorLog } from "@/lib/errorLog";
import { applyMenuOps, cleanCategories, type MenuOp } from "@/lib/menuOps";

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
export const maxDuration = 300;

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
          publishAt: {
            type: "string",
            description:
              "Schemalagd publicering: klockslaget artikeln ska bli synlig, som lokal tid i formatet ÅÅÅÅ-MM-DDTTT:mm (t.ex. 2026-11-01T08:00), UTAN tidszon. Sätt BARA när kunden uttryckligen angett när den ska publiceras (då ska \"published\" utelämnas). Anges bara ett datum utan klockslag, använd 08:00 och säg det i \"summary\".",
          },
          unpublishAt: {
            type: "string",
            description:
              "Automatisk avpublicering (t.ex. när en kampanj tar slut): klockslaget artikeln tas ner, lokal tid ÅÅÅÅ-MM-DDTTT:mm utan tidszon. Sätt BARA när kunden uttryckligen angett när den ska tas ner. Anges bara ett slutdatum (\"till och med 30 november\"), använd det datumet kl 23:59 och säg det i \"summary\". Måste ligga efter publiceringen.",
          },
        },
        required: ["title", "body", "category"],
      },
      newsUpdate: {
        type: "object",
        description:
          "Ändrar publiceringen av en BEFINTLIG nyhetsartikel (se listan över sajtens artiklar i instruktionen): publicera nu, schemalägga, ta bort schemaläggning, sätta eller ta bort automatisk avpublicering, eller göra den till utkast. Används när kunden ber om det för en artikel som redan finns (t.ex. efter att du skapat den som utkast). Skapa aldrig en ny artikel för det.",
        properties: {
          title: { type: "string", description: "Den befintliga artikelns rubrik, EXAKT som den står i listan." },
          published: { type: "boolean", description: "true = publicera direkt." },
          publishAt: { type: "string", description: "Schemalägg publicering, lokal tid ÅÅÅÅ-MM-DDTTT:mm utan tidszon." },
          unpublishAt: { type: "string", description: "Sätt automatisk avpublicering, lokal tid ÅÅÅÅ-MM-DDTTT:mm utan tidszon (efter publiceringen)." },
          clearUnpublish: { type: "boolean", description: "true = ta bort en satt avpubliceringstid." },
          makeDraft: { type: "boolean", description: "true = ta ner artikeln nu och gör den till utkast (tar bort schemaläggning och avpublicering)." },
          newTitle: { type: "string", description: "Ny rubrik, bara om kunden bett om att byta rubriken på artikeln." },
          newExcerpt: { type: "string", description: "Ny ingress (kort text under rubriken), bara om kunden bett om att ändra den." },
          newBody: { type: "string", description: "Hela den nya brödtexten, bara om kunden bett om att ändra, korta, utöka eller skriva om artikelns text. Skriv ut HELA texten, inte bara ändringen." },
          newCategory: { type: "string", description: "Ny kategori (se instruktionen om kategorier), bara om kunden bett om att flytta artikeln till en annan kategori." },
          deleteArticle: { type: "boolean", description: "true = radera artikeln för gott. Sätt BARA när kunden uttryckligen bett om att ta bort/radera artikeln. 'Ta ner' eller 'dölj' betyder makeDraft, inte radering." },
        },
        required: ["title"],
      },
      movePages: {
        type: "array",
        description:
          "Flytta befintliga sidor i menyn: gör en sida till undersida (rullgardin) under en annan huvudsida, eller lyft ut en undersida till en egen huvudsida. Använd det när kunden ber om det för sidor som redan finns. Sidans adress och alla länkar till den uppdateras automatiskt av systemet. Ändra INTE path själv i changedPages för det här. Utelämna annars.",
        items: {
          type: "object",
          properties: {
            path: { type: "string", description: "Sidans nuvarande path, t.ex. \"/stolar\"." },
            newParent: { type: "string", description: "Huvudsidans path som sidan ska läggas under, eller tom sträng för att göra den till en egen huvudsida i menyn." },
          },
          required: ["path", "newParent"],
        },
      },
      menuOps: {
        type: "array",
        description:
          "Ändringar i en restaurangmeny (sektionen \"menu\") som redan finns på sajten: lägg till, ändra, flytta eller ta bort rätter och kategorier. Använd det för ALLA små och medelstora menyändringar (nytt pris, ny rätt, ta bort en rätt, byt kategori) i stället för att skriva om sidan. Ange rätter och kategorier med sina nuvarande namn. Utelämna annars.",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["addItem", "updateItem", "removeItem", "addCategory", "renameCategory", "removeCategory", "moveCategory", "setMenu"],
              description:
                "addItem (ny rätt i en kategori, kategorin skapas om den saknas), updateItem (ändra namn, beskrivning, pris, märken eller plats på en rätt), removeItem, addCategory, renameCategory, removeCategory, moveCategory (flytta en kategori till en plats), setMenu (byt HELA menyns innehåll mot \"categories\", t.ex. när kunden laddat upp sin egen meny som du tolkat).",
            },
            sectionId: { type: "string", description: "Menysektionens id. Utelämna om sajten bara har en meny." },
            category: { type: "string", description: "Kategorins nuvarande namn (t.ex. \"Varmrätter\")." },
            item: { type: "string", description: "Rättens nuvarande namn, för updateItem/removeItem. För addItem: den nya rättens namn." },
            newName: { type: "string", description: "Nytt namn, för updateItem eller renameCategory." },
            description: { type: "string", description: "Rättens (eller kategorins) beskrivning. Tom sträng tar bort den." },
            price: { type: "string", description: "Pris som fritext exakt som kunden skrev det, t.ex. \"189 kr\". Tom sträng tar bort priset. Hitta aldrig på priser." },
            tags: {
              type: "array",
              items: { type: "string", enum: ["v", "vg", "gf", "lf", "hot"] },
              description: "Kostmärken: v = vegetarisk, vg = vegansk, gf = glutenfri, lf = laktosfri, hot = stark. Sätt bara dem kunden eller menyn uttryckligen anger. Tom lista tar bort alla.",
            },
            position: { type: "integer", description: "Plats (1 = först). Utelämna för sist." },
            categories: {
              type: "array",
              description: "Bara för setMenu: hela den nya menyn.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        price: { type: "string" },
                        tags: { type: "array", items: { type: "string", enum: ["v", "vg", "gf", "lf", "hot"] } },
                      },
                      required: ["name"],
                    },
                  },
                },
                required: ["name", "items"],
              },
            },
          },
          required: ["action"],
        },
      },
      nextOptions: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description:
          "Klickbara förslag på nästa steg, på kundens språk, varje ett KOMPLETT önskemål som går att skicka som det är. Används efter att du skapat en nyhet som utkast utan att kunden sagt när den ska ut: erbjud t.ex. publicera direkt, schemalägga och behålla som utkast. Annars utelämnas fältet.",
      },
      summary: {
        type: "string",
        description:
          "En kort mening på kundens språk (se avsnittet SPRÅK i instruktionen), riktad direkt till kunden (t.ex. \"Bytte rubriken och gjorde texten kortare.\"), som beskriver vad som ändrades — eller varför inget ändrades om önskemålet inte gick att utföra.",
      },
      siteLanguage: {
        type: "string",
        enum: ["sv", "en", "da", "fi", "de", "fr", "es"],
        description:
          "Sätt BARA när sajtens språk ska bytas (kunden ber t.ex. om att översätta sajten eller göra den tysk/engelsk/…): den språkkod sajten ska ha efteråt. Då MÅSTE du i samma svar översätta all synlig text på sajten (alla sidor som ändras) till det språket. Utelämna annars.",
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
        maxItems: 5,
        description:
          "Använd när kundens önskemål är så pass otydligt att du annars skulle behöva gissa (t.ex. \"gör den snyggare\", flera sektioner passar in, eller flera rimliga tolkningar finns). Då gör du INGA ändringar (utelämna changedPages/theme helt) och ställer din fråga i \"summary\", plus 2-5 korta, tydliga svarsalternativ här som kunden kan klicka på. Varje alternativ ska vara ett KOMPLETT önskemål som går att skicka som det är, skrivet som kunden själv skulle skriva det (t.ex. \"Gör rubriken större på startsidan\"), inte \"Alternativ 1\". Sätt det mest sannolika först. Använd det sparsamt — bara när en gissning riskerar att bli fel, aldrig när önskemålet är tydligt.",
      },
      clarifyPreview: {
        type: "string",
        enum: ["menu"],
        description:
          "Sätt till \"menu\" (tillsammans med exakt de fem alternativen i clarifyOptions) när du visar kunden menystilarna, så att varje alternativ får en liten förhandsbild. Annars utelämnas fältet.",
      },
      answerOnly: {
        type: "boolean",
        description:
          "Sätt till true när du INTE har ändrat något på sajten med flit — t.ex. kunden ställde en fråga, eller det inte behövdes någon ändring. Då får din \"summary\" vara ett vanligt svar. Sätt ALDRIG answerOnly om du i \"summary\" säger att du har ändrat, bytt, lagt till eller tagit bort något — i så fall MÅSTE ändringen finnas i det du returnerar. Kan du inte göra det kunden ber om, sätt \"unsupported\" istället för att låtsas.",
      },
      logoAction: {
        type: "string",
        enum: ["set", "remove"],
        description:
          "Sajtens logga i sidhuvudet. \"set\" = kunden vill BYTA/lägga in loggan och har bifogat en bild i det här meddelandet — den FÖRSTA bifogade bilden blir loggan (du anger aldrig någon URL). \"remove\" = kunden vill ta bort loggan. Utelämna annars. Sätt ALDRIG \"set\" utan en bifogad bild.",
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
  imageAlts?: Record<string, string>;
  seoKeyword?: string;
  pageOrder?: string[];
  changedPages?: SitePageContent[];
  removedPagePaths?: string[];
  siteLanguage?: string;
  newsArticle?: {
    title: string;
    excerpt?: string;
    body: string;
    category: string;
    published?: boolean;
    publishAt?: string;
    unpublishAt?: string;
  };
  newsUpdate?: {
    title: string;
    published?: boolean;
    publishAt?: string;
    unpublishAt?: string;
    clearUnpublish?: boolean;
    makeDraft?: boolean;
    newTitle?: string;
    newExcerpt?: string;
    newBody?: string;
    newCategory?: string;
    deleteArticle?: boolean;
  };
  movePages?: { path: string; newParent: string }[];
  menuOps?: MenuOp[];
  nextOptions?: string[];
  summary: string;
  clarifyOptions?: string[];
  clarifyPreview?: "menu";
  exampleContentResolved?: boolean;
  logoAction?: "set" | "remove";
  answerOnly?: boolean;
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
  existingNewsCategories: string[],
  newsContext: string
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
  const selPage = selection ? content.pages.find((p) => p.path === selection.pagePath) : undefined;
  const selTitle = (sec: any) => sec?.heading || sec?.headline || "";
  const selSectionInfo = selSection
    ? ` Sektionen är av typen "${selSection.type}"${selSection.layout ? ` med layouten "${selSection.layout}"` : ""}${selTitle(selSection) ? ` och rubriken "${selTitle(selSection)}"` : ""}. Den ligger på sidan "${selPage?.label ?? selection?.pagePath}" (${selection?.pagePath}). Dess nuvarande inställningar: fadeTop=${selSection.fadeTop ? "ja" : "nej"}, fadeBottom=${selSection.fadeBottom ? "ja" : "nej"}, ctaStyle=${selSection.ctaStyle ?? "sajtens"}. Sektionerna på just den sidan, i ordning: ${selPage?.sections.map((sec: any, i: number) => `${i + 1}. id "${sec.id}" (${sec.type}${sec.layout ? "/" + sec.layout : ""}${selTitle(sec) ? `, "${selTitle(sec)}"` : ""})${sec.id === selection?.sectionId ? " ← DEN MARKERADE" : ""}`).join("; ")}. Ändringen görs i DEN MARKERADE sektionen på den sidan — INTE i någon annan sektion eller på någon annan sida, även om en annan sektion nämnts tidigare i chatten eller har egenskapen kunden ber om.`
    : "";
  const headerBtnNote = selection?.target === "field" && selection.sectionId === "__header__"
    ? `\nVIKTIGT — kunden har MARKERAT KNAPPEN I MENYN (sajtens theme.headerCta, inte en sektion). Önskemål om knappens stil, färg eller text gäller den: sätt theme.headerCta.style / theme.headerCta.color / theme.headerCta.label (behåll övriga headerCta-värden), rör inga sektioner. Nuvarande: ${JSON.stringify((content.theme as any).headerCta ?? null)}.\n`
    : "";
  const selectionNote =
    headerBtnNote ? headerBtnNote
    : selection?.target === "image"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en specifik bild i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"${
          selection.kind === "gridItem" || selection.kind === "galleryItem"
            ? `, rutan med index ${selection.itemIndex} i den sektionens "items"-lista`
            : ""
        }). Handlar önskemålet om att byta, ta bort eller ändra "bilden"/"bilden ovan" utan att tydligt peka ut en annan bild, syftar kunden med STOR sannolikhet på just DEN markerade bilden — gör då ändringen på exakt den noden, inte på en annan bild på sidan.${selSectionInfo} Gäller önskemålet i stället hela sektionen och inte just den bilden eller texten (layout, toning/fade uppåt eller nedåt, mellanrum, bakgrundsfärg, knappstil, "gör om denna till …", "tona ut den här sektionen") är det SEKTIONEN med det id:t som avses — ändra den, aldrig en annan sektion, och säg aldrig att du inte vet vilken.\n`
      : selection?.target === "field"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT ETT SPECIFIKT textfält i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}", fältet "${selection.field}" — matchar exakt den egenskapen i innehållsmodellen, t.ex. "headline" eller "items.1.title" för rad 2 i en lista). Önskemålet gäller med STOR sannolikhet att ändra EXAKT det fältet (hela dess nya text, inte bara en del), inte något annat fält i samma eller en annan sektion — gör då ändringen bara där.${selSectionInfo} Gäller önskemålet i stället hela sektionen och inte just den bilden eller texten (layout, toning/fade uppåt eller nedåt, mellanrum, bakgrundsfärg, knappstil, "gör om denna till …", "tona ut den här sektionen") är det SEKTIONEN med det id:t som avses — ändra den, aldrig en annan sektion, och säg aldrig att du inte vet vilken.\n`
      : selection?.target === "section"
      ? `\nVIKTIGT — kunden har KLICKAT OCH MARKERAT en hel sektion i förhandsvisningen innan de skrev sitt meddelande: ${selection.label} (sidan "${selection.pagePath}", sektion med id "${selection.sectionId}"). ${selSectionInfo} Kunden har valt den för att det är DÄR ändringen ska göras: alla önskemål som inte uttryckligen nämner ett annat ställe ("lägg en bild bredvid texten", "gör den större", "byt färg", "lägg till en knapp") gäller DEN markerade sektionen — rör ALDRIG en annan sektion (t.ex. hero) när något är markerat, om inte kunden uttryckligen nämner den. Passar önskemålet inte sektionens typ (t.ex. bild bredvid text i en sektion som inte kan visa bild), följ regeln om bild bredvid en textruta nedan: gör om just DEN sektionen eller förklara i "summary" — flytta aldrig ändringen till en annan sektion.\n`
      : "";
  return `Du redigerar en BEFINTLIG kundwebbplats hos YourCoSite. Nedan är sajtens NUVARANDE innehåll som JSON, bara som underlag för dig — du skriver INTE ut det igen (innehållsmodellen i lib/contentModel.ts):

${JSON.stringify(content, (k, v) => (k === "code" && typeof v === "string" ? `[inbäddningskod, ${v.length} tecken — rör inte]` : v), 2)}

Sajtens sidor just nu: ${pagePaths}
Huvudsidor och undersidor: en undersida har sin huvudsidas sökväg som prefix ("/produkter/stol" är en undersida till "/produkter") och visas i en rullgardin under huvudsidan i menyn. Bara en nivå stöds och startsidan "/" kan inte vara huvudsida. Ber kunden om en ny undersida under en befintlig sida: skapa den med en path som börjar med huvudsidans path + "/" + ett kort, korrekt slug (a-z, 0-9, bindestreck), och ge huvudsidan gärna en grid-sektion med en ruta per undersida vars "link" pekar på undersidans exakta path. Byter du path på en huvudsida, byt även prefixet på alla dess undersidor.
${currentPageNote}${selectionNote}${attachmentNote}
Kundens önskemål just nu: "${message}"

Uppdatera ENDAST det som faktiskt behövs för att uppfylla önskemålet.

VIKTIGT — svara smalt: lägg i "changedPages" ENDAST de hela sidobjekt (path, label, alla sektioner) som denna ändring faktiskt påverkar. Rör en ändring bara EN sida, ta bara med den sidan — skriv INTE ut sajtens övriga, oberörda sidor, de lämnas automatiskt som de är. Gäller ändringen en sektion mitt på en sida, skriv ut HELA den sidans sektionslista (med den ändrade sektionen uppdaterad och resten oförändrad), inte bara den enskilda sektionen. Utelämna "theme" helt om inget färgtema-/typsnittsbyte efterfrågades.

VIKTIGT — bilder: rör ALDRIG ett befintligt "imageUrl"-värde (varken ta bort, byta ut eller hitta på ett nytt) om inte kunden uttryckligen bett om en bildändring du inte kan utföra på annat sätt — de sätts av vårt system utifrån kundens egna uppladdade foton, aldrig av dig. Flyttas en sektion följer dess imageUrl med. Lägger du till en helt ny sektion som behöver en bild, UTELÄMNA "imageUrl" helt för den (ingen påhittad url, ingen tom sträng) — en snygg platshållare visas automatiskt istället.

VIKTIGT — knapplänkar: hero- och cta-sektioner kan ha ett "ctaLink". Ber kunden att en knapp ska leda till en av sajtens sidor, sätt ctaLink till exakt den sidans "path" (se listan ovan) — hitta aldrig på en sökväg som inte finns där. Ber kunden om en extern länk, använd en fullständig URL (https://...). Vill kunden att knappen inte ska gå att klicka på, utelämna ctaLink helt. Samma gäller de små "Läs mer →"-raderna: i en about-sektion (layouterna "image-full"/"image-stats") sätts länken i sektionens "ctaLink", och i en grid-sektion (layouterna "divided-columns"/"intro-divided") i det enskilda objektets "link" i "items" (räkna ut VILKET objekt kunden menar, rör inte de andra). Samma regler för värdet (exakt sidpath eller fullständig URL). Skriver du om en sektion av annan anledning ska redan satta ctaLink/link följa med oförändrade, precis som imageUrl.

VIKTIGT — bakgrundsfärg på EN enskild sida (t.ex. "gör Om oss-sidan svart/mörk"): detta STÖDS, via "backgroundMode" på sidobjektet i "changedPages" — se verktygets fältbeskrivning. Välj det av de tre lägena (light/warm/dark) som bäst matchar vad kunden bad om, texten justeras automatiskt. Gäller önskemålet istället HELA sajtens färgtema (t.ex. "byt till svart genomgående" eller bara "byt accentfärg"), använd "theme" högst upp som vanligt, inte detta fält.

VIKTIGT — exempelinnehåll: förstasidan kan innehålla EXEMPELcitat, exempelnyckeltal ("stats") och exempelfrågor som vi satt dit för att visa vad som finns${content.exampleContent ? " (den här sajten har sådana)" : ""}. Ber kunden dig ta bort/byta dem ("ta bort citaten", "jag har inga såna siffror", "skriv egna omdömen") — gör det direkt: ta bort hela sektionen eller utelämna "stats". Skriver kunden egna citat/siffror, använd EXAKT kundens ord.

VIKTIGT — ändra layout på en sektion ("visa tjänsterna som en lista", "gör Om oss med en stor bild"): byt sektionens "layout"-värde till ett giltigt för den sektionstypen (se verktygets schema) och behåll allt annat innehåll, alla bgColor/ctaColor/ctaLink/link och imageUrl oförändrade. Pekar kunden ut en markerad sektion, ändra just den. Välj layouten som bäst matchar ordvalet (t.ex. "lista" → "list", "stor bild" → "image-full", "siffror" → "stats-split"). Saknar sektionen innehåll en ny layout behöver (t.ex. nyckeltal), fyll i rimliga EXEMPELvärden.

VIKTIGT — flytta/ordna om: "flytta citaten högst upp" = skriv ut sidans sektioner i den nya ordningen i changedPages (hero ska alltid ligga först, och sidans kontakt/cta nära slutet om inget annat sägs). "Lägg Kontakt under Om oss i menyn"/"gör Priser till en undersida till Tjänster"/"lyft ut Stolar som egen menypunkt" = ange "movePages" [{path, newParent}] med sidans nuvarande path och huvudsidans path (tom sträng för egen huvudsida); ändra INTE path i changedPages för det, systemet uppdaterar adress och länkar. Startsidan går inte att flytta och en undersida kan inte ha egna undersidor. "Lägg Kontakt före Nyheter i menyn"/"byt ordning på sidorna" = ange "pageOrder" med ALLA sidors path i ny ordning; startsidan ("/") ska normalt vara först. Ändra inget annat än ordningen.

VIKTIGT — utseendereglage för hela sajten, i "theme": "buttonStyle" (pill/square/underline/soft/outline/rounded/gradient = runda, kantiga, understrukna, mjukt tonade, ramknappar, mjukt rundade, toning; tycker kunden att knapparna är hårda eller tunga, föreslå soft eller outline), "headerLayout" (left/centered-stacked/split = menyns placering; left-button/split-button/centered-button/pill-bar/minimal = meny med tydlig knapp, t.ex. Bokning, och "headerCta" {path,label,off} för knappens mål/text), "sectionSpacing" (compact/normal/airy = tätare/standard/luftigare). Ange bara det kunden bett om.

VIKTIGT — kontrollfrågor: är önskemålet så oklart att du måste gissa (t.ex. "gör det snyggare", "ändra rubriken" när flera rubriker finns, eller flera helt olika tolkningar är rimliga) — gissa inte. Ställ en kort fråga i "summary" och ge 2-5 klickbara svar i "clarifyOptions" (kompletta önskemål, mest sannolikt först), och gör INGA ändringar. Fråga bara när en felgissning skulle märkas eller vara jobbig att ångra; är det tydligt nog, utför det direkt. ${selection ? "Kunden har just nu MARKERAT något i förhandsvisningen (se ovan) — då vet du redan VAR ändringen ska göras, så fråga ALDRIG var eller vilken sektion/text/rubrik; utför ändringen på det markerade direkt. Fråga högst om själva ändringen, och bara om den verkligen inte går att tolka." : ""} Meddelanden kan vara dikterade med rösten: de är ofta korta, utan skiljetecken och informella ("gör den lite större", "byt till mer personlig") — tolka dem välvilligt och handla hellre än att fråga. Ställ aldrig två kontrollfrågor i rad om samma sak — har kunden redan svarat på din fråga, utför det.

VIKTIGT — bild BREDVID en textruta ("lägg en bild bredvid texten", "bild till höger om rutan"): bara vissa sektioner kan visa en bild. En Om oss-sektion ("about") får det med layouten "image-right" (bild till höger) eller "image-left" (bild till vänster) — byt layout till en av dem och sätt "imageUrl" (kundens bifogade bild, exakt adress) på sektionen; saknas en bild, byt ändå layouten (en snygg platshållare visas) och be kunden bifoga en bild. En hero med layouterna "split-left"/"split-right" har också en bild bredvid texten. Sektionerna "cta", "contactForm", "faq" och citat-sektioner kan INTE visa en bild bredvid texten (centrerad text utan bildplats ritar aldrig ut en bild). Gäller önskemålet en sådan sektion: sätt aldrig "imageUrl" och påstå inte att du lagt till en bild — gör antingen om den till en Om oss-sektion med bild bredvid (behåll rubrik och text) om det passar, eller förklara kort i "summary" att det inte går och föreslå det. Skriv ALDRIG att en bild lagts till om den inte syns med den layout sektionen nu har.

VIKTIGT — tätare/luftigare på EN sektion och textjustering: ber kunden om tätare eller luftigare avstånd (mindre/mer luft) på en enskild sektion ("gör den här sektionen tajtare"), sätt "spacing" på just den sektionen — compact = tätare, airy = luftigare, normal = tillbaka till sajtens vanliga. Pekar kunden ut en markerad sektion, ändra just den; annars den som beskrivs. Rör ALDRIG theme.sectionSpacing för en enskild sektion, och inga andra sektioner. Hero-sektionen har inget justerbart avstånd — förklara det kort i "summary" om kunden ber om det. Ber kunden om en annan FÄRG på knappen i menyn sätter du theme.headerCta.color (hex; tom sträng = följ accentfärgen) och behåller övrigt oförändrat; en annan färg på en knapp i en sektion sätter du som "ctaColor" på den sektionen (hero/cta) eller på rutan. Ber kunden om en annan stil på KNAPPEN I MENYN ("gör menyknappen mjukare", "ramknapp i menyn") sätter du theme.headerCta.style (soft/outline/rounded/gradient/square/pill/underline; "auto" tar bort och följer sajten) och behåller övriga headerCta-värden (path, label, hideFromMenu) oförändrade — ändra inget annat. Ber kunden om en annan knappstil på EN knapp eller en enskild sektion ("gör just den här knappen mjukare", "ramknapp på den här") sätter du "ctaStyle" på den sektionen (soft/outline/rounded/gradient/square/pill/underline, "auto" tar bort) — rör inte theme.buttonStyle och inga andra sektioner; vill kunden ha det på HELA sajten sätter du theme.buttonStyle. Ber kunden om en "toningssektion" (bild som tonar ut både uppåt och nedåt, text och knapp centrerade över) på en markerad hero eller uppmanings-/kontaktsektion (type "hero" eller "cta"): sätt dess layout till "fade-both" och behåll bild, rubrik, text och knapp — byt aldrig sektionens typ. Ber kunden om layouten "fade-bottom" på en markerad sektion: är det en uppmanings-/kontaktsektion (type "cta") sätter du dess layout till "fade-bottom" och behåller bild, rubrik, text och knapp — byt ALDRIG sektionens typ; är det en hero sätter du hero-layouten fade-bottom; för andra sektionstyper finns ingen sådan layout, så förklara det kort och föreslå "fadeBottom": true (mjuk övergång nedåt). Toning uppåt/nedåt (fadeTop/fadeBottom) fungerar på ALLA sektionstyper och layouter, även hero; sätt dem på den MARKERADE sektionen och säg aldrig att det inte går. Ber kunden om att en sektion ska tona/fada ut UPPÅT (mot sektionen över) sätter du "fadeTop": true på den sektionen (false tar bort; kan kombineras med layouten fade-bottom eller "fadeBottom"). Ber kunden om att en sektions nederkant ska tona/fada ut mot sektionen under ("fade på den här sektionen", "mjuk övergång nedåt"), sätt "fadeBottom": true på den sektionen (false tar bort) — ändra inget annat. Ber kunden om vänster-, höger- eller mittjusterad text ("centrera texten", "vänsterställ rubriken och texten", "högerjustera"), sätt "textAlign" (left/center/right) på sektionen/sektionerna det gäller; "på hela sidan" = alla den sidans sektioner, "på hela sajten" = "theme.textAlign" (auto tar bort). Texten, bilderna och allt annat i sektionen lämnas oförändrat. Har ett rutnät färre rutor än kolumner (t.ex. två rutor kvar i en rad om tre) centreras rutorna automatiskt; "textAlign" left/right på den sektionen lägger dem istället till vänster/höger. Skriver du om en sektion av annan anledning ska redan satta "spacing"/"textAlign" följa med oförändrade. Nuvarande sajtinställning för text: ${content.theme.textAlign ?? "mallens egen"}.

VIKTIGT — ärlighet: skriv aldrig i "summary" att du har ändrat något som du inte faktiskt har ändrat i det du returnerar. Kan du inte göra det kunden ber om (saknar stöd, eller kräver något du inte har), sätt "unsupported" och förklara kort — låtsas aldrig. Svarar du bara på en fråga eller behövde inget ändras, sätt "answerOnly": true.
VIKTIGT — logga: ber kunden dig byta/lägga in/ta bort sajtens logga (i sidhuvudet) — och har bifogat en bild — sätt "logoAction" till "set" (den första bifogade bilden blir loggan) eller "remove". Har kunden inte bifogat någon bild, be dem bifoga loggan med gemet (svara i "summary", ändra inget). Påstå ALDRIG att loggan är bytt utan att ha satt "logoAction" — annars händer ingenting.
VIKTIGT — sökmotorer och delning: ber kunden om bättre Google-text/"så sidan syns i sökningar"/delningstext, sätt "seoTitle" (under 60 tecken, sidans viktigaste sökord + gärna företagsnamn) och "seoDescription" (120-155 tecken, sann och lockande) på sidan/sidorna det gäller i changedPages — och skriv ut resten av sidan oförändrad. Gäller önskemålet "alla sidor", gör det för alla sidor (det är en liten ändring). Hitta inte på fakta om verksamheten, utgå från sidans egen text.

VIKTIGT — ton och omskrivning, EN SIDA I TAGET: ber kunden dig skriva om texten i en annan ton ("mer personligt", "kortare", "mer formellt") — gör det BARA på en sida per svar: den sida kunden pekar ut, annars sidan de tittar på just nu (se ovan). Rör aldrig fler sidor med en tonändring, även om kunden skriver "hela sajten". Avsluta "summary" med en vänlig fråga om vilken sida du ska ta härnäst (nämn gärna nästa sida vid namn). Bevara fakta, namn, siffror, länkar, bilder och struktur — bara formuleringarna ändras.

VIKTIGT — typografi och färgpaket för HELA sajten: ber kunden om en annan stil/känsla ("gör den mörk och elegant", "fetare typsnitt", "mjukare och pastell", "byt typografi") — sätt "theme.skin" till det av paketen som passar bäst (se fältets beskrivning; "ingen" går tillbaka till det vanliga temat). Ber kunden om större eller mindre rubriker ("gör rubrikerna större") — sätt "theme.headingScale" (utgå från nuvarande värde om det finns, annars 1). Ange bara de theme-delfält som ändras. Kundens accentfärg behålls av alla paket. Nuvarande paket: "${content.theme.skin ?? "ingen"}", rubrikskala: ${content.theme.headingScale ?? 1}.

VIKTIGT — färg på EN ENSKILD sektion, ruta/kort eller knapp (t.ex. "gör bara den sektionen mörkblå", "färga mittenrutan orange", "gör knappen i kontaktsektionen grön"): till skillnad från bakgrundsfärg på en HEL sida (backgroundMode, se ovan) eller HELA sajtens tema ("theme.accentColor"/"theme.secondaryColors") finns tre separata, FRIA hex-färgfält för exakt den här mindre skalan:
  • "bgColor" på VILKEN sektion som helst (hero/about/grid/testimonials/cta/contact/gallery/team/faq/map/contactForm/newsList/booking) — sätt den BARA på den/de sektioner kunden uttryckligen pekar ut, aldrig på hela sidan eller sajten.
  • "bgColor" på ETT enskilt objekt i en grid-sektions "items" (en "ruta"/"kort" bland flera, t.ex. "mittenrutan" eller "den tredje"). Räkna ut VILKET index kunden menar utifrån sammanhanget (ordningsföljden i items, eller rubriken/texten de nämner) och sätt "bgColor" bara på det objektet — rör inte de andra.
  • "ctaColor" på en enskild knapp — hero- och cta-sektioner samt grid-sektionens egen knapp (layout "intro-divided") kan ha en egen "ctaColor", oberoende av sajtens accentfärg.
Alla tre tar en fri hex-färg ("#RRGGBB", eller ett vanligt färgnamn du själv översätter till hex, t.ex. "orange" → "#F97316") — till skillnad från backgroundMode (bara tre fasta, alltid kontrastsäkra lägen) väljer du HÄR exakt den nyans kunden bad om; text-/kortfärgen runt den räknas ut automatiskt så den alltid syns, du behöver inte själv tänka på kontrast. Ändringen gäller BARA den utpekade ytan — resten av sektionen/sidan/sajten är orörd. Vill kunden ta BORT en sådan enskild färg (gå tillbaka till det vanliga temat), utelämna fältet helt i ditt svar (sätt INTE en tom sträng). VIKTIGT: till skillnad från "backgroundMode" (som bevaras automatiskt av vårt system om du utelämnar det) ingår "bgColor"/"ctaColor" i sektionens/rutans EGNA fält — skriver du om en sektion eller ruta av en helt annan anledning (t.ex. bara ändrar rubriken) måste du skriva med dess REDAN satta bgColor/ctaColor precis som den var, annars försvinner färgen av misstag. Samma regel som för "imageUrl" ovan.

VIKTIGT — kartsektion ("map"): fältet "address" ska vara EXAKT den adress kunden gett dig (gata, postnummer, ort) — hitta ALDRIG på en adress. Saknar kunden en adress att ange, fråga efter den i "summary" istället för att lägga till sektionen med en påhittad adress.

VIKTIGT — video ("video"-sektion): ber kunden att få en YouTube-video inbäddad och GER dig en länk, lägg till en "video"-sektion med "videoUrl" satt till EXAKT den länk kunden gav (vilken YouTube-länkform som helst fungerar) — hitta ALDRIG på en länk eller ett video-id. Saknas länken, fråga efter den i "summary" istället för att lägga till sektionen. Bara YouTube stöds; ber kunden om Vimeo eller annan videotjänst, förklara det kort i "summary" (och sätt "unsupported" till true). Placera sektionen där kunden vill ha den; "full-bleed" om kunden vill ha den över hela bredden.

VIKTIGT — sociala flöden ("social"-sektion): ber kunden om sitt Facebook-flöde, Instagram-flöde eller ett Instagram-inlägg på sidan, använd "social"-sektionen med "source" satt till EXAKT det kunden gav (länk eller inklistrad kod) — hitta ALDRIG på en länk, ett användarnamn eller ett id. Saknas länken, fråga efter den i "summary" istället för att lägga till sektionen. Så fungerar de tre fallen: (1) FACEBOOK: kunden ger länken till sin Facebook-företagssida, då visas sidans flöde direkt (sidan måste vara publik). (2) ENSKILT INSTAGRAM-INLÄGG: kunden ger länken till inlägget (i Instagram: de tre prickarna på inlägget, sedan Kopiera länk) — flera länkar går bra, högst 6, och visas efter varandra. (3) HELT INSTAGRAM-FLÖDE: Instagram tillåter inte det direkt, så förklara kort i "summary" att kunden behöver en flödestjänst, till exempel Behold (behold.so), Elfsight eller SnapWidget, som har gratisnivåer. Kunden kopplar sitt Instagram där, kopierar inbäddningskoden och klistrar in den till dig, då lägger du koden i "source" precis som den är. Ger kunden bara sitt Instagram-användarnamn eller profillänk, lägg INTE till sektionen utan förklara punkt (3). Flödena visas för besökarna först efter att de godkänt cookies i cookiebannern — nämn det kort i "summary" första gången. Placera sektionen där kunden vill ha den, annars längst ned på den sida kunden pekar ut.

VIKTIGT — sektioner läggs ALLTID under varandra, ALDRIG bredvid varandra, oavsett typ (en sida är en enkel lista av sektioner, inget rutnät av sektioner). Ber kunden om "X och Y bredvid varandra" eller "i samma sektion/rad" där X/Y är två OLIKA sektionstyper, finns bara EN kombination som faktiskt stöds: ett kontaktformulär med en karta bredvid — sätt då "contactForm"-sektionens "layout" till "split-map" och fyll i dess "address" (samma regel som för "map" ovan: EXAKT kundens adress, aldrig påhittad), ISTÄLLET FÖR en separat "map"-sektion. Har kunden redan en separat "map"-sektion med samma adress när de ber om detta, ta bort den (lägg inte till dess path i "changedPages" igen, eller skriv ut sidans sektionslista utan den) så det inte blir dubbelt. Någon annan kombination av sektioner sida vid sida går inte att göra — förklara det kort i "summary" och föreslå att lägga dem efter varandra istället.

VIKTIGT — bokningssektionen ("booking"): låter besökare välja paket, dag och tid och boka direkt på sidan (bekräftelse går på mejl till både besökaren och sajtens ägare, och bokade tider blockeras automatiskt). Ber kunden om bokning, tidsbokning eller att kunder ska kunna boka tid, lägg till "booking"-sektionen på den sida kunden pekar ut, VILKEN sida som helst (högst en per sida), och placera den längst ned på sidan om kunden inte säger annat eller anger en annan plats (t.ex. "under bilden" eller "högst upp"). Pekar kunden inte ut någon sida: föreslå och använd en egen sida "Boka" eller kontaktsidan. Paketen, priserna, öppettiderna och bokningarna kan du INTE skapa eller ändra här — kunden gör det själv på sidan "Bokningar" i panelen (knappen Bokningar i redigeraren). Säg det i "summary" när du lägger till sektionen så kunden vet att nästa steg är att lägga upp paket och tider där. Ta ALDRIG bort en befintlig "booking"-sektion om inte kunden uttryckligen ber om det.

BOKNINGSMALLAR — "booking"-sektionens "layout": "standard" (centrerad, enkel), "compact" (smal, tät ruta i ett kort), "image-left"/"image-right" (en bild bredvid bokningen) och "image-background" (bild bakom en bokningsruta; dramatisk). Utelämna alltid "imageUrl" (bilden sätts av vårt system av sajtens egna foton). Tre färdiga SIDMALLAR för en hel bokningssida (path "/boka" om kunden inte sagt annat, label "Boka tid"): (1) "Klassisk": en "hero" (layout "centered", rubrik + kort text om vad man kan boka), sedan "booking" (layout "standard"), sedan en "faq" med 3 allmänna frågor (hur bokningen går till, hur man avbokar via länken i mejlet, vad man behöver ta med är OK att utelämna om det vore påhittat), sist en "contact"-sektion om sajten har kontaktuppgifter. (2) "Bildstark": en "hero" (layout "overlay-bottom"), sedan "booking" (layout "image-background"), sedan en "contact"-sektion om det finns kontaktuppgifter. (3) "Lugn": en "hero" (layout "split-right"), sedan "booking" (layout "image-left"), sedan en "faq" med 3 allmänna frågor. Hitta aldrig på priser, tider, villkor, öppettider eller erbjudanden i någon mall.
FRÅGA FÖRST om utseendet: ber kunden om en bokningssida eller bokningssektion utan att ha valt mall eller utseende (inget av orden mall, layout, bild bredvid, bild i bakgrunden, kompakt, klassisk, bildstark, lugn finns i meddelandet eller tidigare i samtalet), gör du INGA ändringar. Ställ då en kort fråga i "summary" ("Vilket utseende vill du ha på bokningen?") och ge 3-4 kompletta klickbara önskemål i "clarifyOptions". Gäller det en HEL SIDA: "Skapa en bokningssida, mall Klassisk (enkel och ren)", "Skapa en bokningssida, mall Bildstark (stor bild bakom bokningen)", "Skapa en bokningssida, mall Lugn (bild bredvid bokningen)". Gäller det en sektion på en befintlig sida (kontrollera sidans namn i listan ovan): "Lägg till bokningen längst ned på sidan X, standard", "... med bild bredvid", "... med bild i bakgrunden", "... som en kompakt ruta" (byt X mot rätt sidnamn). Har kunden redan valt utseende eller mall (eller svarar på din fråga), bygg det direkt utan att fråga igen. Byter kunden utseende på en befintlig bokning ("byt bokningen till bild bredvid"), ändra bara "layout" och behåll resten oförändrat.

FRÅGA FÖRST om menyn: (VIKTIGT: svara ALDRIG "det är redan klart" för att tidigare chattmeddelanden säger det — kontrollera sajtens nuvarande innehåll: knappen finns bara om theme.headerCta är satt OCH theme.headerLayout är left-button, split-button, centered-button, pill-bar eller minimal, och en sida är bara dold ur menyn om headerCta.hideFromMenu är true. Saknas något av det ska du sätta det nu i din patch. UNDANTAG — fråga INTE och visa inga stilar när kunden redan anger knappens text och/eller vilken sida den ska gå till, t.ex. "lägg till en knapp i menyn som heter Boka rum och går till sidan Boka rum": sätt då direkt theme.headerCta {label, path}; har sajten ingen menystil med knapp än sätter du också theme.headerLayout "left-button" och nämner i "summary" att kunden kan byta stil; vill kunden samtidigt ta bort menylänken till samma sida ("ta bort länken i menyn som heter X") sätter du headerCta.hideFromMenu true — sidan finns kvar, den syns bara som knapp. Ta ALDRIG bort själva sidan för det.) Annars: ber kunden att byta eller ändra menyns design/utseende/placering, eller om en knapp i menyn (t.ex. "jag vill ha en bokningsknapp i menyn", "kan vi ändra menyn?", "byt design på menyn"), utan att ha valt en av stilarna nedan, gör du INGA ändringar. Beskriv kort stilarna i "summary" och ge de fem som klickbara önskemål i "clarifyOptions" och sätt "clarifyPreview": "menu" (dessa fem, i den här ordningen, översatta till kundens språk — beskrivningen i "summary" också): "Byt menyn till Klassisk med knapp (meny och knapp till höger)", "Byt menyn till Meny i mitten med knapp", "Byt menyn till Centrerad logga med knapp", "Byt menyn till Flytande pillermeny med knapp", "Byt menyn till Minimal (bara knapp och meny-ikon)". I "summary" förklarar du i en mening per stil hur den ser ut: 1 = logga vänster, meny och en tydlig knapp höger; 2 = logga vänster, meny i mitten, knapp höger; 3 = loggan i mitten, knapp uppe till höger och menyn på en rad under; 4 = menyn i en rundad flytande ruta, aktuell sida markerad, knapp höger; 5 = bara logga, knapp och meny-ikon. Nämn också att knappen automatiskt blir sajtens bokningssida (annars kontaktsidan) och att kunden kan be om en annan text eller en annan sida. Kunden kan även välja de enklare stilarna utan knapp: "klassisk" (headerLayout left), "loggan centrerad" (centered-stacked) eller "meny i mitten" utan knapp (split) — sätt dem direkt om kunden ber om det uttryckligen. Mappning när kunden har valt: Klassisk med knapp = "left-button", Meny i mitten med knapp = "split-button", Centrerad logga med knapp = "centered-button", Flytande pillermeny = "pill-bar", Minimal = "minimal" (alla i theme.headerLayout, ändra inget annat). Bara knappens text eller mål ("ändra knappen till Boka tid", "låt knappen gå till Kontakt") sätts i theme.headerCta {label, path} och kräver ingen fråga; en sida kan ligga i menyn OCH vara knappens mål samtidigt — sätter kunden knappens text eller sida finns sidan kvar som vanligt menyval, så "Kontakt" som länk plus en knapp "Boka" till samma sida går bra och du ska ALDRIG säga att det inte går (kräver ingen annan ändring än headerCta; ta inte bort sidan ur menyn); finns ingen bokningssida eller kontaktsida syns ingen knapp förrän kunden anger en sida med path — säg det i så fall. "Ta bort knappen" = theme.headerCta {off: true}. Gäller frågan bara att byta namn på, ta bort eller flytta ett menyval (en sida), är det ingen designfråga — hantera det som vanligt med sidans namn och ordning, utan att visa stilarna.

VIKTIGT — galleri ("gallery"): ber kunden om ett galleri/bildgalleri/fotogalleri, lägg till en "gallery"-sektion med en passande rubrik och 8-12 tomma platser i "items" (objekt utan imageUrl, ge ALDRIG påhittade bildadresser). Välj layout efter önskemålet: "mosaic" för oregelbundet/collage, "masonry" för foton i olika format med egna proportioner, "tiles" för många små bilder i ett tätt rutnät, "grid" för få större bilder, "carousel" för en svepbar rad. Besökarna kan klicka på varje bild för att se den större, det behöver du inte ordna. Säg i "summary" att kunden klickar på galleriet i förhandsvisningen och väljer "➕ Lägg till bilder" för att ladda upp många bilder på en gång (de fyller platserna och galleriet växer vid behov), att "🎨 Byt layout" visar alla uppställningar, och att man kan bifoga bilder här i chatten också (högst 10 åt gången). Bifogar kunden bilder när ett galleri finns fyller systemet platserna i ordning. VIKTIGT — personer/team ("team"): ber kunden om personer, medarbetare, team eller "vilka vi är" (t.ex. på kontaktsidan), lägg till en "team"-sektion med en passande rubrik och en post per person kunden nämnt, med "name" och "title" (e-post och telefon BARA om kunden gett dem, hitta aldrig på kontaktuppgifter eller bildadresser). Nämner kunden inga namn, lägg 3 platser med exempeltexterna "Förnamn Efternamn" och "Titel" och säg det i "summary". Layouter: "cards" (kort), "round" (runda porträtt, personligt), "rows" (en rad per person, bra för många), "overlay" (stora foton med text över). Säg i "summary" att kunden klickar på sektionen i förhandsvisningen och väljer "👥 Redigera personer" för att ladda upp foton och fylla i namn, titel, e-post och telefon (bara foto, namn och titel krävs), och "🎨 Byt layout" för att se alla uppställningar. VIKTIGT — inbäddad kod ("embed"): ber kunden att lägga in ett eget bokningssystem, ett externt formulär, en widget, ett script eller annan html-kod på en sida, lägg till en "embed"-sektion på den sida kunden pekar ut (längst ned om inget annat sägs) med en passande rubrik, och UTELÄMNA "code". Du kan aldrig ta emot, skriva eller ändra själva koden — den klistrar kunden in själv. Säg i "summary" att kunden klickar på sektionen i förhandsvisningen och väljer "</> Klistra in kod", att det går bra att klistra in antingen hela koden (script eller iframe) eller bara adressen till bokningssidan, och att koden körs i en säker, isolerad ruta (några tjänster som kräver cookies eller lagring på sajten kan därför behöva sin egen länk i stället). Bokningssystemet i "booking"-sektionen är YourCoSites egna; föreslå det bara om kunden inte redan har ett eget system. Ta aldrig bort en befintlig "embed"-sektion om inte kunden uttryckligen ber om det. VIKTIGT — restaurangmeny ("menu"): ber kunden om en meny, matsedel, dryckeslista eller lunchmeny, lägg till en "menu"-sektion på den sida kunden pekar ut (föreslå en egen sida "Meny" om ingen nämns). Fyll den med de rätter kunden angett i "categories" (kategorier med rätter: name, valfri description, price som fritext exakt som kunden skrev, tags). Hitta ALDRIG på rätter, priser eller kostmärken — har kunden inte angett några, lämna "categories" som en tom lista och säg i "summary" att kunden kan skriva eller ladda upp sin meny härnäst. Layouter: "classic" (två spalter med prisrad), "elegant" (centrerad, lugn, för finare restauranger), "cards" (rutor), "tabs" (flikar per kategori, bra för långa menyer). Allergiinformation kan läggas i "note". Kostmärken (tags): v vegetarisk, vg vegansk, gf glutenfri, lf laktosfri, hot stark. ÄNDRA en befintlig meny med "menuOps" (addItem, updateItem, removeItem, addCategory, renameCategory, removeCategory, moveCategory), ALDRIG genom att skriva om hela sidan i changedPages — det gäller även ändrade priser. "Sänk priset på laxen till 245" = updateItem med item "Lax…" (rättens nuvarande namn) och price "245 kr". "Lägg till en vegansk pasta under varmrätter för 165" = addItem med tags ["vg"]. Flera ändringar i samma meddelande = flera objekt i menuOps. UPPLADDAD MENY: bifogar kunden sin egen meny (PDF, Word, textfil eller ett foto/skärmdump av en meny) och vill ha den på sajten, läs ut ALLA kategorier och rätter exakt som de står (namn, beskrivning, pris, och kostmärken bara om de anges, t.ex. (V), (VG), (GF), (LF)), utan att korta eller hitta på något. Finns redan en menysektion: använd menuOps med action "setMenu" och "categories". Finns ingen: skapa en "menu"-sektion med alla "categories" direkt i changedPages. Är en rad oläslig eller osäker: ta med den så gott det går och nämn det i "summary". Säg i "summary" hur många kategorier och rätter du lade in och att kunden kan be dig ändra enskilda rätter eller priser. Kundens språk i menyn behålls som det är (översätt inte rättsnamn). VIKTIGT — nyhetssektionen ("newsList"): visar kundens PUBLICERADE nyhetsartiklar som ett rutnät på en sida — själva sektionen innehåller inga artiklar, bara en rubrik. Ber kunden om en nyhetssida/nyhetssektion, lägg till "newsList"-sektionen på den sidan (högst en per sida).

VIKTIGT — skapa en nyhetsARTIKEL: det här går numera att göra direkt här i chatten, via det separata fältet "newsArticle" (skiljt från sajtens sidor — artiklar lagras för sig och visas via "newsList"-sektionen ovan). Använd det BARA när kunden uttryckligen ber om att skapa/skriva/publicera en nyhet/artikel, t.ex. "skriv en nyhet om att vi fått nya skor i lager" eller genom att bifogera text och/eller en bild med en begäran om att göra en nyhet av det. Rubrik får ALDRIG hittas på — se fältbeskrivningen. Saknas en tydlig rubrik eller är kategorin oklar, utelämna HELA "newsArticle" och fråga efter det som saknas i "summary" istället. Sajtens befintliga kategorier just nu: ${existingNewsCategories.join(", ")} — matcha en av dessa EXAKT om kunden syftar på samma sak, annars kan du sätta en ny kategori med kundens egen benämning (lista då gärna de befintliga som förslag om du istället behöver fråga). En bifogad bild används automatiskt som artikelns bild av vårt system — nämn inte bilden i "newsArticle" på något sätt, den hanteras utanför den här strukturen precis som andra bilder. Har kunden INTE bifogat någon bild alls, skapas artikeln helt enkelt utan bild. ${newsContext} Skapar du en artikel samtidigt som kunden ber om en nyhetssida/nyhetssektion de inte redan har, lägg gärna till "newsList"-sektionen i samma svar också. ${content.pages.some((pg) => pg.sections.some((sec) => sec.type === "newsList")) ? "Sajten HAR en nyhetslista." : "Sajten har just nu INGEN nyhetslista — skapar du en artikel MÅSTE du i samma svar lägga till en \"newsList\"-sektion (på en befintlig nyhetssida om en finns, annars på en ny sida \"Nyheter\" med path \"/nyheter\"), annars syns artikeln inte för besökarna."} Ta ALDRIG bort en befintlig "newsList"-sektion eller nyhetssida om inte kunden uttryckligen ber om det — skriver du om en sida som innehåller en, ska den följa med oförändrad.

VIKTIGT — optimera för Google: ber kunden dig optimera/förbättra en text, en markerad sektion eller en sida för Google, sökmotorer eller "för att synas bättre" (på vilket språk som helst, ofta via knappen "Optimera för Google"), gör du så här. 1) Sökord: sajtens huvudsökord ligger i seoKeyword i innehållet ovan (t.ex. "frisör i Linköping", bransch plus ort). Finns det, använd det. Saknas det och du med säkerhet kan läsa ut bransch och ort ur sajtens egna texter och adress, sätt seoKeyword själv i din patch och nämn det i "summary". Är du det minsta osäker (flera möjliga tjänster, ingen tydlig ort), gör INGA textändringar än (sätt "answerOnly": true): fråga kort i "summary" vad kunden helst vill synas på i Google och ge 2-4 förslag i "clarifyOptions" som kompletta önskemål. Markeringen försvinner när kunden svarar, så skriv ut VAD som optimeras i varje förslag (citera början av texten eller ange sektionens plats och sida), t.ex. Optimera rubriken "Hår som känns" på startsidan för Google med sökordet "frisör i Linköping". Kunden kan också skriva ett eget svar. När kunden har svarat: sätt seoKeyword och utför ändringen direkt. 2) Du FÅR ställa en kort kompletterande fråga om du saknar något som verkligen gör texten bättre (t.ex. vilka tjänster ni erbjuder, vad som skiljer er från andra, vilket område ni täcker), men högst en fråga åt gången, aldrig om något kunden redan sagt eller som redan står på sajten, och hellre utföra än fråga. Kunden kan svara med egna ord. Ställer du en fråga utan att ändra något, sätt "answerOnly": true. 3) Utför: skriv om BARA det markerade (eller sidans seoTitle och seoDescription om det är det som avses). Behåll kundens röst, ton och fakta, väv in sökordet naturligt högst en gång per text (aldrig staplade sökord) och håll längden ungefär densamma. Rubrik: kort och tydlig, helst under 60 tecken. Brödtext: konkret om tjänst och plats, inga tomma fraser. Hitta aldrig på fakta, priser, omdömen, årtal eller utmärkelser. 4) Skriv i "summary" i en eller två meningar vad du ändrade och vilket sökord du använde. Lova aldrig en placering på Google, säg gärna att det är ett steg som hjälper.

VIKTIGT — bildtexter (alt): ber kunden om bildtexter/"beskrivningar på bilderna"/bättre bilder för Google, sätt "imageAlts" med bildens exakta imageUrl som nyckel och en kort beskrivande text (under 120 tecken) som värde, för varje bild som saknar en. Beskriv bara det sektionens egen text och rubrik gör rimligt, hitta aldrig på namn eller fakta. Öppettider: sätt "hours" på kontaktsektionen endast när kunden själv skrivit tiderna i meddelandet, annars be om dem i "summary".

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
function applyPatch(content: SiteContent, patch: EditPatch, moveErrors: string[] = [], currentPath?: string): SiteContent {
  const removed = new Set(patch.removedPagePaths || []);
  // Tas en huvudsida bort följer dess undersidor med — annars blir de
  // föräldralösa och dyker upp som egna menyval.
  for (const rp of Array.from(removed)) {
    for (const child of childPagesOf(rp, content.pages)) removed.add(child.path);
  }
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

  // Inbäddad kod (sektionen "embed") skrivs bara av kunden själv. Millie ser
  // den inte (se promptens ersättning) och får varken skapa eller ändra den —
  // den hämtas alltid tillbaka från den sparade sajten via sektionens id.
  const oldEmbeds = new Map<string, any>();
  for (const pg of content.pages) for (const sec of pg.sections as any[]) if (sec.type === "embed") oldEmbeds.set(sec.id, sec);
  for (const pg of pages) {
    for (const sec of pg.sections as any[]) {
      if (sec.type !== "embed") continue;
      const old = oldEmbeds.get(sec.id);
      if (old?.code) sec.code = old.code; else delete sec.code;
      if (old?.height && sec.height === undefined) sec.height = old.height;
    }
  }

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
    if (t.buttonStyle !== undefined && !["pill", "square", "underline", "soft", "outline", "rounded", "gradient"].includes(t.buttonStyle)) {
      if (content.theme.buttonStyle) merged.theme.buttonStyle = content.theme.buttonStyle;
      else delete merged.theme.buttonStyle;
    }
    if (t.headerLayout !== undefined && !(HEADER_LAYOUTS as readonly string[]).includes(t.headerLayout)) {
      if (content.theme.headerLayout) merged.theme.headerLayout = content.theme.headerLayout;
      else delete merged.theme.headerLayout;
    }
    const cta = (patch.theme as { headerCta?: { path?: string; label?: string; off?: boolean; hideFromMenu?: boolean; style?: string; color?: string } }).headerCta;
    if (cta !== undefined) {
      // Skickar Millie bara ett fält (t.ex. style) ska resten av knappen behållas.
      const prevCta = content.theme.headerCta;
      const sentAny = !!cta && Object.keys(cta).length > 0;
      const next: { path?: string; label?: string; off?: boolean; hideFromMenu?: boolean; style?: any; color?: string } = sentAny && prevCta ? { ...prevCta } : {};
      if (sentAny && cta.off !== true) delete next.off;
      if (cta?.style === "auto") delete next.style;
      if (cta && typeof cta.color === "string") { if (/^#[0-9a-fA-F]{6}$/.test(cta.color.trim())) next.color = cta.color.trim(); else delete next.color; }
      if (cta && typeof cta.path === "string" && content.pages.some((pg) => pg.path === cta.path)) next.path = cta.path;
      if (cta && typeof cta.label === "string" && cta.label.trim()) next.label = cta.label.trim().slice(0, 30);
      if (cta?.off === true) next.off = true;
      if (cta?.hideFromMenu === true) next.hideFromMenu = true;
      if (cta?.hideFromMenu === false) delete next.hideFromMenu;
      if (cta && typeof cta.style === "string" && ["pill", "square", "underline", "soft", "outline", "rounded", "gradient"].includes(cta.style)) next.style = cta.style;
      if (Object.keys(next).length) merged.theme.headerCta = next;
      else delete merged.theme.headerCta;
    }
    // En menyknapp syns bara i header-stilar med knapp. Har Millie satt en
    // knapp (text/sida) men sajten har en stil utan knapp: byt till motsvarande
    // stil med knapp, annars händer ingenting synligt.
    {
      const ctaNow = merged.theme.headerCta;
      const lay = merged.theme.headerLayout;
      if (ctaNow && !ctaNow.off && (ctaNow.path || ctaNow.label) && !(HEADER_BUTTON_LAYOUTS as readonly string[]).includes(lay ?? "left")) {
        merged.theme.headerLayout = lay === "split" ? "split-button" : lay === "centered-stacked" ? "centered-button" : "left-button";
      }
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
        if (sec.ctaStyle === undefined && old?.ctaStyle) sec.ctaStyle = old.ctaStyle;
        if (sec.ctaStyle !== undefined && !["pill", "square", "underline", "soft", "outline", "rounded", "gradient"].includes(sec.ctaStyle)) delete sec.ctaStyle;
        if (sec.fadeTop === undefined && old?.fadeTop) sec.fadeTop = old.fadeTop;
        if (sec.fadeTop !== undefined && sec.fadeTop !== true) delete sec.fadeTop;
        if (sec.fadeBottom === undefined && old?.fadeBottom) sec.fadeBottom = old.fadeBottom;
        if (sec.fadeBottom !== undefined && sec.fadeBottom !== true) delete sec.fadeBottom;
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
  // Flytta sidor mellan nivåer i menyn (undersida eller egen huvudsida).
  if (Array.isArray(patch.movePages)) {
    for (const mv of patch.movePages.slice(0, 10)) {
      if (!mv || typeof mv.path !== "string") continue;
      const parent = typeof mv.newParent === "string" && mv.newParent.trim() && mv.newParent.trim() !== "/" ? mv.newParent.trim() : null;
      const res = reparentPage(merged.pages as any[], mv.path, parent);
      if ("error" in res) moveErrors.push(`${mv.path}: ${res.error}`);
      else merged.pages = res.pages as typeof merged.pages;
    }
  }
  // Menysektioner: rensa det Millie skrivit direkt i en sektion, och utför
  // sedan hennes menyändringar (lägg till/ändra/ta bort rätter).
  for (const pg of merged.pages) {
    for (const sec of pg.sections as any[]) {
      if (sec.type === "menu") sec.categories = cleanCategories(Array.isArray(sec.categories) ? sec.categories : []);
    }
  }
  if (Array.isArray(patch.menuOps) && patch.menuOps.length > 0) {
    applyMenuOps(merged, patch.menuOps, currentPath, moveErrors, getT());
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
  // Huvudsökord: kort ren text, tom sträng tar bort det.
  if (typeof patch.seoKeyword === "string") {
    const kw = patch.seoKeyword.replace(/&/g, "och").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (kw) merged.seoKeyword = kw;
    else delete merged.seoKeyword;
  }
  // Bildtexter (alt): bara för bilder som faktiskt finns på sajten, trimmade
  // och kortade. Tom sträng = ta bort. Orörda bilder behåller sin text.
  if (patch.imageAlts && typeof patch.imageAlts === "object") {
    const used = new Set<string>();
    JSON.stringify(merged.pages, (_k, v) => {
      if (typeof v === "string") used.add(v);
      return v;
    });
    const alts: Record<string, string> = { ...(merged.imageAlts || {}) };
    for (const [url, raw] of Object.entries(patch.imageAlts).slice(0, 80)) {
      if (!used.has(url)) continue;
      const v = String(raw ?? "").replace(/&/g, "och").trim().slice(0, 125);
      if (v) alts[url] = v;
      else delete alts[url];
    }
    if (Object.keys(alts).length > 0) merged.imageAlts = alts;
    else delete merged.imageAlts;
  }
  return merged;
}

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`edit:user:${user.id}`, 100, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: t("Skriv vad du vill ändra.") }, { status: 400 });
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
    return NextResponse.json({ error: t("Hittade ingen sajt att redigera.") }, { status: 400 });
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const existingNewsCategories = await getSiteNewsCategories(supabase, site.id);
  // Sajtens tidszon och befintliga artiklar — Millie behöver båda för att
  // kunna schemalägga ("nästa måndag") och ändra publicering på rätt artikel.
  const { data: bookingSt } = await supabase.from("booking_settings").select("timezone").eq("site_id", site.id).maybeSingle();
  const newsTz: string = (bookingSt as any)?.timezone || DEFAULT_TIMEZONE;
  const existingArticles = (await getSiteNewsArticles(supabase, site.id)).slice(0, 15);
  const nowLocal = new Intl.DateTimeFormat("sv-SE", { timeZone: newsTz, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const fmtArt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: newsTz, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "");
  const articleList = existingArticles.length
    ? existingArticles.map((a) => `"${a.title}" (${a.published ? "publicerad" : a.scheduled_at ? "schemalagd " + fmtArt(a.scheduled_at) : "utkast"}${a.unpublish_at && new Date(a.unpublish_at).getTime() > Date.now() ? ", avpubliceras " + fmtArt(a.unpublish_at) : ""})`).join("; ")
    : "inga artiklar än";
  const newsContext = `PUBLICERING OCH SCHEMALÄGGNING av nyheter: klockan är nu ${nowLocal} (sajtens tidszon ${newsTz}) — räkna ut relativa datum ("nästa måndag", "om två veckor", "1 november") från det och ange klockslag som lokal tid ÅÅÅÅ-MM-DDTTT:mm i "publishAt"/"unpublishAt". Kunden kan be om att en nyhet publiceras vid en viss tid ("publishAt") och/eller tas ner automatiskt vid en viss tid ("unpublishAt", t.ex. när en kampanj tar slut). Säg alltid i "summary" exakt vilka datum och klockslag du satt, så kunden kan rätta dig. Skapar du en nyhet och kunden INTE har sagt något om när den ska ut, sparas den som utkast (published false) och du frågar i "summary" kort om de vill publicera direkt, schemalägga den (och i så fall när) eller behålla den som utkast, och om den ska tas ner automatiskt vid ett visst datum (t.ex. för en kampanj) — och ger 2-3 klickbara svar i "nextOptions" (t.ex. "Publicera nyheten direkt", "Schemalägg nyheten", "Behåll som utkast"). Har kunden redan sagt hur den ska ut, fråga inte. Svarar kunden på din fråga (eller ber om ändrad publicering av en artikel som redan finns) ändrar du den BEFINTLIGA artikeln med "newsUpdate" — skapa aldrig en ny artikel för det, och utelämna "newsArticle" då. Skriver kunden bara "schemalägg" utan tid, fråga efter datum och klockslag i "summary" och gör inga ändringar. Ber kunden om att ändra rubrik, ingress, text eller kategori på en artikel som redan finns ("korta ner nyheten om skorna", "byt rubrik", "flytta den till Erbjudanden") gör du det med "newsUpdate" och fälten newTitle/newExcerpt/newBody/newCategory (newBody = hela den nya texten, på sajtens språk) — skapa aldrig en ny artikel och tappa ingenting som kunden inte bett om att ändra. Raderas en artikel sätter du deleteArticle: true, men BARA när kunden uttryckligen bett om att ta bort/radera den; är det oklart om kunden menar radera eller bara ta ner (utkast), fråga i "summary" och gör inga ändringar. Säg i "summary" vilken artikel som ändrats eller raderats. Sajtens artiklar just nu: ${articleList}.`;
  const uiLang = getLocale();
  const siteLang: string = isLocale((site as any).language) ? (site as any).language : "sv";
  const languageRule = `SPRÅK — kunden använder verktyget på ${LANGUAGE_ENGLISH[uiLang]} och sajten är skriven på ${LANGUAGE_ENGLISH[siteLang]}.
- Du förstår kundens önskemål på vilket språk som helst. Skriv "summary", frågor och "clarifyOptions" på samma språk som kundens senaste meddelande (annars ${LANGUAGE_ENGLISH[uiLang]}).
- Allt nytt innehåll du skriver PÅ SAJTEN (texter, rubriker, knappar, menynamn, nyheter, frågor och svar) skrivs på sajtens språk (${LANGUAGE_ENGLISH[siteLang]}), även om kunden ber om ändringen på ett annat språk, om inte kunden uttryckligen ber om ett annat språk för just det stället.
- Ber kunden om att sajten ska byta språk eller översättas, sätt "siteLanguage" till den nya språkkoden och översätt ALL synlig text på de sidor du ändrar (rubriker, brödtext, knappar, menynamn, sidnamn). Översätt aldrig namn på företag, personer, produkter eller adresser.
- Skriv ALDRIG tecknet "&" (et-tecken) i texter på sajten (rubriker, brödtext, knappar, menynamn, nyheter, frågor och svar) — stava alltid ut ordet på sajtens språk (och, and, og, ja, und, et, y). Gäller även när kunden själv skriver "&" i sitt önskemål, utom i ett företags- eller varumärkesnamn som kunden uttryckligen anger.
- Lokal anpassning: tilltal, datum, telefonformat och valuta ska följa sajtens språk och land. Hitta aldrig på uppgifter.

`;
  const th: any = site.content.theme || {};
  const menuStatus = `MENYNS NUVARANDE LÄGE (läs det här, lita inte på tidigare chattmeddelanden): headerLayout=${th.headerLayout ?? "left (standard)"}; menyknapp ${HEADER_BUTTON_LAYOUTS.includes(th.headerLayout) ? "stil med knapp finns" : "stilen har INGEN knapp, så ingen knapp syns"}; headerCta=${JSON.stringify(th.headerCta ?? null)}; headerGlass=${th.headerGlass ? "ja" : "nej"}; startsidans första sektion=${(site.content.pages[0]?.sections[0] as any)?.type ?? "?"}/${(site.content.pages[0]?.sections[0] as any)?.layout ?? "?"} (genomskinlig meny syns bara över en hero med bild i layouten overlay-bottom, fade-bottom eller beam). Säg aldrig att menyn är genomskinlig om den inte syns enligt det här.

`;
  const promptText = languageRule + menuStatus + buildEditPrompt(site.content, message, buildAttachmentNote(attachments), currentPath, selection, existingNewsCategories, newsContext);

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
      max_tokens: 12000,
      // Verktygsschemat är lika vid varje anrop — cacheas så att det inte
      // behöver bearbetas på nytt (snabbare svar och lägre kostnad).
      tools: [{ ...EDIT_TOOL, cache_control: { type: "ephemeral" } }],
      tool_choice: { type: "tool", name: "edit_site" },
      messages,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Kunde inte genomföra ändringen just nu: " + (e?.message || "okänt fel") },
      { status: 502 }
    );
  }

  await logAiUsage({ kind: "edit", model: CLAUDE_MODEL, usage: response.usage, userId: user.id, siteId: site.id });

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: t("AI-svaret innehöll ingen uppdatering.") }, { status: 502 });
  }

  const patch = toolUse.input as EditPatch;
  // Kontrollfråga: Millie är osäker och ger kunden alternativ att klicka på
  // istället för att gissa. Inget ändras eller sparas.
  const clarifyOptions = Array.isArray(patch.clarifyOptions)
    ? patch.clarifyOptions
        .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
        .map((o) => o.trim().slice(0, 120))
        .slice(0, 5)
    : [];
  if (clarifyOptions.length >= 2 && patch.summary) {
    return NextResponse.json({
      content: site.content,
      summary: patch.summary,
      unsupported: false,
      options: clarifyOptions,
      // Små förhandsbilder (components/MenuStyleThumb.tsx), samma ordning som alternativen.
      optionPreviews: patch.clarifyPreview === "menu" && clarifyOptions.length === 5 ? ["left-button", "split-button", "centered-button", "pill-bar", "minimal"] : undefined,
      newsArticle: null,
    });
  }
  if (patch.changedPages && !patch.changedPages.every(isValidSitePage)) {
    return NextResponse.json({ error: t("AI-svaret hade fel format.") }, { status: 502 });
  }

  const moveErrors: string[] = [];
  const updatedContent = dedupeMaps(applyPatch(site.content, patch, moveErrors, currentPath), "flatten-form");
  // Säkerhetsnät: nya eller ändrade texter får aldrig innehålla " & ". Redan
  // befintliga texter (t.ex. kundens eget företagsnamn) rörs inte.
  {
    const andWord: Record<string, string> = { sv: "och", en: "and", da: "og", fi: "ja", de: "und", fr: "et", es: "y" };
    const word = andWord[(site as any).language as string] || "och";
    const oldStrings = new Set<string>();
    const collect = (v: unknown) => {
      if (typeof v === "string") oldStrings.add(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") Object.values(v as object).forEach(collect);
    };
    collect(site.content);
    const clean = (v: any, key?: string): any => {
      if (typeof v === "string") {
        if (key === "code" || oldStrings.has(v) || !v.includes(" & ") || /^(https?:)?\//.test(v)) return v;
        return v.replace(/ & /g, ` ${word} `);
      }
      if (Array.isArray(v)) return v.map((x) => clean(x));
      if (v && typeof v === "object") {
        for (const k of Object.keys(v)) v[k] = clean(v[k], k);
      }
      return v;
    };
    clean(updatedContent.pages);
  }
  if (!updatedContent.pages.length) {
    return NextResponse.json({ error: t("Ändringen skulle lämna sajten utan sidor.") }, { status: 502 });
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
  // Logga: byts bara när kunden uttryckligen bett om det OCH bifogat en bild
  // (se logoAction i verktyget) — annars behålls onboardingens logga.
  let newLogoUrl: string | null | undefined = undefined; // undefined = oförändrad
  let logoNote = "";
  if (patch.logoAction === "set") {
    const first = imageAttachments[0];
    if (first) {
      newLogoUrl = first.url;
    } else {
      logoNote = "Jag kunde inte byta loggan eftersom ingen bild var bifogad. Bifoga loggan med gemet och be mig igen.";
    }
  } else if (patch.logoAction === "remove") {
    newLogoUrl = null;
  }
  // Kontroll mot "låtsas-ändringar": påstår Millie att hon gjort något men
  // sajten är oförändrad (och ingen nyhet/logga/ändring i övrigt gjordes),
  // sparar vi inget och säger det ärligt till kunden — med möjlighet att
  // skicka önskemålet till oss.
  const baseline = dedupeMaps(applyPatch(site.content, { summary: "" } as EditPatch), "flatten-form");
  const contentChanged = JSON.stringify(updatedContent) !== JSON.stringify(baseline);
  const hasNews = !!(patch.newsArticle && normalizeCategory(patch.newsArticle.category) && patch.newsArticle.title?.trim() && patch.newsArticle.body?.trim()) || !!(patch.newsUpdate?.title?.trim());
  // Menyknappen kräver en stil med knapp. Finns en knapp (headerCta) men stilen
  // saknar knapp byter vi till motsvarande stil med knapp, oavsett vad Millie
  // skickade — annars syns ingenting.
  let headerFixed = false;
  {
    const c = updatedContent.theme.headerCta;
    const lay = updatedContent.theme.headerLayout;
    if (c && !c.off && (c.path || c.label) && !(HEADER_BUTTON_LAYOUTS as readonly string[]).includes(lay ?? "left")) {
      updatedContent.theme.headerLayout = lay === "split" ? "split-button" : lay === "centered-stacked" ? "centered-button" : "left-button";
      headerFixed = true;
    }
  }
  const didSomething = headerFixed || contentChanged || hasNews || newLogoUrl !== undefined || patch.exampleContentResolved === true;
  if (!didSomething && patch.answerOnly !== true && patch.unsupported !== true) {
    return NextResponse.json({
      content: site.content,
      summary:
        logoNote ||
        "Det där fick jag inte till – inget har ändrats på sajten. Skicka gärna önskemålet till oss, så tittar vi på om vi kan lära mig det.",
      unsupported: true,
      noChange: true,
      newsArticle: null,
    });
  }
  const effectiveLogo = newLogoUrl === undefined ? site.logo_url : newLogoUrl;
  if (effectiveLogo) updatedContent.logoUrl = effectiveLogo;
  else delete updatedContent.logoUrl;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) {
    updatedContent.socialLinks = site.social_links;
  }

  // Nya sektioner med bildplats (t.ex. en ny hero eller en bokning med
  // bildlayout) får sajtens egna foton i stället för en tom platshållare.
  // Rör bara sidor som ändrades i den här redigeringen.
  {
    const before = new Map((site.content as SiteContent).pages.map((pg) => [pg.path, JSON.stringify(pg)]));
    const changedPaths = new Set(updatedContent.pages.filter((pg) => before.get(pg.path) !== JSON.stringify(pg)).map((pg) => pg.path));
    if (changedPaths.size > 0 && pagesNeedingImages(updatedContent, changedPaths)) {
      const { data: assetRows } = await supabase
        .from("site_assets")
        .select("file_url")
        .eq("site_id", site.id)
        .eq("kind", "image");
      fillMissingImages(updatedContent, (assetRows || []).map((r: { file_url: string }) => r.file_url), changedPaths);
    }
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
      ...(newLogoUrl !== undefined ? { logo_url: newLogoUrl } : {}),
    })
    .eq("id", site.id);

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  // Sajtens språk (cookiebanner, bokning, kundmejl) följer med när kunden
  // bett Millie översätta sajten. Kolumnen finns efter supabase/sprak.sql.
  let newSiteLanguage: string | null = null;
  if (isLocale(patch.siteLanguage) && patch.siteLanguage !== siteLang) {
    const { error: langError } = await supabase.from("sites").update({ language: patch.siteLanguage }).eq("id", site.id);
    if (!langError) newSiteLanguage = patch.siteLanguage;
  }

  // Skapar en ny nyhetsartikel i en EGEN tabell (site_news_articles) om
  // Claude bad om det (patch.newsArticle) — skild från sajtens sidinnehåll
  // ovan, se NewsArticle i lib/newsArticles.ts. Precis som för bilder i
  // sajtens sektioner väljer koden (inte Claude) vilken bild artikeln får:
  // den FÖRSTA bifogade bilden i det här meddelandet, om någon — Claude
  // ombeds aldrig ange en bild-URL själv (se verktygets fältbeskrivning).
  let newsArticle: NewsArticle | null = null;
  let newsSaveFailed = false;
  const newsDropped: string[] = [];
  let newsUpdateMiss = false;
  let newsDeleted: string | null = null;
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
    const newsTiming = resolveNewsTiming({ publishNow: patch.newsArticle.published === true, publishAt: patch.newsArticle.publishAt, unpublishAt: patch.newsArticle.unpublishAt, tz: newsTz });
    newsDropped.push(...newsTiming.dropped);
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
        published: newsTiming.published,
        published_at: newsTiming.published ? nowIso : null,
        scheduled_at: newsTiming.scheduled_at,
        unpublish_at: newsTiming.unpublish_at,
      })
      .select("*")
      .single();
    // Ett misslyckat artikelsparande ska inte få hela ändringen (som redan
    // sparats ovan) att se ut som att den misslyckades för kunden — bara
    // artikeln uteblir, resten av svaret går igenom som vanligt.
    if (!newsError) newsArticle = inserted as NewsArticle;
    else newsSaveFailed = true;
  }

  // Ändrad publicering av en BEFINTLIG artikel (patch.newsUpdate).
  if (patch.newsUpdate?.title && !patch.newsArticle) {
    const wanted = patch.newsUpdate.title.trim().toLowerCase();
    const all = await getSiteNewsArticles(supabase, site.id);
    const existing = all.find((a) => a.title.trim().toLowerCase() === wanted) || all.find((a) => a.title.toLowerCase().includes(wanted));
    if (!existing) {
      newsUpdateMiss = true;
    } else {
      const u = patch.newsUpdate;
      const nowIso = new Date().toISOString();
      const upd: Record<string, unknown> = { updated_at: nowIso };
      if (u.makeDraft === true) {
        Object.assign(upd, { published: false, scheduled_at: null, unpublish_at: null });
      } else if (u.published === true || u.publishAt) {
        const r = resolveNewsTiming({ publishNow: u.published === true, publishAt: u.publishAt, unpublishAt: u.unpublishAt, tz: newsTz });
        newsDropped.push(...r.dropped);
        if (r.published || r.scheduled_at) {
          upd.published = r.published;
          upd.scheduled_at = r.scheduled_at;
          upd.unpublish_at = u.clearUnpublish === true ? null : r.unpublish_at;
          if (r.published && !existing.published) upd.published_at = nowIso;
        }
      } else if (u.unpublishAt) {
        const r = resolveNewsTiming({ publishNow: existing.published, publishAt: existing.scheduled_at ? undefined : undefined, unpublishAt: u.unpublishAt, tz: newsTz });
        newsDropped.push(...r.dropped);
        const sched = existing.scheduled_at ? new Date(existing.scheduled_at).getTime() : 0;
        if (r.unpublish_at && new Date(r.unpublish_at).getTime() > sched && (existing.published || existing.scheduled_at)) upd.unpublish_at = r.unpublish_at;
        else if (r.unpublish_at) newsDropped.push(msg("avpubliceringen kunde inte sättas på en artikel som inte är publicerad eller schemalagd"));
      }
      if (u.clearUnpublish === true) upd.unpublish_at = null;
      if (typeof u.newTitle === "string" && u.newTitle.trim()) upd.title = u.newTitle.trim().slice(0, 120);
      if (typeof u.newExcerpt === "string") upd.excerpt = u.newExcerpt.trim().slice(0, 300) || null;
      if (typeof u.newBody === "string" && u.newBody.trim()) upd.body = u.newBody.trim().slice(0, 20000);
      if (typeof u.newCategory === "string" && normalizeCategory(u.newCategory)) upd.category = normalizeCategory(u.newCategory);
      if (u.deleteArticle === true) {
        const { error: delErr } = await supabase.from("site_news_articles").delete().eq("id", existing.id).eq("site_id", site.id);
        if (delErr) newsSaveFailed = true;
        else newsDeleted = existing.title;
      }
      if (u.deleteArticle !== true) {
      const { data: updated, error: updErr } = await supabase.from("site_news_articles").update(upd).eq("id", existing.id).eq("site_id", site.id).select("*").single();
      if (!updErr && updated) newsArticle = updated as NewsArticle;
      else newsSaveFailed = true;
      }
    }
  }

  // Varningar kunden ska få veta om direkt: en nyhet som inte syns någonstans,
  // en nyhet som inte gick att spara, eller en borttagen nyhetslista.
  const hasNewsList = (c: SiteContent) => c.pages.some((pg) => pg.sections.some((sec) => sec.type === "newsList"));
  // En befintlig sida som heter något med "nyhet" (t.ex. "Nyheter") — då
  // erbjuds nyhetslistan där i stället för att skapa en ny sida.
  const newsPage = updatedContent.pages.find((pg) => /nyhet/i.test(pg.label) || /nyhet/i.test(pg.path));
  let warning: string | undefined;
  let followUp: string[] | undefined;
  if (newsUpdateMiss) {
    warning = t("Jag hittade ingen nyhet med den rubriken, så inget ändrades. Kolla rubriken under Nyheter i panelen och försök igen.");
  } else if (newsDropped.length > 0) {
    warning = t("En del av tiderna sparades inte ({orsaker}). Berätta gärna datum och klockslag igen så fixar jag det.", { orsaker: Array.from(new Set(newsDropped)).map((n) => t(n)).join("; ") });
  } else if (newsSaveFailed) {
    warning = t("Nyheten gick inte att spara just nu, så den finns inte med. Försök igen om en stund, eller skriv den under Nyheter i panelen.");
  } else if (newsArticle && !hasNewsList(updatedContent)) {
    warning = newsArticle.published
      ? t("Nyheten \"{titel}\" är sparad som publicerad, men ingen sida på sajten har en nyhetslista, så den syns inte för besökarna än. Vill du att jag lägger till en?", { titel: newsArticle.title })
      : t("Nyheten \"{titel}\" är sparad som utkast, men ingen sida på sajten har en nyhetslista, så den syns inte för besökarna än. Vill du att jag lägger till en?", { titel: newsArticle.title });
    followUp = [
      newsPage ? t("Lägg till nyhetslistan på sidan {sida}", { sida: newsPage.label }) : t("Skapa en ny sida som heter Nyheter med nyhetslistan"),
      t("Lägg till en nyhetslista längst ner på startsidan"),
    ];
  } else if (hasNewsList(site.content) && !hasNewsList(updatedContent)) {
    const { count } = await supabase
      .from("site_news_articles")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id);
    if (count && count > 0) {
      warning = t("Nyhetslistan är borttagen från sajten, så dina {antal} nyheter syns inte längre för besökarna. Vill du ha tillbaka den?", { antal: count });
      // Sidan som tidigare hade listan, annars en sida som heter något med "nyhet".
      const formerPage = (site.content as SiteContent).pages.find(
        (pg) => pg.sections.some((sec) => sec.type === "newsList") && updatedContent.pages.some((u) => u.path === pg.path)
      );
      const target = formerPage || newsPage;
      followUp = [
        target ? t("Lägg tillbaka nyhetslistan på sidan {sida}", { sida: target.label }) : t("Skapa en ny sida som heter Nyheter med nyhetslistan"),
        t("Nej, låt den vara borta"),
      ];
    }
  }

  if (!warning && moveErrors.length > 0) {
    warning = t("En sida kunde inte flyttas i menyn. Kontrollera att huvudsidan finns och att sidan inte själv har undersidor, så försöker jag igen.");
  }

  return NextResponse.json({
    content: updatedContent,
    summary: logoNote ? logoNote : patch.summary,
    unsupported: patch.unsupported === true,
    newsArticle,
    nextOptions: Array.isArray(patch.nextOptions) ? patch.nextOptions.filter((o): o is string => typeof o === "string" && !!o.trim()).map((o) => o.trim().slice(0, 120)).slice(0, 3) : undefined,
    warning,
    followUp,
    siteLanguage: newSiteLanguage,
  });
}

export const POST = withErrorLog("POST /api/sites/edit", POST_handler);
