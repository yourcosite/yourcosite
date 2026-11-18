import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aalOfToken } from "@/lib/supabase/aal";
import { hashCode, newBackupCode } from "@/lib/mfaBackup";
import { withErrorLog } from "@/lib/errorLog";

// Skapar en ny omgång reservkoder (de gamla slutar fungera). Kräver en session
// som bekräftats med kod, så ingen kan skapa koder med bara lösenordet.
async function POST_handler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });
  const { data: { session } } = await supabase.auth.getSession();
  if (aalOfToken(session?.access_token) !== "aal2") return NextResponse.json({ error: "Bekräfta med din kod först." }, { status: 403 });

  const admin = createAdminClient();
  const codes = Array.from({ length: 8 }, () => newBackupCode());
  await admin.from("mfa_backup_codes").delete().eq("user_id", user.id);
  const { error } = await admin.from("mfa_backup_codes").insert(codes.map((c) => ({ user_id: user.id, code_hash: hashCode(user.id, c) })));
  if (error) return NextResponse.json({ error: "Kunde inte spara reservkoderna." }, { status: 500 });
  return NextResponse.json({ codes });
}

export const POST = withErrorLog("POST /api/auth/mfa/backup-codes", POST_handler);
