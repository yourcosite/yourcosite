import { createHmac, timingSafeEqual } from "crypto";

// Avanmälan från våra automatiska mejl (välkomst, tips). Länken är signerad
// med servernyckeln, så ingen kan avanmäla någon annan genom att gissa ett id.
const SECRET = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";

const sign = (userId: string) => createHmac("sha256", SECRET()).update(`unsub:${userId}`).digest("hex").slice(0, 32);

export function unsubscribeUrl(userId: string): string {
  return `https://www.yourcosite.com/avanmal?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
