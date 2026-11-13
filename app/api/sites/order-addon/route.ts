import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { rateLimited } from "@/lib/rateLimit";
import { sendEmail, escapeHtml } from "@/lib/email";
import { withErrorLog } from "@/lib/errorLog";

// Kunden beställer ett tillägg (t.ex. fler ändringar). Tills betalning är
// kopplad aktiverar vi det för hand och fakturerar: beställningen kommer som
// mejl till oss, och admin lägger in tillägget på kunden.
const ADDONS: Record<string, string> = {
  changes50: "50 extra ändringar (99 kr/mån)",
  language1: "1 extra språk (39 kr/mån)",
  language2: "2 extra språk (59 kr/mån)",
  site: "1 extra sajt (150 kr/mån)",
};

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`addon:user:${user.id}`, 5, 86400)) {
    return NextResponse.json({ error: t("Du har redan skickat en beställning. Vi hör av oss.") }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!ADDONS[kind]) return NextResponse.json({ error: t("Okänt tillägg.") }, { status: 400 });

  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  const lines = [
    `Tillägg: ${ADDONS[kind]}`,
    `Kund: ${user.email || user.id}`,
    `Sajt: ${site?.name || "okänd"}`,
    `Sajt-id: ${site?.id || "okänd"}`,
    `Kund-id: ${user.id}`,
  ];
  const res = await sendEmail({
    to: process.env.ALERT_EMAIL || "hej@cskb.se",
    subject: `Beställning: ${ADDONS[kind]}`,
    text: lines.join("\n"),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(""),
    replyTo: user.email || undefined,
  });
  if (!res.sent) {
    return NextResponse.json({ error: t("Det gick inte att skicka beställningen just nu. Försök igen om en stund.") }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/sites/order-addon", POST_handler);
