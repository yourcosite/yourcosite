import type { SiteContent, MenuCategory } from "./contentModel";

// Fejkföretaget i demon på /demo: "Mörkvik Barbershop", en påhittad
// herrfrisör i en mörk mall (skinet "skymning"). Allt här är påhittat —
// adress, telefon, personer, priser och nyheter. Texterna är på svenska
// (demon visas som sajtens eget innehåll, så de översätts inte). Bilderna
// delas med exempelsidorna under /exempel (salong-*).

export const DEMO_SITE_ID = "demo-site";
export const DEMO_USER_ID = "demo-user";

const img = (n: string) => `/images/salong-${n}.jpg`;

const prices: MenuCategory[] = [
  {
    name: "KLIPPNING",
    description: "Alla klippningar börjar med ett samtal och slutar med en spegel i handen.",
    items: [
      { name: "Herrklippning", description: "Maskin och sax, tvätt och styling ingår", price: "450 kr" },
      { name: "Skinfade", description: "Mjuk övergång ner till skinnet", price: "495 kr" },
      { name: "Pensionär och student", description: "Mån till tors före klockan 15", price: "350 kr" },
      { name: "Pojkklippning", description: "Upp till 12 år", price: "320 kr" },
    ],
  },
  {
    name: "SKÄGG OCH RAKNING",
    items: [
      { name: "Skäggtrimning", description: "Form, kontur och skäggolja", price: "290 kr" },
      { name: "Rakning med kniv", description: "Varm handduk, rakolja och rakkniv", price: "395 kr" },
      { name: "Klippning och skägg", description: "Vår mest bokade kombination", price: "690 kr" },
      { name: "Kontur och nacke", description: "Snabb uppfräschning mellan klippningarna", price: "150 kr" },
    ],
  },
  {
    name: "EXTRA",
    items: [
      { name: "Hårfärg för män", description: "Täck grått eller byt nyans", price: "Från 550 kr" },
      { name: "Ansiktsbehandling", description: "Rengöring, ånga och mask", price: "420 kr" },
      { name: "Head spa", description: "Hårbottenmassage i 20 minuter", price: "380 kr" },
      { name: "Presentkort", description: "Valfritt belopp, giltigt i ett år", price: "Från 300 kr" },
    ],
  },
];

export function buildDemoContent(): SiteContent {
  const address = "Kvarngatan 12, 602 21 Norrköping";
  return {
    logoUrl: "/demo/morkvik-logo.svg",
    exampleContent: false,
    theme: {
      skin: "skymning",
      accentColor: "#C8864B",
      secondaryColors: ["#2B2118", "#E7C9A5"],
      font: "serif",
      backgroundMode: "dark",
      buttonStyle: "square",
      headerLayout: "centered-button",
      headerCta: { path: "/boka", label: "Boka tid" },
    },
    pages: [
      {
        path: "/",
        label: "Hem",
        seoTitle: "Mörkvik Barbershop — herrfrisör i Norrköping",
        seoDescription: "Klippning, skägg och rakning med kniv i Norrköping. Boka tid online.",
        sections: [
          {
            id: "h-hero", type: "hero", layout: "fade-bottom",
            eyebrow: "BARBERSHOP I NORRKÖPING",
            headline: "Skarp stil, lugn stund",
            body: "Klippning, skägg och rakning med kniv. Hos oss får du en timme som är din, med kaffe, bra musik och en frisör som tar sig tid.",
            ctaLabel: "Boka tid", ctaLink: "/boka", imageUrl: img("herr"),
          },
          {
            id: "h-about", type: "about", layout: "image-right",
            heading: "Ett gammaldags rakhus med nya idéer",
            body: "Mörkvik öppnade 2016 i ett gammalt kvarnhus på Kvarngatan. Vi ville skapa ett ställe där man kan koppla av en stund, och där hantverket får ta den tid det tar.\n\nVi är fyra frisörer med olika styrkor. Alla klipper med sax och maskin, och två av oss är extra bra på skägg och rakning med kniv.",
            imageUrl: img("herrklipp"),
          },
          {
            id: "h-services", type: "grid", layout: "icon-cards",
            eyebrow: "DET HÄR GÖR VI",
            heading: "Hantverk i varje detalj",
            intro: "Det här är det våra kunder oftast kommer för.",
            items: [
              { title: "Klippning", body: "Sax och maskin efter ditt huvud och din vardag. Tvätt och styling ingår.", icon: "scissors" },
              { title: "Skägg", body: "Form, kontur och skäggolja som gör att det ser bra ut hela veckan.", icon: "award" },
              { title: "Rakning med kniv", body: "Varm handduk, rakolja och lugna drag. En klassiker som aldrig går ur tiden.", icon: "sparkle" },
              { title: "Ansikte och hårbotten", body: "Rengöring, ånga och en riktig hårbottenmassage när du vill ha lite extra.", icon: "heart" },
            ],
            ctaLabel: "Se priser", ctaLink: "/priser",
          },
          {
            id: "h-reviews", type: "testimonials", layout: "single-quote",
            heading: "Vad kunderna säger",
            items: [
              { quote: "Bästa klippningen jag fått på tio år. Han frågade vad jag jobbar med och klippte efter det.", author: "Mattias, stamkund" },
              { quote: "Rakning med kniv var ett riktigt lyft. Jag somnade nästan i stolen.", author: "Oskar" },
              { quote: "Boka online tog en minut. Tiden höll och resultatet blev precis som på bilden jag visade.", author: "Jonas" },
            ],
          },
          {
            id: "h-gallery", type: "gallery", layout: "masonry",
            heading: "Från rakhuset",
            items: [
              { imageUrl: img("sax"), caption: "Skarpa saxar" },
              { imageUrl: img("verktyg"), caption: "Verktygen vi litar på" },
              { imageUrl: img("herrtvatt"), caption: "Tvätt före klippningen" },
              { imageUrl: img("spegel"), caption: "Sista kollen i spegeln" },
              { imageUrl: img("plattang"), caption: "Styling" },
              { imageUrl: img("klipp"), caption: "Klippning i full gång" },
            ],
          },
          {
            id: "h-news", type: "newsList",
            heading: "Nytt från Mörkvik",
          },
          {
            id: "h-cta", type: "cta", layout: "dark-split",
            heading: "Boka din tid i dag",
            body: "Välj behandling, dag och tid. Du får en bekräftelse direkt.",
            ctaLabel: "Boka tid", ctaLink: "/boka", imageUrl: img("herrklipp"),
          },
        ],
      },
      {
        path: "/priser",
        label: "Priser",
        seoTitle: "Priser — Mörkvik Barbershop",
        seoDescription: "Prislista för klippning, skägg och rakning hos Mörkvik Barbershop.",
        sections: [
          {
            id: "p-hero", type: "hero", layout: "split-left",
            eyebrow: "PRISLISTA",
            headline: "Tydliga priser, inga överraskningar",
            body: "Priset du ser här är priset du betalar. Det enda som kan skilja är färg och långt hår.",
            imageUrl: img("verktyg"),
          },
          {
            id: "p-menu", type: "menu", layout: "tabs",
            heading: "Prislista",
            intro: "Alla klippningar inkluderar tvätt och styling.",
            categories: prices,
            note: "Betala med kort, swish eller kontanter. Avbokning senast dagen innan, utan kostnad.",
          },
          {
            id: "p-cta", type: "cta", layout: "centered",
            heading: "Redo för en ny look?",
            body: "Boka en tid, så hjälper vi dig att välja rätt.",
            ctaLabel: "Boka tid", ctaLink: "/boka",
          },
        ],
      },
      {
        path: "/team",
        label: "Teamet",
        seoTitle: "Teamet — Mörkvik Barbershop",
        seoDescription: "Möt frisörerna på Mörkvik Barbershop.",
        sections: [
          {
            id: "t-team", type: "team", layout: "round",
            heading: "Möt frisörerna",
            intro: "Fyra frisörer som älskar sitt hantverk. Välj en favorit eller låt oss välja åt dig.",
            items: [
              { name: "Elias Berg", title: "Grundare och barber", imageUrl: img("herr") },
              { name: "Noel Strand", title: "Skägg och rakkniv", imageUrl: img("herrklipp") },
              { name: "Amir Haddad", title: "Skinfade och mönster", imageUrl: img("herrtvatt") },
              { name: "Selma Lund", title: "Klippning och färg", imageUrl: img("gron") },
            ],
          },
          {
            id: "t-about", type: "about", layout: "centered",
            heading: "Så jobbar vi",
            body: "Vi lyssnar först. Sedan klipper vi, och vi säger till om något inte går att göra så som du tänkt. Ingen ska gå härifrån med en frisyr han inte är nöjd med.",
          },
        ],
      },
      {
        path: "/boka",
        label: "Boka tid",
        seoTitle: "Boka tid — Mörkvik Barbershop",
        seoDescription: "Boka klippning, skägg eller rakning online hos Mörkvik Barbershop.",
        sections: [
          {
            id: "b-booking", type: "booking", layout: "standard",
            heading: "Boka din tid",
            body: "Välj behandling, dag och tid. Du får en bekräftelse direkt.",
          },
          {
            id: "b-faq", type: "faq", layout: "stacked",
            heading: "Bra att veta",
            items: [
              { question: "Måste jag boka?", answer: "Boka gärna, men vi tar emot drop-in när det finns en ledig stol." },
              { question: "Hur avbokar jag?", answer: "Svara på bekräftelsemejlet senast dagen innan, så kostar det ingenting." },
              { question: "Kan jag ta med mitt barn?", answer: "Absolut. Pojkklippning tar cirka 20 minuter. Berätta åldern när du bokar." },
              { question: "Vilka betalsätt tar ni?", answer: "Kort, swish och kontanter." },
            ],
          },
        ],
      },
      {
        path: "/nyheter",
        label: "Nyheter",
        seoTitle: "Nyheter — Mörkvik Barbershop",
        seoDescription: "Nyheter och erbjudanden från Mörkvik Barbershop.",
        sections: [
          {
            id: "n-list", type: "newsList",
            heading: "Nyheter och erbjudanden",
          },
        ],
      },
      {
        path: "/kontakt",
        label: "Kontakt",
        seoTitle: "Kontakt — Mörkvik Barbershop",
        seoDescription: "Adress, öppettider och kontaktuppgifter till Mörkvik Barbershop.",
        sections: [
          {
            id: "k-form", type: "contactForm", layout: "split-map", address,
            heading: "Hör av dig",
            body: "Har du en fråga eller vill du boka något särskilt, till exempel en svensexa eller ett företagsevent? Skriv några rader så svarar vi inom ett dygn.",
            submitLabel: "Skicka",
          },
          {
            id: "k-info", type: "contact", layout: "split-info",
            heading: "Öppettider och adress",
            body: "Måndag till fredag 9 till 19, lördag 10 till 16. Söndag stängt.",
            email: "hej@morkvik-demo.se", phone: "011 – 123 45 67", address,
          },
          {
            id: "k-map", type: "map", layout: "inline",
            heading: "Hitta hit", address,
          },
        ],
      },
    ],
  } as SiteContent;
}

const dayAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export function buildDemoNews() {
  const base = { site_id: DEMO_SITE_ID, scheduled_at: null, unpublish_at: null };
  return [
    {
      ...base, id: "demo-news-1", slug: "ny-kvallstid-pa-torsdagar",
      title: "Ny kvällstid på torsdagar",
      excerpt: "Från och med nu har vi öppet till klockan 20 varje torsdag.",
      body: "Många av er har önskat senare tider mitt i veckan, så från och med nu har vi öppet till klockan 20 varje torsdag.\n\nBoka som vanligt här på sajten. Kvällstiderna brukar gå fort.",
      image_url: img("spegel"), category: "Nyheter", published: true,
      published_at: dayAgo(3), created_at: dayAgo(3), updated_at: dayAgo(3),
    },
    {
      ...base, id: "demo-news-2", slug: "klipp-och-skagg-for-690-kr",
      title: "Klipp och skägg för 690 kr i november",
      excerpt: "Hela november kostar vår mest bokade kombination 690 kr.",
      body: "Under hela november kostar klippning och skäggtrimning tillsammans 690 kr, tvätt och styling ingår.\n\nErbjudandet gäller måndag till torsdag. Nämn det när du bokar.",
      image_url: img("herrtvatt"), category: "Erbjudanden", published: true,
      published_at: dayAgo(9), created_at: dayAgo(9), updated_at: dayAgo(9),
    },
    {
      ...base, id: "demo-news-3", slug: "julklappstips-presentkort",
      title: "Julklappstips: presentkort på en rakning",
      excerpt: "Ge bort en stund för sig själv. Presentkort finns i valfritt belopp.",
      body: "Svårt att hitta en julklapp till pappa, pojkvännen eller kollegan? Ge bort en rakning med kniv eller ett presentkort på valfritt belopp.\n\nKöp i salongen eller skriv till oss, så ordnar vi det.",
      image_url: img("sax"), category: "Evenemang", published: true,
      published_at: dayAgo(16), created_at: dayAgo(16), updated_at: dayAgo(16),
    },
    {
      ...base, id: "demo-news-4", slug: "nya-produkter-pa-hyllan",
      title: "Nya produkter på hyllan (utkast)",
      excerpt: "Vi har tagit in ny skäggolja och stylingvax.",
      body: "Det här är ett utkast som inte syns på sajten än. Prova att publicera det i panelen Nyheter.",
      image_url: null, category: "Nyheter", published: false,
      published_at: null, created_at: dayAgo(1), updated_at: dayAgo(1),
    },
  ];
}

export function buildDemoState() {
  const now = new Date().toISOString();
  return {
    tables: {
      sites: [
        {
          id: DEMO_SITE_ID, owner_id: DEMO_USER_ID, name: "Mörkvik Barbershop",
          status: "live", domain: "morkvik-barbershop.se", language: "sv",
          content: buildDemoContent(), chat_history: [], translations: {},
          created_at: now, updated_at: now,
        },
      ],
      site_news_articles: buildDemoNews(),
    } as Record<string, Record<string, unknown>[]>,
  };
}

export type DemoState = ReturnType<typeof buildDemoState>;
