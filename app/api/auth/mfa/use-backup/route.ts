import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCode, normalizeCode } from "@/lib/mfaBackup";
import { withErrorLog } from "@/lib/errorLog";

// Den som tappat sin telefon loggar in med lösenord och en reservkod. Koden
// förbrukas och tvåfaktorn stängs av, så att den kan sättas upp på nytt.
async function POST_handler(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  if (normalizeCode(code).length !== 10) return NextResponse.json({ error: "Koden har fel format." }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mfa_backup_codes")
    .select("id")
    .eq("user_id", user.id)
    .eq("code_hash", hashCode(user.id, code))
    .is("used_at", null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Fel eller redan använd reservkod." }, { status: 400 });

  await admin.from("mfa_backup_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  const { data: list } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  for (const f of list?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
  await admin.from("mfa_backup_codes").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/auth/mfa/use-backup", POST_handler);
