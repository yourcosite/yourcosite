import { logAiUsage } from "@/lib/aiUsage";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL } from "@/lib/anthropic";
import { extractFixtures } from "@/lib/fixtureExtract";
import { withErrorLog } from "@/lib/errorLog";

// "Klistra in schema" i matchrutan: läser ut matcher ur löpande text (ett
// klistrat spelschema, ett mejl, en tabell). Sparar ingenting. Kunden ser
// matcherna i rutan, kan rätta dem och sparar själv.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`parsefx:user:${user.id}`, 40, 86400)) {
    return NextResponse.json({ error: t("Du har nått dagens gräns för AI-hjälp. Försök igen i morgon eller hör av dig till supporten.") }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 30000) : "";
  const teamName = typeof body.teamName === "string" ? body.teamName.trim().slice(0, 80) : "";
  if (text.length < 8) return NextResponse.json({ error: t("Klistra in texten med matcherna först.") }, { status: 400 });

  let result;
  try {
    result = await extractFixtures(text, teamName);
  } catch (e: any) {
    return NextResponse.json({ error: t("Kunde inte läsa schemat just nu.") + " " + (e?.message || "") }, { status: 502 });
  }
  await logAiUsage({ kind: "edit", model: CLAUDE_MODEL, usage: result.usage, userId: user.id, siteId: null });
  if (result.items.length === 0) return NextResponse.json({ error: t("Hittade inga matcher i texten. Kontrollera att datum och motståndare finns med.") }, { status: 422 });
  return NextResponse.json({
    fixtures: result.items,
    teamName: result.teamName,
    notes: [result.notes, result.skipped ? t("{n} matcher hoppades över eftersom datum eller motståndare saknades.", { n: result.skipped }) : ""].filter(Boolean).join(" "),
  });
}

export const POST = withErrorLog("POST /api/sites/parse-fixtures", POST_handler);
