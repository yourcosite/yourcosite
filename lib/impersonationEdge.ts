// Kontroll av den signerade kakan för "logga in som kund" i middleware
// (Edge-miljö, därför Web Crypto i stället för node:crypto). Samma format som
// lib/impersonation.ts: adminId.customerId.exp.signatur.
export async function impersonatingCustomer(token: string | undefined | null, customerId: string): Promise<boolean> {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 4) return false;
    const [adminId, cid, exp, sig] = parts;
    if (cid !== customerId || Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${adminId}.${cid}.${exp}`));
    const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}
