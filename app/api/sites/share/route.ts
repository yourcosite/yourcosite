import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Delningslänkar till förhandsvisningen av kundens egen sajt. Varje länk är en
// rad i tabellen share_links, så den kan stängas av när som helst. Länken
// är radens id (ett slumpat, ogissningsbart uuid) och gäller i 14 dagar.
export const dynamic = "force-dynamic";
const DAYS = 14;

const TABLE_MISSING = "Delning är inte aktiverad ännu — tabellen share_links saknas i databasen.";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const siteId = new URL(request.url).searchParams.get("siteId") || "";
  const { data, error } = await supabase
    .from("share_links")
    .select("id, created_at, expires_at")
    .eq("site_id", siteId)
    .eq("owner_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ links: [], error: TABLE_MISSING });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    links: (data || []).map((l) => ({ id: l.id, url: `${origin}/dela/${l.id}`, createdAt: l.created_at, expiresAt: l.expires_at })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 404 });

  const expiresAt = new Date(Date.now() + DAYS * 24 * 3600 * 1000).toISOString();
  const { data: row, error } = await supabase
    .from("share_links")
    .insert({ site_id: site.id, owner_id: user.id, expires_at: expiresAt })
    .select("id, created_at, expires_at")
    .single();
  if (error || !row) return NextResponse.json({ error: TABLE_MISSING }, { status: 500 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    link: { id: row.id, url: `${origin}/dela/${row.id}`, createdAt: row.created_at, expiresAt: row.expires_at },
  });
}

// Stänger av en länk direkt.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Kunde inte stänga av länken." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
