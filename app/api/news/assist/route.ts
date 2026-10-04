import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";

// "Be Millie om hjälp med texten" i nyhetspanelen (app/nyheter/NewsClient.tsx)
// — till skillnad från /api/sites/edit (som redigerar SAJTENS innehåll)
// skriver den här bara förslag på en ARTIKELS text, baserat på kundens egen
// korta instruktion plus det de redan hunnit skriva (om något). Sparar
// ingenting själv — kunden ser förslaget i panelen och väljer att använda
// det eller inte.
export const maxDuration = 30;

const ASSIST_TOOL = {
  name: "draft_news_article",
  description: "Returnerar ett förslag på rubrik, ingress och brödtext för en nyhetsartikel.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Förslag på rubrik. Utelämna om kunden redan har en bra rubrik (skicka då tillbaka den oförändrad)." },
      excerpt: { type: "string", description: "En kort sammanfattande mening för artikellistan." },
      body: { type: "string", description: "Brödtexten, i stycken separerade med tomrad." },
    },
    required: ["title", "excerpt", "body"],
  },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 2000) : "";
  const currentTitle = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  const currentBody = typeof body.body === "string" ? body.body.trim().slice(0, 20000) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "";

  if (!instruction && !currentBody) {
    return NextResponse.json({ error: "Skriv vad nyheten ska handla om, eller skriv ett utkast själv först." }, { status: 400 });
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const hasDraft = !!currentBody;
  const prompt = `Du hjälper en kund skriva en nyhetsartikel till sin egen sajt (kategori: "${category || "Nyheter"}").

${currentTitle ? `Kundens nuvarande rubrik: "${currentTitle}"\n` : ""}${
    hasDraft
      ? `Kundens nuvarande utkast till text:\n"""\n${currentBody}\n"""\n`
      : "Kunden har inte skrivit något utkast än.\n"
  }${instruction ? `Kundens instruktion just nu: "${instruction}"\n` : ""}
${
  hasDraft
    ? 'Utgå från kundens EGET utkast — färdigställ, förbättra eller gör om det enligt instruktionen, men behåll kundens egna fakta och poänger. Hitta inte på nya sakuppgifter (priser, datum, platser) som kunden inte nämnt.'
    : "Skriv ett kort, professionellt första utkast utifrån instruktionen. Hitta inte på specifika sakuppgifter (priser, datum, platser) kunden inte nämnt — håll dig allmän där det behövs."
}

Svara via verktyget "draft_news_article" på svenska: en rubrik (behåll kundens egen om den redan är bra), en kort ingress, och brödtexten i stycken separerade med tomrad. Skriv ALLTID rena textstycken utan någon HTML eller markdown-formatering — inga taggar som <p>, <body> eller </html>, inga asterisker eller rubriktecken. Bara vanlig löptext.`;

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      tools: [ASSIST_TOOL],
      tool_choice: { type: "tool", name: "draft_news_article" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Kunde inte hämta ett förslag just nu: " + (e?.message || "okänt fel") }, { status: 502 });
  }

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) return NextResponse.json({ error: "Fick inget förslag." }, { status: 502 });

  const draft = toolUse.input as { title?: string; excerpt?: string; body?: string };
  return NextResponse.json({
    title: stripStrayTags(draft.title) || currentTitle,
    excerpt: stripStrayTags(draft.excerpt) || "",
    body: stripStrayTags(draft.body) || currentBody,
  });
}

// Säkerhetsnät: om modellen av misstag råkar klistra in en HTML-tagg
// (t.ex. </body>, <p>) i löptexten, städa bort den innan den visas för
// kunden i textfältet. Texten ska alltid vara ren löptext.
function stripStrayTags(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^>]*)?>/g, "").trim();
}
