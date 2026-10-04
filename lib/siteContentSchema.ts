// Delat JSON-schema för sajtens innehållsmodell (lib/contentModel.ts),
// använt av både /api/sites/generate (hela sajten på en gång, i
// onboardingen) och /api/sites/edit (en riktad ändring i chattredigeraren)
// för att tvinga Claude svara med giltig, strukturerad JSON enligt
// modellen — aldrig fri text eller rå HTML, och aldrig fält utanför det
// contentModel.ts faktiskt stödjer.
export const SECTION_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "hero" },
        layout: {
          type: "string",
          enum: ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom", "collage", "quad", "editorial"],
          description:
            "\"fade-bottom\": bilden tonar ut mjukt i sidans bakgrund, texten ligger därunder på vanlig bakgrund — ingen \"kortruta\" eller fullbred overlay. Ett lugnare, mer organiskt alternativ till \"centered\" och \"overlay-bottom\". \"collage\": ett redaktionellt, bildrikt intryck — flera bilder i en överlappande komposition bredvid texten, med plats för headlineEmphasis (en kursiv fortsättning på rubriken) och stats (en kort nyckeltalsrad under knappen). Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan. \"quad\" (ny): ett 2x2-rutnät — textruta (tonad i accentfärgen) uppe till vänster, ett foto uppe till höger, ett andra foto nere till vänster (med ett litet flytande nyckeltalskort ovanpå, från stats), och en till tonad textruta nere till höger med resten av stats. Används bara när stilvarianten faktiskt är \"Ren och strukturerad\". \"editorial\" (ny): text till vänster (rubrik + en kursiv headlineEmphasis-rad) och en stor stående bild till höger, med ett mindre andra foto (collageImageUrls) lager-på-lager nere i bildens vänstra hörn och en liten dekorativ sidnumrering i hörnet. Används bara när stilvarianten faktiskt är \"Redaktionell helbild\".",
        },
        eyebrow: { type: "string" },
        headline: { type: "string" },
        // Bara meningsfullt tillsammans med layout "collage" — se
        // beskrivningen i lib/contentModel.ts. Utelämna för alla andra
        // layouter.
        headlineEmphasis: {
          type: "string",
          description:
            "Bara för layout \"collage\": en kort, fristående fortsättning på rubriken som visas KURSIVT på en egen rad (t.ex. rubrik \"Turn Your Vision\", headlineEmphasis \"Into Something Real\"). Utelämna för andra layouter.",
        },
        body: { type: "string" },
        ctaLabel: { type: "string" },
        ctaLink: {
          type: "string",
          description:
            "Vart knappen leder: antingen en exakt sidväg från pages[].path (t.ex. \"/kontakt\"), eller en fullständig extern URL (https://...). Utelämna helt om knappen inte ska vara klickbar.",
        },
        imageUrl: { type: "string" },
        stats: {
          type: "array",
          description:
            "Bara för layout \"collage\": en rad med 2-3 korta nyckeltal under CTA-knappen (t.ex. {value: \"Sedan 2014\", label: \"i branschen\"}). KRITISKT — HITTA ALDRIG PÅ siffror om antal kunder, omdömen/betyg eller länder/orter. Använd BARA fakta kunden faktiskt skrivit i sin brief (grundat år, antal anställda, certifiering, antal orter om kunden sagt det) uttryckt med ORD, inte en påhittad siffra (\"Familjeägt sedan 2014\" är okej, \"50 000+ nöjda kunder\" är INTE okej om kunden inte sagt att de har 50 000 kunder). Finns inga sådana verifierbara fakta i briefen: utelämna fältet helt.",
          items: {
            type: "object",
            properties: { value: { type: "string" }, label: { type: "string" } },
            required: ["value", "label"],
          },
        },
      },
      required: ["id", "type", "layout", "headline", "body"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "about" },
        layout: {
          type: "string",
          enum: ["text-left", "centered"],
          description:
            "\"text-left\" (vänsterställd, bredare text) eller \"centered\" (centrerad, smalare — känns mer redaktionell/luftig). Variera mellan sajter, inte alltid samma.",
        },
        heading: { type: "string" },
        body: { type: "string" },
      },
      required: ["id", "type", "layout", "heading", "body"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "grid" },
        layout: {
          type: "string",
          enum: ["cards", "alternating-rows", "list", "numbered", "bento", "icon-row"],
          description:
            "\"bento\": ett asymmetriskt rutnät där det FÖRSTA objektet i items visas större (dubbel bredd/höjd) och resten mindre, som en modern \"bento box\"-layout — ger variation i storlek istället för jämna rutor. Passar 3-5 items. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\"). \"icon-row\" (ny): en smal rad med 3-4 korta punkter (bara rubrik + kort body, ingen bild) i jämna kolumner, med en liten dekorativ cirkel-ikon ovanför varje — passar som en kompakt \"fördelar i korthet\"-rad direkt under en hero, inte som sidans enda innehåll.",
        },
        heading: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, body: { type: "string" }, imageUrl: { type: "string" } },
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
        layout: {
          type: "string",
          enum: ["single-quote", "carousel-row", "side-by-side", "full-bleed", "carousel-arrows"],
          description:
            "\"single-quote\" (ett citat över en toned konstbakgrund), \"carousel-row\" (flera citat i kort sida vid sida), \"side-by-side\" (rubrik och citat i två kolumner), \"full-bleed\" (en RIKTIG bild som täcker hela sektionens bredd, med ett enda citat centrerat ovanpå en mörk tonad gradient — dramatiskt och rent, som en knivskarp paus mellan sidans andra sektioner; bara det första citatet i items visas), eller \"carousel-arrows\" (ny: ett citat i taget i ett centrerat kort, med klickbara pil-knappar och prickar under för att bläddra mellan flera citat — kräver minst 2 items för att kännas meningsfull).",
        },
        heading: { type: "string" },
        imageUrl: { type: "string" },
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
        layout: {
          type: "string",
          enum: ["centered", "split", "image-bleed"],
          description:
            "\"image-bleed\" (ny): en riktig bild täcker hela sektionens bredd bakom en mörk gradient, med rubrik/text VÄNSTERSTÄLLD ovanpå — ett dramatiskt, redaktionellt avbrott mellan andra sektioner. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\").",
        },
        heading: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
        ctaLink: {
          type: "string",
          description:
            "Vart knappen leder: antingen en exakt sidväg från pages[].path (t.ex. \"/kontakt\"), eller en fullständig extern URL (https://...). Utelämna helt om knappen inte ska vara klickbar.",
        },
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
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "gallery" },
        layout: { type: "string", enum: ["grid", "carousel"] },
        heading: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { imageUrl: { type: "string" }, caption: { type: "string" } },
          },
        },
      },
      required: ["id", "type", "layout", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "faq" },
        layout: {
          type: "string",
          enum: ["stacked", "two-column"],
          description: "\"stacked\" (en lång lista) eller \"two-column\" (två spalter sida vid sida — passar fler frågor bättre).",
        },
        heading: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
          },
        },
      },
      required: ["id", "type", "layout", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "map" },
        layout: {
          type: "string",
          enum: ["inline", "full-bleed"],
          description: "\"inline\" (ett inramat kort, mindre) eller \"full-bleed\" (kartan går ut i hela sidans bredd — mer dramatiskt).",
        },
        heading: { type: "string" },
        address: {
          type: "string",
          description:
            "Adressen som visas i en inbäddad Google Maps-karta, EXAKT som kunden gett den (gata, postnummer, ort), t.ex. \"Storgatan 1, 582 24 Linköping\". Hitta aldrig på en adress.",
        },
      },
      required: ["id", "type", "layout", "address"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "contactForm" },
        layout: {
          type: "string",
          enum: ["centered", "split-map"],
          description:
            "\"split-map\" lägger en inbäddad karta BREDVID formuläret (kräver \"address\" ifylld) — använd det här, inte en separat \"map\"-sektion, när kunden vill ha ett formulär och en karta sida vid sida: sektioner läggs annars alltid under varandra, aldrig bredvid, oavsett typ.",
        },
        heading: { type: "string" },
        body: { type: "string" },
        submitLabel: { type: "string" },
        address: {
          type: "string",
          description:
            "Bara använd när layout är \"split-map\" — adressen som visas i kartan bredvid formuläret, EXAKT som kunden gett den. Hitta aldrig på en adress.",
        },
      },
      required: ["id", "type", "heading"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "newsList" },
        heading: { type: "string" },
      },
      required: ["id", "type", "heading"],
      description:
        "Visar kundens PUBLICERADE nyhetsartiklar som ett klickbart rutnät (bild, titel, ingress) — varje artikel länkar till en egen sida med hela texten och bilden. Lägg bara till en \"heading\" här — artiklarnas eget innehåll (titel, text, bild) skrivs och publiceras av kunden själv på \"Nyheter\"-sidan i panelen, aldrig av dig. Hittar INTE på artiklar eller artikelinnehåll. Högst en sådan sektion per sida.",
    },
  ],
};

// En enskild sidas EGEN bakgrund, skild från sajtens övergripande tema
// (theme.backgroundMode ovan) — se SitePageContent.backgroundMode i
// lib/contentModel.ts för varför det är ett av tre färdiga lägen, inte en
// fri hex-färg.
const PAGE_BACKGROUND_MODE_SCHEMA = {
  type: "string",
  enum: ["light", "warm", "dark"],
  description:
    "Utelämna HELA detta fält om den här sidan ska se ut som resten av sajten (vanligast, och alltid rätt om kunden inte bett om något annat). Sätt det bara om kunden uttryckligen vill ha en ANNAN bakgrund på JUST den här sidan än sajtens vanliga tema — \"light\" (ljus/vit), \"warm\" (varm/beige) eller \"dark\" (mörk/svart, det kunden oftast menar med \"svart bakgrund\"). Byter du läge görs HELA sidan om (header, sektioner och sidfot när besökaren är på den sidan) — text och kortfärger justeras automatiskt så allt syns, ingen egen textfärg behöver eller ska anges.",
};

// Egenskaperna för SJÄLVA innehållet (utan "summary" m.m. som bara
// edit-routen behöver ovanpå det här) — delas rakt av mellan verktygens
// input_schema.
export const SITE_CONTENT_PROPERTIES = {
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
        backgroundMode: PAGE_BACKGROUND_MODE_SCHEMA,
      },
      required: ["path", "label", "sections"],
    },
  },
};

export const SITE_CONTENT_REQUIRED = ["theme", "pages"];

// Google Analytics/Meta Pixel-ID — se SiteContent.gaMeasurementId i
// lib/contentModel.ts. Bara i EDIT_PATCH_PROPERTIES nedan (inte i
// SITE_CONTENT_PROPERTIES ovan): dessa sätts aldrig vid förstagångs-
// genereringen, bara senare av kunden själv (sajtinställningarna i
// chattredigeraren, eller genom att be Millie om det).
const GA_MEASUREMENT_ID_SCHEMA = {
  type: "string",
  description:
    "Kundens Google Analytics-mät-ID, t.ex. \"G-XXXXXXXXXX\" (äldre \"UA-XXXXXXX-X\" går också). Sätt bara när kunden uttryckligen gett dig ett ID att koppla på. Vill kunden koppla BORT Google Analytics, sätt till en tom sträng.",
};
const META_PIXEL_ID_SCHEMA = {
  type: "string",
  description:
    "Kundens Meta (Facebook) Pixel-ID — bara siffror. Sätt bara när kunden uttryckligen gett dig ett ID att koppla på. Vill kunden koppla bort den, sätt till en tom sträng.",
};

// Egenskaperna för EN RIKTAD ÄNDRING (chattredigeraren, /api/sites/edit) —
// till skillnad från SITE_CONTENT_PROPERTIES ovan (hela sajten, varje gång,
// använt vid förstagångsgenereringen) ber den här versionen Claude svara
// med ENDAST de sidor som ändringen faktiskt rörde. En redigering som "byt
// rubriken på startsidan" på en sajt med fem sidor tvingade tidigare Claude
// att skriva ut alla fem sidors fulla innehåll igen, vilket gjorde varje
// liten ändring märkbart långsam — nu är svaret proportionerligt mot
// ändringen istället för mot sajtens storlek. Servern slår ihop de
// returnerade sidorna (matchat på path) med de sidor som inte skickades
// med, se app/api/sites/edit/route.ts.
export const EDIT_PATCH_PROPERTIES = {
  theme: {
    type: "object",
    description:
      "Utelämna HELA detta fält om färgtemat inte ska ändras (vanligast). Ange det bara om kunden uttryckligen bad om en färg-/typsnittsändring.",
    properties: {
      accentColor: { type: "string" },
      secondaryColors: { type: "array", items: { type: "string" } },
      font: { type: "string", enum: ["serif", "sans"] },
    },
  },
  gaMeasurementId: GA_MEASUREMENT_ID_SCHEMA,
  metaPixelId: META_PIXEL_ID_SCHEMA,
  changedPages: {
    type: "array",
    description:
      "ENDAST de sidor (hela sidobjekt: path, label och ALLA dess sektioner, inte bara den ändrade sektionen) som faktiskt påverkas av den här ändringen. Sidor som inte berörs ska INTE tas med här — de lämnas orörda automatiskt. En helt ny sida läggs till genom att ta med den här med en path som inte redan finns.",
    items: {
      type: "object",
      properties: {
        path: { type: "string" },
        label: { type: "string" },
        sections: { type: "array", items: SECTION_SCHEMA },
        backgroundMode: PAGE_BACKGROUND_MODE_SCHEMA,
      },
      required: ["path", "label", "sections"],
    },
  },
  removedPagePaths: {
    type: "array",
    items: { type: "string" },
    description: "path för sidor som ska tas bort helt, bara om kunden uttryckligen bad om det.",
  },
};

export const EDIT_PATCH_REQUIRED = ["changedPages"];
