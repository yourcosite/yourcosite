import { createHmac, timingSafeEqual } from "crypto";

// "Logga in som kund" byter ut adminens session mot kundens. För att kunna
// gå tillbaka utan att logga in igen sparas en signerad, httpOnly-kaka som
// bara talar om VEM som är admin och vilken kund som visas. Själva
// återinloggningen sker sedan via en ny engångslänk från servern, efter att
// rollen kontrollerats igen.
export const IMPERSONATION_COOKIE = "ycs_imp";
export const IMPERSONATION_FLAG_COOKIE = "ycs_imp_flag"; // läsbar i webbläsaren, bara "1"
export const IMPERSONATION_MAX_AGE = 60 * 60 * 8; // 8 timmar

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function makeImpersonationToken(adminId: string, customerId: string): string {
  const exp = Math.floor(Date.now() / 1000) + IMPERSONATION_MAX_AGE;
  const payload = `${adminId}.${customerId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readImpersonationToken(token: string | undefined | null): { adminId: string; customerId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [adminId, customerId, exp, sig] = parts;
  const payload = `${adminId}.${customerId}.${exp}`;
  const expected = sign(payload);
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return { adminId, customerId };
}
