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
  {
    inboxId: "002-photos",
    caption:
      "Your photos do the talking.\n\n1. Shoot near a window. Soft daylight beats any flash.\n2. Show real people and real places, not stock.\n3. Keep one look across the site: same light, same colors.\n\nA website with a few honest, well lit photos feels more trustworthy than one full of perfect stock images.\n\nYour site, built through a conversation: yourcosite.com\n\n#websitetips #smallbusiness #photography #webdesign",
    imageUrl: "https://www.yourcosite.com/social/002-photos.jpg",
    suggestedAt: "2026-11-18T10:00:00Z",
  },
  {
    inboxId: "003-sentence",
    caption:
      "Say what you do in one sentence.\n\n1. Start with what you offer and who it is for.\n2. Put it at the very top of your homepage.\n3. Read it out loud. If it sounds like a brochure, rewrite it.\n\nVisitors decide in seconds whether they are in the right place. Make it easy for them.\n\nYour site, built through a conversation: yourcosite.com\n\n#websitetips #smallbusiness #copywriting #webdesign",
    imageUrl: "https://www.yourcosite.com/social/003-sentence.jpg",
    suggestedAt: "2026-11-20T10:00:00Z",
  },
  {
    inboxId: "004-ask",
    caption:
      "Changing your site? Just ask.\n\nWith YourCoSite you do not hunt through menus or wait for a developer. You tell Millie what you want, in your own words, and it is done.\n\nBigger header photo. Opening hours in the footer. A Danish version of the whole site.\n\nTry it at yourcosite.com\n\n#website #smallbusiness #AI #nocode",
    imageUrl: "https://www.yourcosite.com/social/004-ask.jpg",
    suggestedAt: "2026-11-23T10:00:00Z",
  },
  {
    inboxId: "005-emms-massage",
    caption:
      "Built with YourCoSite: Emms Massage.\n\nTake a look at emmsmassage.se. A real site, built through a conversation.\n\nWant one of your own? yourcosite.com\n\n#website #smallbusiness #madeinsweden #builtwithyourcosite",
    imageUrl: "https://www.yourcosite.com/social/005-emms-massage.jpg",
    suggestedAt: "2026-11-25T10:00:00Z",
  },
];
