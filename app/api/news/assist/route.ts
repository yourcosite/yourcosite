import { logAiUsage } from "@/lib/aiUsage";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { LANGUAGE_ENGLISH } from "@/lib/i18n/config";

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
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`newsassist:user:${user.id}`, 100, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json();
  const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 2000) : "";
  const currentTitle = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  const currentBody = typeof body.body === "string" ? body.body.trim().slice(0, 20000) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "";

  if (!instruction && !currentBody) {
    return NextResponse.json({ error: t("Skriv vad nyheten ska handla om, eller skriv ett utkast själv först.") }, { status: 400 });
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Artikeln skrivs på sajtens språk.
  const reqSiteId = typeof body.siteId === "string" ? body.siteId : null;
  const siteRow = await getCurrentPublishedSite(supabase, user.id, reqSiteId).catch(() => null);
  const langName = LANGUAGE_ENGLISH[(siteRow as any)?.language] ?? "Swedish";
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

Sätt ALLTID både rubrik och ingress: kunden börjar ofta med bara en kort text och vill att du utökar eller skriver om den. Är kundens nuvarande rubrik tom, skriv en kort, tydlig rubrik utifrån texten (högst ca 8 ord). Ingressen är en mening (max ca 160 tecken) som lockar att läsa vidare.

Svara via verktyget "draft_news_article" på ${langName} (artikeln skrivs på sajtens språk, även om instruktionen är på ett annat språk): en rubrik (behåll kundens egen om den redan är bra), en kort ingress, och brödtexten i stycken separerade med tomrad. Skriv ALLTID rena textstycken utan någon HTML eller markdown-formatering — inga taggar som <p>, <body> eller </html>, inga asterisker eller rubriktecken. Bara vanlig löptext.`;

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

  await logAiUsage({ kind: "news", model: CLAUDE_MODEL, usage: response.usage, userId: user.id, siteId: (siteRow as any)?.id ?? null });

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use"
  );
  if (!toolUse) return NextResponse.json({ error: t("Fick inget förslag.") }, { status: 502 });

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
