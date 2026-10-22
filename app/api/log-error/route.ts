import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimited } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// Tar emot fel från webbläsaren (se components/ErrorReporter.tsx).
export async function POST(request: Request) {
  if (await rateLimited(`logerr:${clientIp(request)}`, 20, 600)) {
    return NextResponse.json({ ok: true });
  }
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ ok: false }, { status: 400 });

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {}

  await logError({
    source: "client",
    message,
    stack: typeof body.stack === "string" ? body.stack : null,
    url: typeof body.url === "string" ? body.url : null,
    userAgent: request.headers.get("user-agent"),
    userId,
    context: typeof body.context === "string" ? body.context : null,
  });
  return NextResponse.json({ ok: true });
}
