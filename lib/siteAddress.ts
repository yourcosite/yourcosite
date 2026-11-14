// Adressen en sajt nås på: egen domän först, annars gratisadressen när den är live.
export function siteAddress(s: { domain?: string | null; slug?: string | null; custom_domain?: string | null; status?: string | null }): string | null {
  if (s.custom_domain) return s.custom_domain;
  if (s.status === "live" && s.slug) return `${s.slug.toLowerCase()}.yourcosite.com`;
  return s.domain ?? null;
}
