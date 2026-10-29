import { GRID_ICON_IDS as ICON_IDS } from "./gridIcons";
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

const RAW_SECTION_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "hero" },
        layout: {
          type: "string",
          enum: ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom", "fade-both", "collage", "quad", "editorial", "beam"],
          description:
            "\"fade-both\" = TONINGSSEKTION (ny): bilden tonar ut mjukt både uppåt och nedåt mot sidans bakgrund, med rubrik, text och knapp centrerade ovanpå bilden — används när kunden säger \"toningssektion\" (eller på annat språk: fade section, sektion de fondu, Überblendungs-Sektion, sección con degradado, häivytysosio) eller vill ha en bild som tonar åt båda håll. Kräver imageUrl. \"fade-bottom\": bilden tonar ut mjukt i sidans bakgrund, texten ligger därunder på vanlig bakgrund — ingen \"kortruta\" eller fullbred overlay. Ett lugnare, mer organiskt alternativ till \"centered\" och \"overlay-bottom\". \"collage\": ett redaktionellt, bildrikt intryck — flera bilder i en överlappande komposition bredvid texten, med plats för headlineEmphasis (en kursiv fortsättning på rubriken) och stats (en kort nyckeltalsrad under knappen). Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan. \"quad\": en delad hero — text till vänster (rubrik + en headlineEmphasis-rad på egen rad, INTE kursiv) och EN bild till höger som täcker hela höjden, med ett litet flytande \"AI-verktyg\"-kort (ren dekoration) nere på bilden samt en kort bock-rad (stats, bara label visas) under knappen. Används bara när stilvarianten faktiskt är \"Ren och strukturerad\". \"editorial\" (ny): text till vänster (rubrik + en kursiv headlineEmphasis-rad) och en stor stående bild till höger, med ett mindre andra foto (collageImageUrls) lager-på-lager nere i bildens vänstra hörn och en liten dekorativ sidnumrering i hörnet. Används bara när stilvarianten faktiskt är \"Redaktionell helbild\". \"beam\" (ny): en mörk, dramatisk hero — en fullbred bild bakom en SIDLEDES mörk gradient (mörkast vänster, där texten ligger CENTRERAD i hela höjden, genomskinlig mot höger där bilden syns rent), med en liten dekorativ \"Scrolla ner\"-rad nere till vänster. Används bara när stilvarianten faktiskt är den mörka \"arkitektur\"-känslan.",
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
        ctaNewTab: { type: "boolean", description: "true = länken öppnas i ett nytt fönster, false = i samma fönster. Rör bara om kunden ber om det; annars behåll värdet som det är." },
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
          enum: ["text-left", "centered", "stats-split", "image-full", "image-stats", "image-left", "image-right"],
          description:
            "\"text-left\" (vänsterställd, bredare text) eller \"centered\" (centrerad, smalare — känns mer redaktionell/luftig). Variera mellan sajter, inte alltid samma. \"stats-split\" (ny): två foton i olika höjd sida vid sida (collageImageUrls) till vänster, rubrik/text och en kort nyckeltalsrad (stats) till höger — ett dramatiskt \"resultat\"-avbrott. Kräver verifierbara nyckeltal (se stats-fältets regel nedan) för att kännas meningsfull — annars välj en annan layout. \"image-full\" (ny): EN bild som täcker hela sektionens höjd till vänster, rubrik/text till höger med en dekorativ länkrad under — ett rent, redaktionellt avbrott utan nyckeltal. \"image-stats\" (ny): EN bild som täcker hela sektionens höjd till vänster, en MÖRK tonad textruta till höger med rubrik, en nyckeltalsrad (stats) och brödtext — samma nyckeltalskrav som \"stats-split\". \"image-left\" / \"image-right\" (ny): en vanlig, inramad bild (imageUrl) BREDVID texten, till vänster respektive höger — välj en av dem när kunden vill ha en bild bredvid en textruta.",
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
        ctaNewTab: { type: "boolean", description: "true = länken öppnas i ett nytt fönster, false = i samma fönster. Rör bara om kunden ber om det; annars behåll värdet som det är." },
        ctaLink: { type: "string", description: "Vart \"Läs mer →\"-raden leder: en exakt sidväg från pages[].path (t.ex. \"/tjanster\") eller en fullständig extern URL (https://...). Utelämna helt om raden inte ska vara klickbar." },
        linkLabel: { type: "string", description: "Texten på \"Läs mer →\"-raden (utan pilen), t.ex. \"Se alla tjänster\". Utelämna för att behålla \"Läs mer\"." },
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
          enum: ["cards", "alternating-rows", "list", "numbered", "bento", "icon-row", "divided-columns", "intro-divided", "icon-cards", "icon-circles", "icon-list", "icon-top-rule", "image-cta-cards"],
          description:
            "\"bento\": ett asymmetriskt rutnät där det FÖRSTA objektet i items visas större (dubbel bredd/höjd) och resten mindre, som en modern \"bento box\"-layout — ger variation i storlek istället för jämna rutor. Passar 3-5 items. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\"). \"icon-row\" (ny): en smal rad med 3-4 korta punkter (bara rubrik + kort body, ingen bild) i jämna kolumner, med en liten dekorativ cirkel-ikon ovanför varje — passar som en kompakt \"fördelar i korthet\"-rad direkt under en hero, inte som sidans enda innehåll. \"divided-columns\" (ny): tre kolumner MED en tunn lodrät linje mellan varje (ingen egen kortbakgrund), en liten geometrisk symbol ovanför varje rubrik och en dekorativ \"Läs mer\"-rad under texten — passar 3 items bäst (en tjänste-/expertis-sektion). \"intro-divided\" (ny): en EGEN vänsterkolumn med eyebrow + rubrik + en kort introtext + knapp (använd fälten eyebrow/intro/ctaLabel/ctaLink, bara meningsfulla för DEN HÄR layouten), bredvid (inte ovanför) resten av items som avdelade kort likt \"divided-columns\". Passar 3 items i korten (4 kolumner totalt: 1 intro + 3 kort). Fyra ikonlayouter utan bild, alla med en linjeikon per ruta: \"icon-cards\" (rundade kort med ikon i en färgad ruta, centrerad rubrik ovanför), \"icon-circles\" (ikon i stor cirkel, centrerad text, inga kort), \"icon-list\" (rubriken till vänster, en lodrät lista med ikon till vänster om varje punkt, avdelad av tunna linjer — passar 3-6 punkter), \"icon-top-rule\" (kolumner med en kraftig färgad linje överst och ikon under). Passar 2-4 items (icon-list upp till 6). \"image-cta-cards\" (ny): upp till fyra kolumner där varje ruta har en bild överst, rubrik, kort text och en KNAPP längst ner (rutans link/linkLabel, t.ex. \"Läs mer\" eller \"Boka paketet\") — passar 3-4 paket, erbjudanden eller ingångar till undersidor; ge varje item en imageUrl-plats, link och linkLabel.",
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
        ctaNewTab: { type: "boolean", description: "true = länken öppnas i ett nytt fönster, false = i samma fönster. Rör bara om kunden ber om det; annars behåll värdet som det är." },
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
              newTab: { type: "boolean", description: "true = länken öppnas i ett nytt fönster, false = i samma. Rör bara om kunden ber om det; annars behåll värdet." },
              link: { type: "string", description: "Vart \"Läs mer →\"-raden leder: en exakt sidväg från pages[].path (t.ex. \"/tjanster\") eller en fullständig extern URL (https://...). Utelämna helt om raden inte ska vara klickbar." },
              linkLabel: { type: "string", description: "Texten på rutans \"Läs mer →\"-rad (utan pilen). Utelämna för att behålla \"Läs mer\"." },
              icon: {
                type: "string",
                enum: ICON_IDS,
                description: "Ikon i rutan (layouterna med ikoner). Utelämna (vanligast) så väljer systemet en passande ikon utifrån texten. Sätt BARA när kunden ber om en viss ikon eller en annan ikon på just den rutan.",
              },
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
          enum: ["centered", "split", "image-bleed", "dark-split", "fade-bottom", "fade-both"],
          description:
            "\"image-bleed\" (ny): en riktig bild täcker hela sektionens bredd bakom en mörk gradient, med rubrik/text VÄNSTERSTÄLLD ovanpå — ett dramatiskt, redaktionellt avbrott mellan andra sektioner. Används bara när stilvarianten faktiskt är den \"redaktionella\" känslan (se hero-layouten \"collage\"). \"dark-split\" (ny): en HELT mörk bakgrund till vänster (rubrik/text/knapp i vitt) och en riktig bild som fyller högra halvan — till skillnad från \"image-bleed\" är bilden INTE en gradient-bakgrund bakom texten, utan en egen, separat ruta bredvid. \"fade-bottom\" (ny): en bred bild överst som tonar mjukt ut i sidans bakgrund, med rubrik, text och knapp under/ovanpå utan egen ruta (samma känsla som hero-layouten fade-bottom) — \"fade-both\" = TONINGSSEKTION: bilden tonar åt båda håll med text och knapp centrerade över (som hero-layouten fade-both); använd när kunden säger \"toningssektion\". Använd \"fade-bottom\" när kunden vill ha en kontaktsektion/uppmaning med \"fade-bottom\" eller bild som tonar ut; kräver imageUrl (behåll sektionens befintliga bild).",
        },
        heading: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
        ctaNewTab: { type: "boolean", description: "true = länken öppnas i ett nytt fönster, false = i samma fönster. Rör bara om kunden ber om det; annars behåll värdet som det är." },
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
        hours: { type: "string", description: "Öppettider som kort fri text, en rad per dag eller dagintervall, t.ex. \"Mån–fre 9–18\\nLör 10–15\". Sätt bara när kunden själv uppgett tiderna; hitta aldrig på några." },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "layout", "heading", "body"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "gallery" },
        layout: {
          type: "string",
          enum: ["grid", "carousel", "masonry", "mosaic", "tiles"],
          description:
            "\"grid\": två kolumner med kvadratiska bilder (få bilder, 2-6). \"tiles\": tätt rutnät i tre kolumner med små kvadrater (många bilder, 8 eller fler). \"masonry\": kolumner där bilderna behåller sina egna proportioner, så höjderna varierar (naturligt för foton i olika format). \"mosaic\": oregelbundet rutnät med några stora och några höga bilder bland små, som en collage. \"carousel\": en rad man sveper i sidled. Besökaren kan alltid klicka på en bild för att se den större. Kunden lägger själv till fler bilder i redigeraren.",
        },
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
        type: { const: "team" },
        layout: {
          type: "string",
          enum: ["cards", "round", "rows", "overlay"],
          description:
            "\"cards\": kort med foto överst och text under. \"round\": runda porträtt med text centrerad under (personligt, passar små team). \"rows\": en rad per person med foto till vänster och kontaktuppgifter till höger (passar många personer). \"overlay\": stora foton med namn och titel över bildens nederkant.",
        },
        heading: { type: "string" },
        intro: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              imageUrl: { type: "string" },
              name: { type: "string" },
              title: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
            },
            required: ["name", "title"],
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
        type: { const: "social" },
        heading: { type: "string" },
        body: { type: "string", description: "Valfri kort text under rubriken." },
        source: {
          type: "string",
          description:
            "Det kunden gett, EXAKT som det var: en Facebook-sidas länk (t.ex. \"https://www.facebook.com/foretaget\"), en eller flera länkar till Instagram-inlägg, eller hela inbäddningskoden från Behold, Elfsight eller SnapWidget. Hitta ALDRIG på en länk eller ett id.",
        },
        height: { type: "number", description: "Valfri höjd i pixlar på Facebook-rutan, 300 till 1000. Utelämna för standard (700)." },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "source"],
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
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "booking" },
        layout: {
          type: "string",
          enum: ["standard", "compact", "image-left", "image-right", "image-background"],
          description:
            "Utseende: \"standard\" (centrerad, vanligast), \"compact\" (smal, tät ruta), \"image-left\"/\"image-right\" (en bild BREDVID bokningen) eller \"image-background\" (bild bakom en bokningsruta). Utelämna \"imageUrl\" — bilden sätts av vårt system.",
        },
        heading: { type: "string" },
        body: { type: "string", description: "Valfri kort text under rubriken, t.ex. \"Välj tjänst och tid som passar dig.\"" },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "heading"],
      description:
        "Bokningssektion: besökaren väljer paket, dag och tid och bokar direkt på sidan, och får en bekräftelse på mejl. Lägg bara till en \"heading\" (och gärna en kort \"body\") — paketen, priserna, tiderna och bokningarna hanteras av kunden själv på \"Bokningar\"-sidan i panelen, aldrig av dig. Hittar ALDRIG på paket, priser eller tider. Högst en sådan sektion per sida.",
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "menu" },
        layout: {
          type: "string",
          enum: ["classic", "elegant", "cards", "tabs"],
          description:
            "\"classic\": två spalter med rätt, prisrad och beskrivning (vanligast). \"elegant\": centrerad, lugn, för finare restauranger. \"cards\": rutor, passar kortare menyer. \"tabs\": flikar per kategori, passar långa menyer.",
        },
        heading: { type: "string" },
        intro: { type: "string" },
        note: { type: "string", description: "Valfri text längst ned, t.ex. allergiinformation." },
        categories: {
          type: "array",
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
                    price: { type: "string", description: "Fritext exakt som kunden skrev, t.ex. \"189 kr\". Hitta aldrig på priser." },
                    tags: { type: "array", items: { type: "string", enum: ["v", "vg", "gf", "lf", "hot"] } },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["name", "items"],
          },
        },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type", "layout", "heading", "categories"],
      description:
        "Restaurangmeny med kategorier och rätter. Hittar ALDRIG på rätter, priser eller kostmärken — bara det kunden angett eller laddat upp. Lämna \"categories\" tom om kunden inte angett någon meny.",
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "embed" },
        heading: { type: "string" },
        body: { type: "string" },
        bgColor: BG_COLOR_SCHEMA,
      },
      required: ["id", "type"],
      description:
        "Inbäddad kod från en tredje part, t.ex. kundens eget bokningssystem, ett formulär eller en widget. Lägg till sektionen med en passande \"heading\" (valfri) och utelämna \"code\" helt — själva koden klistrar kunden in själv med knappen \"Klistra in kod\" när sektionen är vald. Skriv ALDRIG egen kod i sektionen och ändra aldrig en befintlig sektions kod.",
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

const SEO_TITLE_SCHEMA = {
  type: "string",
  description:
    "Sidans titel i Google och när den delas (helst under 60 tecken, med sidans viktigaste sökord). Sätt bara när kunden ber om sökmotor-/delningstext för just den sidan; annars utelämna, och bevara ett redan satt värde oförändrat.",
};
const SEO_DESCRIPTION_SCHEMA = {
  type: "string",
  description:
    "Sidans beskrivning under titeln i Google och vid delning (helst 120-155 tecken, lockande och sann). Samma regel som seoTitle.",
};

// Reglage som gäller VILKEN sektion som helst: avstånd och textjustering.
// Läggs på varje sektionstyp ovan här istället för att upprepas tolv gånger.
const SPACING_SCHEMA = {
  type: "string",
  enum: ["compact", "normal", "airy"],
  description:
    "Lodrätt avstånd i BARA den här sektionen: compact = tätare, airy = luftigare, normal = tillbaka till sajtens vanliga avstånd. Sätt bara när kunden ber om tätare/luftigare på just den sektionen (gäller inte hero). Utelämna annars, och behåll ett redan satt värde oförändrat när du skriver om sektionen av annan anledning.",
};
const TEXT_ALIGN_SCHEMA = {
  type: "string",
  enum: ["left", "center", "right"],
  description:
    "Textjustering i BARA den här sektionen: left = vänsterställd, center = centrerad, right = högerställd. Sätt bara när kunden ber om det för just den sektionen. Utelämna annars, och behåll ett redan satt värde oförändrat när du skriver om sektionen av annan anledning.",
};
const FADE_BOTTOM_SCHEMA = {
  type: "boolean",
  description:
    "true = den här sektionens nederkant tonar mjukt ut i bakgrundsfärgen på sektionen under (mjuk övergång istället för hård kant). false tar bort. Sätt bara när kunden ber om fade/uttoning/mjuk övergång nedåt på just den sektionen; behåll ett redan satt värde när du skriver om sektionen av annan anledning. (Heroens layout fade-bottom gör redan detta av sig själv.)",
};
const FADE_TOP_SCHEMA = {
  type: "boolean",
  description:
    "true = den här sektionens överkant tonar mjukt ut i bakgrundsfärgen på sektionen över (mjuk övergång uppåt, t.ex. en bild som tonar ut uppåt). false tar bort. Sätt bara när kunden ber om fade/uttoning UPPÅT på just den sektionen; kan kombineras med fadeBottom för att tona både uppåt och nedåt. Behåll ett redan satt värde när du skriver om sektionen av annan anledning.",
};
const CTA_STYLE_SCHEMA = {
  type: "string",
  enum: ["pill", "square", "underline", "soft", "outline", "rounded", "gradient", "auto"],
  description:
    "Knappstil för knapparna i BARA den här sektionen (annars gäller sajtens): pill = runda fyllda, square = kantiga, underline = understruken, soft = mjukt tonad, outline = bara ram, rounded = mjukt rundade fyllda, gradient = färgton. auto = ta bort och följ sajten igen. Sätt bara när kunden ber om en annan knappstil på en enskild sektion/knapp; ändra annars theme.buttonStyle för hela sajten. Behåll ett redan satt värde när du skriver om sektionen av annan anledning.",
};
export const SECTION_SCHEMA = {
  anyOf: RAW_SECTION_SCHEMA.anyOf.map((variant) => ({
    ...variant,
    properties: { ...variant.properties, spacing: SPACING_SCHEMA, textAlign: TEXT_ALIGN_SCHEMA, fadeBottom: FADE_BOTTOM_SCHEMA, fadeTop: FADE_TOP_SCHEMA, ctaStyle: CTA_STYLE_SCHEMA },
  })),
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
      "Utelämna HELA detta fält om färgtemat inte ska ändras (vanligast). Ange det bara om kunden uttryckligen bad om en färg-/typsnittsändring. Ange i så fall BARA de delfält som ska ändras.",
    properties: {
      accentColor: { type: "string" },
      secondaryColors: { type: "array", items: { type: "string" } },
      font: { type: "string", enum: ["serif", "sans"] },
      skin: {
        type: "string",
        enum: ["solglimt", "skymning", "pastell", "kontrast", "fargyta", "ingen"],
        description:
          "Färg- och typografipaket som byter hela sajtens känsla (färgytor, rubrikernas typsnitt, storlek och vikt) men behåller kundens accentfärg som grund. solglimt = ljus, färgstarka tonade ytor och fet grotesk; skymning = mörk och elegant med serif; pastell = mjuk, ljus och luftig; kontrast = vitt och svart med versaler och en kraftig färgyta; fargyta = djup färgfylld bakgrund med kursiv serif. \"ingen\" tar bort paketet och går tillbaka till sajtens vanliga tema. Sätt bara när kunden ber om en annan stil/typografi/känsla på hela sajten.",
      },
      buttonStyle: {
        type: "string",
        enum: ["pill", "square", "underline", "soft", "outline", "rounded", "gradient"],
        description:
          "Knappform på hela sajten: pill = helt runda fyllda knappar, square = kantiga fyllda, underline = understruken textlänk utan ruta, soft = mjuk, ljust tonad knapp i accentfärgen med rundade hörn (inte hård fyllning), outline = ram utan fyllning, rundad, rounded = fylld knapp med mjukt rundade hörn (mindre än pill), gradient = fylld knapp med mjuk färgton. Passar när kunden tycker att knapparna är för hårda, tunga eller stora: föreslå soft eller outline. Sätt bara när kunden ber om en annan knappform.",
      },
      headerLayout: {
        type: "string",
        enum: ["left", "centered-stacked", "split", "left-button", "split-button", "centered-button", "pill-bar", "minimal"],
        description:
          "Headerns uppbyggnad: left = logga vänster och meny höger (klassisk), centered-stacked = logga centrerad med menyn på en egen rad under, split = logga vänster och menyn centrerad. Menyer MED en tydlig knapp (t.ex. Bokning): left-button = klassisk meny med knapp ytterst till höger, split-button = logga vänster, meny i mitten, knapp höger, centered-button = loggan centrerad, knapp uppe till höger och menyn under, pill-bar = menyn i en rundad flytande ruta med knapp höger, minimal = bara logga, knapp och hamburgarmeny även på bred skärm. Sätt bara när kunden ber om en annan header/meny-placering eller en knapp i menyn.",
      },
      headerGlass: {
        type: "boolean",
        description:
          "true = halvgenomskinlig, lite mörk meny som ligger över heroens bild så att bilden syns svagt igenom; false = vanlig meny. Funkar när startsidans (eller sidans) första sektion är en hero med bild och layouten overlay-bottom, fade-bottom eller beam — byt då heroens layout till overlay-bottom om den har en annan. Sätt när kunden ber om genomskinlig/halvtransparent/glas-meny eller att bilden ska synas igenom menyn.",
      },
      headerCta: {
        type: "object",
        description:
          "Knappen i menyn (syns bara i menyerna med knapp). Utan värden väljs bokningssidan automatiskt, annars kontaktsidan. path = sidans sökväg knappen går till, label = knapptexten (t.ex. Boka tid), off = true tar bort knappen. Sätt bara när kunden vill ändra knappens text/mål eller ta bort den.",
        properties: {
          path: { type: "string" },
          label: { type: "string" },
          off: { type: "boolean" },
          style: { type: "string", enum: ["pill", "square", "underline", "soft", "outline", "rounded", "gradient", "auto"], description: "Knappstil på BARA menyknappen (annars sajtens knappstil). auto = följ sajten. Sätt när kunden ber om en annan stil på knappen i menyn." },
          color: { type: "string", description: "Egen färg på menyknappen som hex, t.ex. #E5574E. Tom sträng tar bort och knappen följer sajtens accentfärg igen. Sätt när kunden ber om en annan färg på just menyknappen." },
          hideFromMenu: { type: "boolean", description: "true = sidan knappen går till tas bort som vanligt menyval (så den bara finns som knapp). Sätt när kunden vill att knappen ERSÄTTER menylänken." },
        },
      },
      sectionSpacing: {
        type: "string",
        enum: ["compact", "normal", "airy"],
        description:
          "Mellanrummet mellan (och inuti) sektionerna på hela sajten: compact = tätare, normal = standard, airy = luftigare. Sätt bara när kunden ber om tätare/luftigare sida eller mer/mindre luft.",
      },
      textAlign: {
        type: "string",
        enum: ["left", "center", "right", "auto"],
        description:
          "Textjustering på HELA sajten: left = vänsterställd, center = centrerad, right = högerställd, auto = tillbaka till mallens egen. Sätt bara när kunden ber om det för hela sajten. Gäller kunden en enskild sektion eller sida, sätt \"textAlign\" på sektionerna istället.",
      },
      headingScale: {
        type: "number",
        description:
          "Rubrikernas storlek på hela sajten som en faktor: 1 = som nu/standard, 1.2 = en bit större, 1.4 = mycket större, 0.85 = mindre. Gäller ALLA rubriker, multipliceras med paketets egen skala. Mellan 0.7 och 1.6. Sätt bara när kunden ber om större/mindre rubriker; \"större\" ≈ 1.2–1.3, \"mycket större\" ≈ 1.45. Är den redan satt, utgå från det nuvarande värdet.",
      },
    },
  },
  gaMeasurementId: GA_MEASUREMENT_ID_SCHEMA,
  metaPixelId: META_PIXEL_ID_SCHEMA,
  seoKeyword: {
    type: "string",
    description:
      "Sajtens huvudsökord för Google, kort och naturligt (bransch plus ort, t.ex. \"frisör i Linköping\", högst 80 tecken). Sätt bara när du själv med säkerhet kan läsa ut det eller kunden har valt det. Tom sträng tar bort det.",
  },
  imageAlts: {
    type: "object",
    additionalProperties: { type: "string" },
    description:
      "Beskrivande bildtext (alt) för sajtens bilder, med bildens exakta url (imageUrl) som nyckel och texten som värde (under 120 tecken, beskriv vad bilden visar utifrån sektionens egen text, aldrig påhittade fakta). Ta bara med bilder som ska få eller byta text. Tom sträng tar bort en text.",
  },
  pageOrder: {
    type: "array",
    items: { type: "string" },
    description:
      "Sidornas path i den NYA ordningen (hela listan, alla sidor, första = längst till vänster i menyn). Ange bara när kunden bett om att flytta/omordna sidor eller menyalternativ. Sektioner flyttas inom en sida genom att skriva ut den sidans sektioner i ny ordning i changedPages, inte här.",
  },
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
        seoTitle: SEO_TITLE_SCHEMA,
        seoDescription: SEO_DESCRIPTION_SCHEMA,
      },
      required: ["path", "label", "sections"],
    },
  },
  fieldEdits: {
    type: "array",
    description:
      "SNABB VÄG för små ändringar i befintliga fält: byt en text, rubrik, knapptext, länk eller bild på ett ställe. Ange sida, sektionens id, fältets väg och det nya värdet — då behöver du INTE skriva ut hela sidan i changedPages (utelämna changedPages helt när bara fieldEdits behövs). Fältväg är egenskapen i sektionen, t.ex. \"headline\", \"body\", \"ctaLabel\" eller \"items.1.title\" för rad 2 i en lista. Värdet är hela den nya texten. Bild: sätt fältet (t.ex. \"imageUrl\" eller \"items.2.imageUrl\") till EXAKT adressen på en bild kunden bifogat. Kan inte användas för att lägga till eller ta bort sektioner eller listobjekt, ändra ordning eller byta layout — då används changedPages.",
    items: {
      type: "object",
      properties: {
        pagePath: { type: "string", description: "Sidans path, t.ex. \"/\"." },
        sectionId: { type: "string", description: "Sektionens id." },
        field: { type: "string", description: "Fältets väg i sektionen, t.ex. \"headline\" eller \"items.1.title\"." },
        value: { type: "string", description: "Det nya värdet (hela texten)." },
      },
      required: ["pagePath", "sectionId", "field", "value"],
    },
  },
  removedPagePaths: {
    type: "array",
    items: { type: "string" },
    description: "path för sidor som ska tas bort helt, bara om kunden uttryckligen bad om det.",
  },
};

export const EDIT_PATCH_REQUIRED: string[] = [];
