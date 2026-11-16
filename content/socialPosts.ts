// Förslag på inlägg för YourCoSites egna Facebook och Instagram.
// Nya förslag läggs till här (en post per inlägg, unikt inboxId) och hämtas
// in i adminvyn med knappen "Hämta nya förslag". Bilderna ligger i public/social/.
// Inget publiceras förrän du godkänner inlägget i Admin, Sociala medier.
export type SocialDraft = {
  inboxId: string;
  caption: string;
  imageUrl: string;
  firstComment?: string;
  suggestedAt?: string; // förslag på tid, ISO
};

export const SOCIAL_DRAFTS: SocialDraft[] = [
  {
    inboxId: "001-welcome",
    caption:
      "Meet YourCoSite.\n\nYour website, built through a conversation.\n\nTell us about your business, show us what you like, and Millie builds your site. Need a change later? Just ask, like you would ask a colleague.\n\nText, photos, languages and bookings, all by chatting.\n\nTry it at yourcosite.com\n\n#website #smallbusiness #AI #webdesign #madeinsweden",
    imageUrl: "https://www.yourcosite.com/social/001-welcome.jpg",
  },
];
