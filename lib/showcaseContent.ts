import type { SiteContent, AboutSection, TestimonialsSection, FaqSection, HeroSection } from "./contentModel";

// Medvetet beslut: förslagen ska VISA UPP vad som finns (citat, nyckeltal,
// vanliga frågor ...) — kunden vet ofta inte vad man kan ha på en sajt, och
// det är lättare att ta bort något än att föreställa sig det. Därför fyller vi
// förstasidan med EXEMPELinnehåll om AI:n inte redan skrivit det. Allt det här
// är platshållare som kunden ska byta eller ta bort (Millie hjälper till) —
// flaggan content.exampleContent talar om det.
//
// Backup i kod; i första hand skriver AI:n egna, branschanpassade exempel
// (se generate-prompten).

const EXAMPLE_STATS = [
  { value: "10+", label: "års erfarenhet" },
  { value: "500+", label: "nöjda kunder" },
  { value: "5/5", label: "i snittbetyg" },
];

function exampleTestimonials(name: string): TestimonialsSection["items"] {
  return [
    { quote: `Från första kontakten kändes allt tryggt. ${name} lyssnade, gjorde precis som vi hoppats och lite till.`, author: "Anna L." },
    { quote: "Proffsigt, snabbt och väldigt trevligt bemötande hela vägen. Vi kommer definitivt tillbaka.", author: "Marcus B." },
    { quote: "Det bästa beslutet vi tagit i år. Skillnaden syns direkt och vi får fina ord från våra egna kunder.", author: "Elin S." },
  ];
}

function exampleFaq(): FaqSection["items"] {
  return [
    { question: "Hur går det till när jag vill komma igång?", answer: "Hör av dig via formuläret eller telefon så återkommer vi snabbt med nästa steg och ett första förslag." },
    { question: "Vad kostar det?", answer: "Det beror på dina behov. Vi ger alltid en tydlig offert innan något börjar, så du vet vad du får." },
    { question: "Hur lång tid tar det?", answer: "De flesta uppdrag är klara inom några veckor — vi går igenom en tidsplan tillsammans innan start." },
  ];
}

export function ensureShowcaseSections(content: SiteContent, companyName: string): SiteContent {
  const home = content.pages.find((p) => p.path === "/");
  if (!home) return content;
  let added = false;

  const hero = home.sections.find((s): s is HeroSection => s.type === "hero");
  if (hero && !(hero.stats && hero.stats.length >= 2)) {
    hero.stats = EXAMPLE_STATS;
    added = true;
  }

  // Insättningspunkt: före första cta/svans-sektion, så ordningen blir
  // naturlig. (homeRecipes ordnar sedan om per förslag.)
  const insertAt = () => {
    const idx = home.sections.findIndex((s) =>
      ["cta", "faq", "map", "contact", "contactForm", "newsList"].includes(s.type)
    );
    return idx === -1 ? home.sections.length : idx;
  };

  let about = home.sections.find((s): s is AboutSection => s.type === "about");
  if (!about) {
    about = {
      id: "home-about-example",
      type: "about",
      layout: "stats-split",
      heading: `Om ${companyName}`,
      body: `${companyName} är ett företag som bryr sig om detaljerna. Vi kombinerar erfarenhet med ett personligt bemötande, så att du känner dig trygg från första kontakt till färdigt resultat.`,
    };
    home.sections.splice(insertAt(), 0, about);
    added = true;
  }
  if (!(about.stats && about.stats.length >= 2)) {
    about.stats = EXAMPLE_STATS;
    if (about.layout !== "image-stats") about.layout = "stats-split";
    added = true;
  }

  if (!home.sections.some((s) => s.type === "testimonials")) {
    home.sections.splice(insertAt(), 0, {
      id: "home-testimonials-example",
      type: "testimonials",
      layout: "full-bleed",
      heading: "Vad våra kunder säger",
      items: exampleTestimonials(companyName),
    });
    added = true;
  } else {
    const t = home.sections.find((s): s is TestimonialsSection => s.type === "testimonials")!;
    if (!t.items || t.items.length === 0) {
      t.items = exampleTestimonials(companyName);
      added = true;
    }
  }

  if (!home.sections.some((s) => s.type === "faq")) {
    const idx = home.sections.findIndex((s) => ["map", "contact", "contactForm", "newsList"].includes(s.type));
    home.sections.splice(idx === -1 ? home.sections.length : idx, 0, {
      id: "home-faq-example",
      type: "faq",
      layout: "two-column",
      heading: "Vanliga frågor",
      items: exampleFaq(),
    });
    added = true;
  }

  if (added) content.exampleContent = true;
  return content;
}
