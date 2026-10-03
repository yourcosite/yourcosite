// De vanligaste sociala medierna en kund kan vilja länka till. Hålls som en
// begränsad lista (inte fritext för plattformsnamn) så vi kan visa rätt
// ikon/etikett konsekvent i både onboardingen och den publicerade sajten.
export const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X (Twitter)" },
  { id: "pinterest", label: "Pinterest" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

export function socialPlatformLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label || id;
}
