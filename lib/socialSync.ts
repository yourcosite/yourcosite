import { NextResponse } from "next/server";

// Maskin-till-maskin: publiceringssystemet (cs-flow) hämtar godkända inlägg
// med en delad hemlighet. Utan SOCIAL_SYNC_SECRET är allt avstängt.
export function checkSyncSecret(request: Request): NextResponse | null {
  const secret = process.env.SOCIAL_SYNC_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "Avstängt." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Inte behörig." }, { status: 401 });
  }
  return null;
}
