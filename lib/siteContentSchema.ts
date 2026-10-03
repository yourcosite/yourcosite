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
        layout: { type: "string", enum: ["centered", "split-left", "split-right", "overlay-bottom"] },
        eyebrow: { type: "string" },
        headline: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
        ctaLink: {
          type: "string",
          description:
            "Vart knappen leder: antingen en exakt sidväg från pages[].path (t.ex. \"/kontakt\"), eller en fullständig extern URL (https://...). Utelämna helt om knappen inte ska vara klickbar.",
        },
        imageUrl: { type: "string" },
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
  ],
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
      },
      required: ["path", "label", "sections"],
    },
  },
};

export const SITE_CONTENT_REQUIRED = ["theme", "pages"];

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
