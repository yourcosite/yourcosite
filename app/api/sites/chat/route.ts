import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";

// Chatthistoriken med Millie (de senaste 20 ändringarna = 40 meddelanden)
// sparas på sajten (kolumnen sites.chat_history) så den följer med mellan
// dator och mobil. Saknas kolumnen i databasen (SQL ej körd än) svarar vi
// "unavailable" och redigeraren faller tillbaka på webbläsarens lagring.
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;

type StoredMessage = {
  from: "user" | "bot";
  text: string;
  attachmentNames?: string[];
  unsupported?: boolean;
  requestText?: string;
};

function sanitize(input: unknown): StoredMessage[] {
  if (!Array.isArray(input)) return [];
  const out: StoredMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || (m.from !== "user" && m.from !== "bot") || typeof m.text !== "string") continue;
    out.push({
      from: m.from,
      text: m.text.slice(0, 4000),
      attachmentNames: Array.isArray(m.attachmentNames)
        ? m.attachmentNames.filter((n: unknown) => typeof n === "string").slice(0, 10).map((n: string) => n.slice(0, 120))
        : undefined,
      unsupported: m.unsupported === true ? true : undefined,
      requestText: typeof m.requestText === "string" ? m.requestText.slice(0, 1000) : undefined,
    });
  }
  return out;
}

async function GET_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId");
  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  if (!("chat_history" in site)) return NextResponse.json({ unavailable: true, messages: [] });
  return NextResponse.json({ messages: sanitize(site.chat_history) });
}

async function PUT_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const body = await request.json();
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  if (!("chat_history" in site)) return NextResponse.json({ unavailable: true });
  const messages = sanitize(body.messages);
  const { error } = await supabase.from("sites").update({ chat_history: messages }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const GET = withErrorLog("GET /api/sites/chat", GET_handler);
export const PUT = withErrorLog("PUT /api/sites/chat", PUT_handler);
