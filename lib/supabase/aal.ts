// Tvåstegsverifiering: en session har nivå aal1 efter lösenord och aal2 när
// koden från autentiseringsappen också är bekräftad. Nivån ligger i
// åtkomsttokenen (JWT) som claim "aal".
export function aalOfToken(accessToken: string | null | undefined): "aal1" | "aal2" | null {
  if (!accessToken) return null;
  try {
    const part = accessToken.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const aal = JSON.parse(json).aal;
    return aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return null;
  }
}

export function hasVerifiedFactor(user: { factors?: { status?: string }[] | null } | null | undefined): boolean {
  return !!user?.factors?.some((f) => f.status === "verified");
}
