import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

// Felövervakning utan extern tjänst: fel sparas i tabellen error_log och
// visas på /admin/fel. Första gången ett nytt fel dyker upp (och sedan högst
// var sjätte timme per fel) skickas ett larmmejl till ALERT_EMAIL (annars
// hej@cskb.se). Allt här sväljer egna fel, så övervakningen aldrig kan
// orsaka ett nytt fel.

const ALERT_REPEAT_HOURS = 6;
const ALERT_MAX_PER_HOUR = 10;

export type ErrorInput = {
  source: "server" | "client";
  message: string;
  stack?: string | null;
  url?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  context?: string | null;
};

export function errorParts(e: unknown): { message: string; stack: string | null } {
  if (e instanceof Error) return { message: e.message || e.name, stack: e.stack ?? null };
  try {
    return { message: typeof e === "string" ? e : JSON.stringify(e), stack: null };
  } catch {
    return { message: String(e), stack: null };
  }
}

function fingerprintOf(i: ErrorInput): string {
  const firstFrame = (i.stack || "").split("\n").find((l) => l.trim().startsWith("at ")) || "";
  return createHash("sha1")
    .update([i.source, i.message.slice(0, 200), firstFrame.trim().slice(0, 200)].join("|"))
    .digest("hex")
    .slice(0, 16);
}

export async function logError(input: ErrorInput): Promise<void> {
  try {
    const db = createAdminClient();
    const fingerprint = fingerprintOf(input);
    const now = Date.now();

    // Larma om felet inte larmats på ett tag, och bara om vi inte redan
    // skickat många larm den senaste timmen (skydd mot mejlstorm).
    const { count: recentSame } = await db
      .from("error_log")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint)
      .eq("alerted", true)
      .gte("created_at", new Date(now - ALERT_REPEAT_HOURS * 3600_000).toISOString());
    let alert = (recentSame ?? 0) === 0;
    if (alert) {
      const { count: lastHour } = await db
        .from("error_log")
        .select("id", { count: "exact", head: true })
        .eq("alerted", true)
        .gte("created_at", new Date(now - 3600_000).toISOString());
      if ((lastHour ?? 0) >= ALERT_MAX_PER_HOUR) alert = false;
    }

    await db.from("error_log").insert({
      source: input.source,
      fingerprint,
      message: input.message.slice(0, 1000),
      stack: input.stack ? input.stack.slice(0, 4000) : null,
      url: input.url ? input.url.slice(0, 500) : null,
      user_id: input.userId ?? null,
      user_agent: input.userAgent ? input.userAgent.slice(0, 300) : null,
      context: input.context ? input.context.slice(0, 300) : null,
      alerted: alert,
    });

    if (alert) {
      const to = process.env.ALERT_EMAIL || "hej@cskb.se";
      const where = input.context || input.url || "okänd plats";
      const html =
        `<p><b>Nytt fel i YourCoSite</b> (${input.source === "server" ? "servern" : "webbläsaren"})</p>` +
        `<p>${escapeHtml(input.message.slice(0, 400))}</p>` +
        `<p>Plats: ${escapeHtml(where)}</p>` +
        `<p>Se alla fel: <a href="https://yourcosite.vercel.app/admin/fel">/admin/fel</a></p>`;
      const text = `Nytt fel i YourCoSite (${input.source})\n${input.message.slice(0, 400)}\nPlats: ${where}\nhttps://yourcosite.vercel.app/admin/fel`;
      await sendEmail({ to, subject: `Fel i YourCoSite: ${input.message.slice(0, 70)}`, html, text });
    }
  } catch (e) {
    console.error("[errorLog] kunde inte logga", e);
  }
}

// Omsluter en route handler: oväntade fel och svar med status 500 eller
// högre loggas, sedan går felet vidare precis som förut.
export function withErrorLog<A extends unknown[], R>(
  name: string,
  handler: (...args: A) => Promise<R> | R
) {
  return async (...args: A): Promise<R> => {
    try {
      const res = await handler(...args);
      const status = (res as { status?: number } | undefined)?.status;
      if (typeof status === "number" && status >= 500) {
        await logError({ source: "server", message: `Svar ${status} från ${name}`, context: name });
      }
      return res;
    } catch (e) {
      const { message, stack } = errorParts(e);
      await logError({ source: "server", message, stack, context: name });
      throw e;
    }
  };
}
