// Delat JSON-schema för sajtens innehållsmodell (lib/contentModel.ts),
// använt av både /api/sites/generate (hela sajten på en gång, i
// onboardingen) och /api/sites/edit (en riktad ändring i chattredigeraren)
// för att tvinga Claude svara med giltig, strukturerad JSON enligt
// modellen — aldrig fri text eller rå HTML, och aldrig fält utanför det
// contentModel.ts faktiskt stödjer.

// Delad schema-beskrivning för Section.bgColor (se lib/contentModel.ts) —
// samma text på varenda sektionstyp nedan, brutet ut hit för att undvika
// att skriva om den elva gånger. Själva INSTRUKTIONEN för NÄR Millie ska
// använda fältet (och inte) ligger i buildEditPrompt i
// app/api/sites/edit/route.ts (en "VIKTIGT —"-sektion, samma princip som
// den befintliga för backgroundMode) — det här är bara fältets egen,
// korta beskrivning i verktygsschemat.
const BG_COLOR_SCHEMA = {
  type: "string",
  description:
    "Fri hex-bakgrundsfärg (\"#RRGGBB\") på BARA den här sektionen — oberoende av sidans eller sajtens vanliga färgtema. Till skillnad från sidans backgroundMode (tre färdiga lägen) är det här en FRI färg, bara satt när kunden uttryckligen bett om en specifik färg på just den här sektionen. Text-/kortfärger räknas ut automatiskt utifrån bakgrundens ljushet. Utelämna helt (vanligast) om sektionen ska se ut som resten av sidan.",
};

// Samma idé som BG_COLOR_SCHEMA, men för en enskild knapp (CTA) på
// hero/cta-sektioner och grid-sektionens egen knapp (layout
// "intro-divided").
const CTA_COLOR_SCHEMA = {
  type: "string",
  description:
    "Fri hex-färg (\"#RRGGBB\") på BARA den här knappen — oberoende av sajtens accentfärg. Bara satt när kunden uttryckligen bett om en specifik färg på just den här knappen. Utelämna helt (vanligast) för att använda sajtens vanliga accentfärg.",
};

export const SECTION_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "hero" },
        layout: {
          type: "string",
          enum: ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom", "collage", "quad", "editorial", "beam"],
          description:
            "\"fade-bottom\": bilden tonar ut mjukt i sidans bakgrund, texten ligger därunder på vanlig bakgrund — ingen \"kortruta\" eller fullbred overlay. Ett lugnare, mer organiskt alternativ till \"centered\" och \"overlay-bottom\". \"collage\": ett redaktionellt, bildrikt intryck — flera bilder i en överlappande komposition bredvid texten, med plats för headlineEmphasis (en kursiv fortsättning på rubriken) och stats (en kort nyckeltalsrad under knappen). Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan. \"quad\": en delad hero — text till vänster (rubrik + en headlineEmphasis-rad på egen rad, INTE kursiv) och EN bild till höger som täcker hela höjden, med ett litet flytande \"AI-verktyg\"-kort (ren dekoration) nere på bilden samt en kort bock-rad (stats, bara label visas) under knappen. Används bara när stilvarianten faktiskt är \"Ren och strukturerad\". \"editorial\" (ny): text till vänster (rubrik + en kursiv headlineEmphasis-rad) och en stor stående bild till höger, med ett mindre andra foto (collageImageUrls) lager-på-lager nere i bildens vänstra hörn och en liten dekorativ sidnumrering i hörnet. Används bara när stilvarianten faktiskt är \"Redaktionell helbild\". \"beam\" (ny): en mörk, dramatisk hero — en fullbred bild bakom en SIDLEDES mörk gradient (mörkast vänster, där texten ligger CENTRERAD i hela höjden, genomskinlig mot höger där bilden syns rent), med en liten dekorativ \"Scrolla ner\"-rad nere till vänster. Används bara när stilvarianten faktiskt är den mörka \"arkitektur\"-känslan.",
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
        bgColor: BG_COLOR_SCHEMA,
        ctaColor: CTA_COLOR_SCHEMA,
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
          enum: ["text-left", "centered", "stats-split", "image-full", "image-stats"],
          description:
            "\"text-left\" (vänsterställd, bredare text) eller \"centered\" (centrerad, smalare — känns mer redaktionell/luftig). Variera mellan sajter, inte alltid samma. \"stats-split\" (ny): två foton i olika höjd sida vid sida (collageImageUrls) till vänster, rubrik/text och en kort nyckeltalsrad (stats) till höger — ett dramatiskt \"resultat\"-avbrott. Kräver verifierbara nyckeltal (se stats-fältets regel nedan) för att kännas meningsfull — annars välj en annan layout. \"image-full\" (ny): EN bild som täcker hela sektionens höjd till vänster, rubrik/text till höger med en dekorativ länkrad under — ett rent, redaktionellt avbrott utan nyckeltal. \"image-stats\" (ny): EN bild som täcker hela sektionens höjd till vänster, en MÖRK tonad textruta till höger med rubrik, en nyckeltalsrad (stats) och brödtext — samma nyckeltalskrav som \"stats-split\".",
        },
        heading: { type: "string" },
        body: { type: "string" },
        imageUrl: { type: "string" },
        // Bara meningsfullt tillsammans med layout "stats-split" — se
        // beskrivningen i lib/contentModel.ts. Utelämna för andra layouter.
        stats: {
          type: "array",
          items: {
            type: "object",
            properties: { value: { type: "string" }, label: { type: "string" } },
            required: ["value", "label"],
          },
          description:
            "Fyll i det här fältet OAVSETT vilken \"layout\" du själv väljer för den här about-sektionen (samma princip som hero-sektionens stats) — layouten kan bytas till \"stats-split\" i efterhand i kod, och då behövs fältet redan vara ifyllt. ENDAST sådant kunden faktiskt skrivit i sin brief (grundat år, antal orter, certifiering etc) — ALDRIG påhittade kund-/omdömessiffror. Saknas tydliga fakta i briefen, utelämna fältet helt.",
        },
        bgColor: BG_COLOR_SCHEMA,
        ctaLink: { type: "string", description: "Vart \"Läs mer →\"-raden leder: en exakt sidväg från pages[].path (t.ex. \"/tjanster\") eller en fullständig extern URL (https://...). Utelämna helt om raden inte ska vara klickbar." },
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
          enum: ["cards", "alternating-rows", "list", "numbered", "bento", "icon-row", "divided-columns", "intro-divided"],
          description:
            "\"bento\": ett asymmetriskt rutnät där det FÖRSTA objektet i items visas större (dubbel bredd/höjd) och resten mindre, som en modern \"bento box\"-layout — ger variation i storlek istället för jämna rutor. Passar 3-5 items. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\"). \"icon-row\" (ny): en smal rad med 3-4 korta punkter (bara rubrik + kort body, ingen bild) i jämna kolumner, med en liten dekorativ cirkel-ikon ovanför varje — passar som en kompakt \"fördelar i korthet\"-rad direkt under en hero, inte som sidans enda innehåll. \"divided-columns\" (ny): tre kolumner MED en tunn lodrät linje mellan varje (ingen egen kortbakgrund), en liten geometrisk symbol ovanför varje rubrik och en dekorativ \"Läs mer\"-rad under texten — passar 3 items bäst (en tjänste-/expertis-sektion). \"intro-divided\" (ny): en EGEN vänsterkolumn med eyebrow + rubrik + en kort introtext + knapp (använd fälten eyebrow/intro/ctaLabel/ctaLink, bara meningsfulla för DEN HÄR layouten), bredvid (inte ovanför) resten av items som avdelade kort likt \"divided-columns\". Passar 3 items i korten (4 kolumner totalt: 1 intro + 3 kort).",
        },
        heading: { type: "string" },
        eyebrow: {
          type: "string",
          description:
            "Bara meningsfullt för layout \"intro-divided\" (eyebrow/intro/ctaLabel/ctaLink används bara där). ÄR den här sektionen startsidans (path \"/\") FÖRSTA grid-sektion: fyll i det här fältet OAVSETT vilken \"layout\" du själv väljer för den — precis som hero/about-sektionernas stats-fält kan layouten bytas till \"intro-divided\" i efterhand i kod, beroende på vilken stilvariant kunden väljer. För varje ANNAN grid-sektion (senare på startsidan, eller på andra sidor): utelämna fältet helt.",
        },
        intro: {
          type: "string",
          description: "Samma regel som eyebrow precis ovan — fyll för startsidans FÖRSTA grid-sektion oavsett egen layout, utelämna annars.",
        },
        ctaLabel: {
          type: "string",
          description: "Samma regel som eyebrow precis ovan — fyll för startsidans FÖRSTA grid-sektion oavsett egen layout, utelämna annars.",
        },
        ctaLink: {
          type: "string",
          description:
            "Samma regel som eyebrow precis ovan. Vart knappen leder: antingen en exakt sidväg från pages[].path (t.ex. \"/tjanster\"), eller en fullständig extern URL. Utelämna om knappen inte ska vara klickbar.",
        },
        ctaColor: {
          ...CTA_COLOR_SCHEMA,
          description: `Bara meningsfullt tillsammans med ctaLabel (layout "intro-divided"). ${CTA_COLOR_SCHEMA.description}`,
        },
        bgColor: BG_COLOR_SCHEMA,
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              body: { type: "string" },
              imageUrl: { type: "string" },
              link: { type: "string", description: "Vart \"Läs mer →\"-raden leder: en exakt sidväg från pages[].path (t.ex. \"/tjanster\") eller en fullständig extern URL (https://...). Utelämna helt om raden inte ska vara klickbar." },
              bgColor: {
                type: "string",
                description:
                  "Fri hex-bakgrundsfärg (\"#RRGGBB\") på BARA den här rutan/kortet, bland de andra i items — oberoende av resten av sektionen. Bara satt när kunden uttryckligen bett om en specifik färg på just DEN rutan (t.ex. \"gör mittenrutan orange\"). Utelämna helt (vanligast) för alla rutor som inte uttryckligen ska stå ut.",
              },
            },
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
        bgColor: BG_COLOR_SCHEMA,
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
          enum: ["centered", "split", "image-bleed", "dark-split"],
          description:
            "\"image-bleed\" (ny): en riktig bild täcker hela sektionens bredd bakom en mörk gradient, med rubrik/text VÄNSTERSTÄLLD ovanpå — ett dramatiskt, redaktionellt avbrott mellan andra sektioner. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\"). \"dark-split\" (ny): en HELT mörk bakgrund till vänster (rubrik/text/knapp i vitt) och en riktig bild som fyller högra halvan — till skillnad från \"image-bleed\" är bilden INTE en gradient-bakgrund bakom texten, utan en egen, separat ruta bredvid.",
        },
        heading: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
        ctaLink: {
          type: "string",
          description:
            "Vart knappen leder: antingen en exakt sidväg från pages[].path (t.ex. \"/kontakt\"), eller en fullständig extern URL (https://...). Utelämna helt om knappen inte ska vara klickbar.",
        },
        ctaColor: CTA_COLOR_SCHEMA,
        bgColor: BG_COLOR_SCHEMA,
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
        bgColor: BG_COLOR_SCHEMA,
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
        bgColor: BG_COLOR_SCHEMA,
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
        bgColor: BG_COLOR_SCHEMA,
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
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "layout", "address"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "video" },
        layout: {
          type: "string",
          enum: ["inline", "full-bleed"],
          description: "\"inline\" (inramad video i läsbredd) eller \"full-bleed\" (videon går ut i hela sidans bredd — mer dramatiskt).",
        },
        heading: { type: "string" },
        videoUrl: {
          type: "string",
          description:
            "Kundens YouTube-länk, EXAKT som kunden gett den (t.ex. \"https://www.youtube.com/watch?v=XXXXXXXXXXX\" eller \"https://youtu.be/XXXXXXXXXXX\"). Hitta ALDRIG på en länk eller ett video-id.",
        },
        caption: { type: "string", description: "Valfri kort bildtext under videon." },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "layout", "videoUrl"],
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
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "heading"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "newsList" },
        heading: { type: "string" },
        bgColor: BG_COLOR_SCHEMA,
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
