import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_FLAG_COOKIE,
  IMPERSONATION_MAX_AGE,
  makeImpersonationToken,
} from "@/lib/impersonation";
import { withErrorLog } from "@/lib/errorLog";

// Genererar en engångslänk som loggar in webbläsaren som kunden.
// Bara superadmin, eftersom det här är den känsligaste admin-åtgärden
// som finns — den byter faktiskt ut vems session webbläsaren har.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", params.id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: t("Hittade ingen kund med det id:t.") }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo: `${origin}/dashboard` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: "loggade in som kunden",
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile.full_name || profile.email,
  });

  const hashed = data.properties?.hashed_token;
  if (!hashed) return NextResponse.json({ error: t("Kunde inte skapa inloggningslänken.") }, { status: 500 });
  const res = NextResponse.json({
    actionLink: `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&next=${encodeURIComponent("/dashboard")}`,
  });
  const secure = process.env.NODE_ENV === "production";
  // Så att adminen kan ta sig tillbaka med en knapp (se /api/admin/impersonation).
  res.cookies.set(IMPERSONATION_COOKIE, makeImpersonationToken(check.user.id, params.id), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE,
  });
  res.cookies.set(IMPERSONATION_FLAG_COOKIE, "1", { sameSite: "lax", secure, path: "/", maxAge: IMPERSONATION_MAX_AGE });
  return res;
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/impersonate", POST_handler);
