import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { summarizeInspirationLinks } from "@/lib/inspiration";

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
        eyebrow: { type: "string" },
        headline: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
      },
      required: ["id", "type", "headline", "body"],
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
      required: ["id", "type", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "testimonials" },
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
      required: ["id", "type", "heading", "items"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "cta" },
        heading: { type: "string" },
        body: { type: "string" },
        ctaLabel: { type: "string" },
      },
      required: ["id", "type", "heading", "body", "ctaLabel"],
    },
    {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { const: "contact" },
        heading: { type: "string" },
        body: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
      },
      required: ["id", "type", "heading", "body"],
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

function buildPrompt(site: any, pages: any[], inspirationText: string) {
  const pagesDesc = pages
    .map(
      (p) =>
        `- "${p.label}" (path: ${p.path})${p.brief ? ` — kundens brief: ${p.brief}` : ""}`
    )
    .join("\n");

  return `Du ska skriva innehållet till en helt ny webbplats, åt en kund hos YourCoSite (en AI-driven hemsidesbyggare för svenska småföretag).

Företag: ${site.name}
Bransch: ${site.industry || "ej angiven"}
Beskrivning från kunden: ${site.description || "ej angiven"}
Önskad ton: ${site.tone || "Personlig"}
Visuell stil: ${site.style_id || "warm"}
${inspirationText}

Sidor som ska skapas, i denna ordning:
${pagesDesc}

Skriv genuint bra, konkret copy på svenska för varje sida — ingen platshållartext ("Lorem ipsum" eller liknande är förbjudet). Utgå från beskrivningen och branschen för att hitta rätt detaljer och ton. Varje sida ska ha minst 2-3 sektioner som passar innehållet (t.ex. en hero längst upp, sedan about/grid/testimonials/cta/contact där det är relevant) — du väljer fritt vilka sektionstyper som passar varje sida bäst, så länge du håller dig till de sektionstyper verktyget stödjer.

Anropa verktyget "generate_site" med hela resultatet.`;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", user.id)
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (siteError || !site) {
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

  const inspirationText = await summarizeInspirationLinks(site.inspiration_links || []);

  let message;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      tools: [GENERATE_TOOL],
      tool_choice: { type: "tool", name: "generate_site" },
      messages: [{ role: "user", content: buildPrompt(site, pages, inspirationText) }],
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

  const { error: saveError } = await supabase
    .from("sites")
    .update({ content, status: "draft" })
    .eq("id", site.id);

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({ ok: true, siteId: site.id });
}
