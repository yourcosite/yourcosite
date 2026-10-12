import { createHmac, timingSafeEqual } from "crypto";

// Delningslänkar till en förhandsvisning. Ingen databasändring: länken är
// signerad (HMAC) med serverns hemliga nyckel och gäller en begränsad tid.
// Bara serverkod får importera den här filen.
const DAYS = 14;

function secret(): string {
  const s = process.env.SHARE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Saknar hemlig nyckel för delningslänkar.");
  return `share-link:${s}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createShareToken(siteId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + DAYS * 24 * 3600;
  const payload = `${siteId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

// Returnerar sajt-id om länken är äkta och inte gått ut, annars null.
export function verifyShareToken(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [siteId, expStr, sig] = parts;
  if (!/^[0-9a-fA-F-]{36}$/.test(siteId) || !/^\d+$/.test(expStr)) return null;
  const expected = sign(`${siteId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expStr) * 1000 < now) return null;
  return siteId;
}

export const SHARE_LINK_DAYS = DAYS;
