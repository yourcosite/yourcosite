// De vanligaste sociala medierna en kund kan vilja länka till. Hålls som en
// begränsad lista (inte fritext för plattformsnamn) så vi kan visa rätt
// ikon/etikett konsekvent i både onboardingen och den publicerade sajten.
// "color" är bara en igenkänningsfärg för rundan i onboardingens UI — inte
// de riktiga varumärkenas logotyper.
export const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "instagram", label: "Instagram", color: "#D6249F" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "tiktok", label: "TikTok", color: "#111111" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "x", label: "X (Twitter)", color: "#111111" },
  { id: "pinterest", label: "Pinterest", color: "#E60023" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

export function socialPlatformLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label || id;
}

export function socialPlatformColor(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.color || "#6E6C68";
}
