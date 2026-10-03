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
