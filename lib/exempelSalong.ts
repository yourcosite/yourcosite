import type { SiteContent, MenuCategory } from "./contentModel";
import type { TFunction } from "./i18n/config";

// Frisörexemplet under /exempel/salong. Byggt av samma sektioner som kundernas
// sajter (renderas av SitePreview). Prislistan är en menysektion, vilket är
// precis hur en kund skulle bygga en prislista. Alla texter går genom t() så
// exemplet följer besökarens språk.
export function buildSalonExample(t: TFunction): SiteContent {
  const img = (n: string) => `/images/salong-${n}.jpg`;

  const prices: MenuCategory[] = [
    {
      name: t("KLIPPNING"),
      description: t("Alla klippningar börjar med ett samtal om vad du vill ha."),
      items: [
        { name: t("Damklippning"), description: t("Tvätt, klippning och föning"), price: t("Från 595 kr") },
        { name: t("Herrklippning"), description: t("Maskin och sax, inklusive tvätt"), price: "395 kr" },
        { name: t("Barnklippning"), description: t("Upp till 12 år"), price: "295 kr" },
        { name: t("Lugg eller toppning"), description: t("Snabb justering mellan klippningarna"), price: "150 kr" },
        { name: t("Skäggtrimning"), description: t("Form, kontur och en varm handduk"), price: "195 kr" },
      ],
    },
    {
      name: t("FÄRG OCH SLINGOR"),
      description: t("Pris efter hårets längd och mängd. Du får ett prisförslag innan vi börjar."),
      items: [
        { name: t("Rotfärgning"), description: t("Täcker utväxten, inklusive föning"), price: t("Från 795 kr") },
        { name: t("Helfärgning"), description: t("Ny färg från rot till topp"), price: t("Från 1 095 kr") },
        { name: t("Slingor"), description: t("Folie eller frihandsmålning"), price: t("Från 1 295 kr") },
        { name: t("Balayage"), description: t("Mjuka, solblekta övergångar"), price: t("Från 1 895 kr") },
        { name: t("Toning"), description: t("Fräschar upp färgen och ger glans"), price: "495 kr" },
      ],
    },
    {
      name: t("STYLING"),
      items: [
        { name: t("Föning"), description: t("Slät, vågig eller med volym"), price: "395 kr" },
        { name: t("Plattång eller locktång"), description: t("Lägg till på valfri behandling"), price: "295 kr" },
        { name: t("Uppsättning"), description: t("Till fest, middag eller examen"), price: "695 kr" },
        { name: t("Bröllopsfrisyr"), description: t("Provtid ingår"), price: t("Från 1 495 kr") },
      ],
    },
    {
      name: t("VÅRD"),
      items: [
        { name: t("Intensiv hårkur"), description: t("Djup fukt för torrt och slitet hår"), price: "295 kr" },
        { name: t("Hårbottenbehandling"), description: t("Massage och rengöring för en fräsch hårbotten"), price: "395 kr" },
        { name: t("Keratinbehandling"), description: t("Slätare och lättare hår i flera månader"), price: t("Från 1 995 kr") },
      ],
    },
  ];

  const address = t("Storgatan 21, 582 19 Linköping");

  return {
    theme: {
      skin: "pastell",
      accentColor: "#C2527A",
      secondaryColors: ["#4A3B52", "#D9A58F"],
      font: "sans",
      backgroundMode: "light",
      buttonStyle: "pill",
      headerLayout: "centered-button",
      headerCta: { path: "/kontakt", label: t("Boka tid") },
    },
    pages: [
      {
        path: "/",
        label: t("Hem"),
        seoTitle: t("Exempel: Salong Saxen"),
        seoDescription: t("Salong Saxen, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "h-hero", type: "hero", layout: "fade-bottom",
            eyebrow: t("FRISÖR I LINKÖPING"),
            headline: t("Hår som känns"),
            body: t("Klippning, färg och styling för alla. Vi lyssnar först och tar oss tid, så att du går härifrån nöjd."),
            ctaLabel: t("Boka tid"), ctaLink: "/kontakt", imageUrl: img("hero"),
          },
          {
            id: "h-about", type: "about", layout: "image-right",
            heading: t("En liten salong med stort engagemang"),
            body: t("Salong Saxen öppnade 2014 på Storgatan med en enkel idé: att varje besök ska börja med ett riktigt samtal. Vi frågar hur du bor, hur du vill ha det och hur mycket tid du vill lägga på håret en vanlig morgon.") + "\n\n" +
              t("Hos oss arbetar fem stylister med olika styrkor, från färg och slingor till herrklippning och festfrisyrer. Det betyder att du alltid hamnar hos någon som verkligen kan det du vill ha."),
            imageUrl: img("handduk"),
          },
          {
            id: "h-services", type: "grid", layout: "icon-cards",
            eyebrow: t("DET HÄR GÖR VI"),
            heading: t("Allt för håret, under ett tak"),
            intro: t("Från en snabb toppning till en helt ny färg. Här är våra vanligaste behandlingar."),
            items: [
              { title: t("Klippning med omtanke"), body: t("Vi klipper efter ditt hårs egen form, så att det faller rätt även veckor senare."), icon: "scissors" },
              { title: t("Färg och slingor"), body: t("Allt från naturliga toner till mjuk balayage. Vi blandar färgen för just ditt hår."), icon: "palette" },
              { title: t("Uppsättning och fest"), body: t("Bröllop, bal eller middag. Vi provar frisyren i förväg så att kvällen blir lugn."), icon: "sparkle" },
              { title: t("Herr och skägg"), body: t("Skarp kontur, mjuka övergångar och skäggtrimning med varm handduk."), icon: "award" },
              { title: t("Barn"), body: t("Korta, snabba och trevliga besök. Vi tar det i barnets takt."), icon: "smile" },
              { title: t("Vård och behandlingar"), body: t("Hårkurer och hårbottenbehandlingar som ger glans och styrka."), icon: "heart" },
            ],
            ctaLabel: t("Se priser"), ctaLink: "/priser",
          },
          {
            id: "h-reviews", type: "testimonials", layout: "single-quote",
            heading: t("Vad kunderna säger"),
            items: [
              { quote: t("Äntligen en frisör som frågar innan hon klipper. Jag gick därifrån med precis den frisyr jag drömt om."), author: t("Stamkund sedan fem år") },
              { quote: t("Min son var nervös första gången, men fick en kul stund och en bra klippning. Nu vill han tillbaka."), author: t("Förälder till en sjuåring") },
              { quote: t("Jag bokade uppsättning och provtid inför bröllopet. Allt satt perfekt hela dagen."), author: t("Nygift kund") },
            ],
          },
          {
            id: "h-gallery", type: "gallery", layout: "masonry",
            heading: t("Från salongen"),
            items: [
              { imageUrl: img("tvatt"), caption: t("Tvätt och massage") },
              { imageUrl: img("flatta"), caption: t("Flätor och uppsättningar") },
              { imageUrl: img("verktyg"), caption: t("Verktygen vi litar på") },
              { imageUrl: img("sax"), caption: t("Skarpa saxar gör skillnad") },
              { imageUrl: img("gron"), caption: t("Nöjd kund vid spegeln") },
              { imageUrl: img("herrtvatt"), caption: t("Tvätt före herrklippningen") },
            ],
          },
          {
            id: "h-faq", type: "faq", layout: "stacked",
            heading: t("Bra att veta"),
            items: [
              { question: t("Hur lång tid tar en klippning?"), answer: t("En damklippning tar ungefär en timme med tvätt och föning. Herr tar cirka 30 minuter.") },
              { question: t("Måste jag boka tid?"), answer: t("Vi rekommenderar bokning, men vi tar gärna emot drop-in när det finns en ledig stol. Ring eller skriv så säger vi hur det ser ut.") },
              { question: t("Använder ni mina egna produkter?"), answer: t("Ja, ta gärna med dem. Vi har också ett urval av produkter att prova i salongen.") },
              { question: t("Vad händer om jag inte är nöjd?"), answer: t("Hör av dig inom en vecka så justerar vi utan extra kostnad.") },
            ],
          },
          {
            id: "h-contact", type: "contact", layout: "centered",
            heading: t("Hitta hit"),
            body: t("Vi har öppet måndag till lördag. Kom förbi eller boka en tid på förhand."),
            email: "hej@salongsaxen.se", phone: "013 – 123 45 67", address,
          },
          {
            id: "h-cta", type: "cta", layout: "dark-split",
            heading: t("Boka din tid i dag"),
            body: t("Skriv vad du vill göra och när du kan, så återkommer vi inom ett dygn."),
            ctaLabel: t("Boka tid"), ctaLink: "/kontakt", imageUrl: img("spegel"),
          },
        ],
      },
      {
        path: "/priser",
        label: t("Priser"),
        seoTitle: t("Priser — Salong Saxen"),
        seoDescription: t("Prislista — Salong Saxen, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "p-hero", type: "hero", layout: "split-left",
            eyebrow: t("PRISLISTA"),
            headline: t("Våra behandlingar och priser"),
            body: t("Tydliga priser och inga överraskningar. Du får alltid ett prisförslag innan vi börjar."),
            imageUrl: img("verktyg"),
          },
          {
            id: "p-menu", type: "menu", layout: "tabs",
            heading: t("Prislista"),
            intro: t("Priserna gäller vanlig hårlängd. Vid långt eller tjockt hår tillkommer en mindre avgift."),
            categories: prices,
            note: t("Prislistan är ett exempel och behandlingarna är påhittade. Vi ger alltid ett prisförslag innan vi börjar."),
          },
          {
            id: "p-cta", type: "cta", layout: "image-bleed", imageUrl: img("verktyg"),
            heading: t("Redo för en ny frisyr?"),
            body: t("Boka en tid, så hjälper vi dig att välja rätt behandling."),
            ctaLabel: t("Boka tid"), ctaLink: "/kontakt",
          },
        ],
      },
      {
        path: "/om-oss",
        label: t("Om oss"),
        seoTitle: t("Om oss — Salong Saxen"),
        seoDescription: t("Om oss — Salong Saxen, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "o-hero", type: "hero", layout: "editorial",
            eyebrow: t("VÅR HISTORIA"),
            headline: t("En salong byggd"),
            headlineEmphasis: t("på goda samtal"),
            collageImageUrls: [img("klipp")],
            body: t("Salong Saxen öppnade 2014 med en enkel idé: att ta sig tid. Därför börjar varje besök med att vi lyssnar på vad du vill och hur du lever."),
            ctaLabel: t("Se priser"), ctaLink: "/priser", imageUrl: img("gron"),
          },
          {
            id: "o-story", type: "about", layout: "centered",
            heading: t("Så började det"),
            body: t("Salongen startade med två stolar och en önskan om att göra det lite lugnare att gå till frisören. Efter några år behövde vi större lokaler och flyttade in på Storgatan, där vi sitter i dag.") + "\n\n" +
              t("I dag arbetar vi fem stylister, alla med olika styrkor. Vi lär av varandra, går på utbildningar varje år och delar gärna med oss av det vi kan.") + "\n\n" +
              t("Vi tror att ett bra besök känns lugnt. Därför har vi bokat in luft mellan kunderna, så att ingen behöver stressa."),
          },
          {
            id: "o-values", type: "grid", layout: "numbered",
            eyebrow: t("SÅ ARBETAR VI"),
            heading: t("Fyra saker vi inte tummar på"),
            items: [
              { title: t("Vi lyssnar först"), body: t("Varje besök börjar med ett samtal om vad du vill ha och hur mycket tid du vill lägga på håret.") },
              { title: t("Rätt person för jobbet"), body: t("Våra stylister har olika styrkor. Du hamnar hos den som är bäst på just det du vill göra.") },
              { title: t("Ärliga priser"), body: t("Du får ett prisförslag innan vi börjar och betalar det vi kom överens om.") },
              { title: t("Skonsamma produkter"), body: t("Vi väljer färg och vård som är bra för både hår och hårbotten, och vi svarar gärna på frågor om innehåll.") },
            ],
          },
          {
            id: "o-numbers", type: "about", layout: "stats-split",
            heading: t("Salongen i siffror"),
            body: t("Vi är en liten salong, men det händer mycket på en vanlig dag. Så här ser det ut."),
            collageImageUrls: [img("tvatt"), img("uppsattning")],
            stats: [
              { value: "2014", label: t("Öppnade") },
              { value: "5", label: t("Stylister") },
              { value: "6", label: t("Stolar") },
              { value: "6", label: t("Dagar i veckan") },
            ],
          },
          {
            id: "o-visit", type: "grid", layout: "alternating-rows",
            eyebrow: t("ETT BESÖK HOS OSS"),
            heading: t("Så går det till"),
            items: [
              { title: t("Vi pratar först"), body: t("Du sätter dig ner, får en kopp kaffe och berättar vad du är ute efter."), imageUrl: img("spegel") },
              { title: t("Vi tar oss tid"), body: t("Tvätt, klippning och färg i lugn takt. Fråga så mycket du vill under tiden."), imageUrl: img("klipp") },
              { title: t("Du går nöjd härifrån"), body: t("Vi visar hur du styr håret hemma, så att det håller sig fint längre."), imageUrl: img("hero") },
            ],
          },
          {
            id: "o-cta", type: "cta", layout: "centered",
            heading: t("Vi ser fram emot att träffa dig"),
            body: t("Boka en tid eller kom förbi och säg hej."),
            ctaLabel: t("Boka tid"), ctaLink: "/kontakt",
          },
        ],
      },
      {
        path: "/kontakt",
        label: t("Kontakt"),
        seoTitle: t("Kontakt — Salong Saxen"),
        seoDescription: t("Boka tid — Salong Saxen, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "k-hero", type: "hero", layout: "beam",
            eyebrow: t("ÖPPET MÅNDAG TILL LÖRDAG"),
            headline: t("Boka en tid hos oss"),
            body: t("Skriv vad du vill göra och när du kan, så återkommer vi inom ett dygn."),
            imageUrl: img("sax"),
          },
          {
            id: "k-form", type: "contactForm", layout: "split-map", address,
            heading: t("Skicka en förfrågan"),
            body: t("Berätta vilken behandling du vill ha, vilka dagar som passar och om du har önskemål om stylist."),
            submitLabel: t("Skicka förfrågan"),
          },
          {
            id: "k-info", type: "contact", layout: "split-info",
            heading: t("Öppettider och adress"),
            body: t("Måndag–fredag 9–18, lördag 10–15") + ". " + t("Vi tar emot drop-in när det finns en ledig stol."),
            email: "hej@salongsaxen.se", phone: "013 – 123 45 67", address,
          },
          {
            id: "k-faq", type: "faq", layout: "stacked",
            heading: t("Vanliga frågor om bokning"),
            items: [
              { question: t("Hur avbokar jag?"), answer: t("Avboka gärna senast dagen innan, så att tiden kan gå till någon annan. Vi tar ingen avgift.") },
              { question: t("Kan jag boka tid åt mitt barn?"), answer: t("Ja, barnklippning tar cirka 20 minuter. Berätta åldern när du bokar, så sätter vi av rätt tid.") },
              { question: t("Hur lång provtid behöver jag för bröllop?"), answer: t("Räkna med en timme för provtiden och en timme på bröllopsdagen. Boka gärna två till tre månader i förväg.") },
              { question: t("Går det att betala med swish?"), answer: t("Ja, vi tar kort, swish och kontanter.") },
            ],
          },
        ],
      },
    ],
  };
}
