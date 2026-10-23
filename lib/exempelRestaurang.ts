import type { SiteContent, MenuCategory } from "./contentModel";
import type { TFunction } from "./i18n/config";

// Restaurangexemplet under /exempel/restaurang. Byggt av samma sektioner som
// kundernas sajter (renderas av SitePreview), så exemplet visar exakt vad
// verktyget gör. Alla texter går genom t() så exemplet följer besökarens språk.
export function buildRestaurantExample(t: TFunction): SiteContent {
  const img = (n: string) => `/images/bistro-${n}.jpg`;

  const menu: MenuCategory[] = [
    {
      name: t("SMÅTT ATT DELA"),
      description: t("Beställ två–tre per person och dela."),
      items: [
        { name: t("Ostron, tre stycken"), description: t("Citron, schalottenlök, rödvinsvinäger"), price: "98 kr", tags: ["gf", "lf"] },
        { name: t("Croquetas"), description: t("Serranoskinka, krämig béchamel, aioli"), price: "85 kr" },
        { name: t("Spansk tortilla"), description: t("Potatis, gul lök, ägg, aioli"), price: "79 kr", tags: ["v", "gf"] },
        { name: t("Oliver och mandel"), description: t("Marinerade oliver, rostade mandlar, havssalt"), price: "59 kr", tags: ["vg", "gf"] },
      ],
    },
    {
      name: t("FRÅN HAVET"),
      items: [
        { name: t("Blåmusslor"), description: t("Vitvin, vitlök, persilja, pommes frites"), price: "185 kr" },
        { name: t("Grillade scampi"), description: t("Vitlöksolja, citron, rostat bröd"), price: "215 kr", tags: ["lf"] },
        { name: t("Laxrulle"), description: t("Flammad lax, ärtskott, soja, wasabi"), price: "165 kr", tags: ["lf"] },
      ],
    },
    {
      name: t("HUVUDRÄTTER"),
      items: [
        { name: t("Paella med kyckling"), description: t("Saffransris, vita bönor, haricots verts"), price: "225 kr", tags: ["gf", "lf"] },
        { name: t("Penne med aubergine"), description: t("Körsbärstomat, basilika, olivolja, pecorino"), price: "175 kr", tags: ["v"] },
        { name: t("Tacos med het kyckling"), description: t("Tre små tortillor, avokadokräm, het sås"), price: "165 kr", tags: ["hot", "lf"] },
        { name: t("Tomatris med rostad paprika"), description: t("Svamp, rostad paprika, örtolja"), price: "195 kr", tags: ["vg", "gf"] },
      ],
    },
    {
      name: t("EFTERRÄTTER"),
      items: [
        { name: t("Baskisk cheesecake"), description: t("Brända kanter, bärsylt"), price: "95 kr", tags: ["v", "gf"] },
        { name: t("Citronsorbet"), description: t("Basilika, olivolja"), price: "79 kr", tags: ["vg", "gf", "lf"] },
      ],
    },
    {
      name: t("BAREN"),
      description: t("Happy hour 17–19: alla cocktails till halva priset."),
      items: [
        { name: t("Manhattan"), description: t("Rågwhisky, söt vermouth, bitter, körsbär"), price: "145 kr" },
        { name: t("Provarbricka"), description: t("Fyra små smaker från baren, välj själv eller låt oss överraska"), price: "129 kr" },
        { name: t("Hibiskuslemonad"), description: t("Alkoholfri, med lime och mynta"), price: "75 kr", tags: ["vg", "gf", "lf"] },
      ],
    },
  ];

  const address = t("Tegelbruksgatan 7, 602 22 Norrköping");

  return {
    theme: {
      accentColor: "#E39A55",
      secondaryColors: ["#B5532F", "#7A8B5C"],
      font: "serif",
      backgroundMode: "dark",
      buttonStyle: "pill",
      headerLayout: "split-button",
      headerCta: { path: "/kontakt", label: t("Boka bord") },
    },
    pages: [
      {
        path: "/",
        label: t("Hem"),
        seoTitle: t("Exempel: Bistro Tegelbruket"),
        seoDescription: t("Bistro Tegelbruket — exempel byggt med YourCoSite."),
        sections: [
          {
            id: "h-hero", type: "hero", layout: "overlay-bottom",
            eyebrow: t("SEDAN 2019 · NORRKÖPING"),
            headline: t("Mat att dela, i ett gammalt tegelbruk"),
            body: t("Havets smaker, spanska klassiker och en bar som tar cocktails på allvar. Mellan tegelväggar och gröna växter."),
            ctaLabel: t("Boka bord"), ctaLink: "/kontakt", imageUrl: img("hero"),
          },
          {
            id: "h-about", type: "about", layout: "image-stats",
            heading: t("Ett gammalt tegelbruk med nytt liv"),
            body: t("Bistro Tegelbruket öppnade 2019 i en före detta verkstadslokal med bevarade tegelväggar. Vi ville skapa en plats där man kan sätta sig med vänner och dela många små rätter.") + "\n\n" +
              t("Här lagas maten av skaldjur, ris och grönsaker i säsong, och drinkarna skakas för hand i baren. Kom för en lång middag, ett glas efter jobbet eller bara en bit tortilla vid bardisken."),
            imageUrl: img("quote-bg"),
            stats: [
              { value: "2019", label: t("Öppnade") },
              { value: "48", label: t("Platser i matsalen") },
              { value: "12", label: t("Cocktails på kartan") },
            ],
          },
          {
            id: "h-features", type: "grid", layout: "cards",
            eyebrow: t("DET HÄR KAN DU VÄNTA DIG"),
            heading: t("Tre skäl att komma förbi"),
            intro: t("Ett kök som älskar havet, bord som är gjorda för att dela och en bar som öppnar tidigt."),
            items: [
              { title: t("Färskt från havet"), body: t("Ostron, blåmusslor och dagens fångst — levererat flera gånger i veckan."), imageUrl: img("feature-1") },
              { title: t("Mycket att dela"), body: t("Tapas, paella och stora fat. Beställ flera och ta det i er egen takt."), imageUrl: img("feature-2") },
              { title: t("Baren öppnar tidigt"), body: t("Klassiska cocktails och alkoholfria alternativ, happy hour mellan 17 och 19."), imageUrl: img("feature-3") },
            ],
          },
          {
            id: "h-favorites", type: "grid", layout: "alternating-rows",
            eyebrow: t("FRÅN MENYN"),
            heading: t("Gästernas favoriter"),
            items: [
              { title: t("Ostron, tre stycken"), body: t("Öppnas för hand vid beställning och serveras med citron, schalottenlök och rödvinsvinäger."), imageUrl: img("ostron"), link: "/meny", linkLabel: t("Se hela menyn") },
              { title: t("Tacos med het kyckling"), body: t("Tre små tortillor med avokadokräm och het sås. Passar bra som delningsrätt till drinkarna."), imageUrl: img("tacos"), link: "/meny", linkLabel: t("Se hela menyn") },
              { title: t("Laxrulle"), body: t("Flammad lax med ärtskott, soja och wasabi. En lätt rätt som går bra att dela."), imageUrl: img("sushi"), link: "/meny", linkLabel: t("Se hela menyn") },
            ],
          },
          {
            id: "h-reviews", type: "testimonials", layout: "carousel-row",
            heading: t("Vad gästerna säger"),
            items: [
              { quote: t("Man kommer för maten och stannar för stämningen."), author: t("En återkommande kvällsgäst") },
              { quote: t("Vi var åtta personer och fick hjälp att sätta ihop en meny att dela. Alla blev mätta och nöjda."), author: t("Gäst på födelsedagsmiddag") },
              { quote: t("Baren är en egen anledning att komma. Provarbrickan är en bra idé."), author: t("Gäst efter jobbet") },
            ],
          },
          {
            id: "h-gallery", type: "gallery", layout: "mosaic",
            heading: t("Kvällar hos oss"),
            items: [
              { imageUrl: img("gal-1"), caption: t("Skål vid middagsbordet") },
              { imageUrl: img("gal-2"), caption: t("Provarbricka med fyra smaker") },
              { imageUrl: img("gal-3"), caption: t("Långbordet i matsalen") },
              { imageUrl: img("gal-4"), caption: t("Lunch vid tegelväggen") },
              { imageUrl: img("hero"), caption: t("Matsalen på Bistro Tegelbruket") },
              { imageUrl: img("ostron"), caption: t("Ostron öppnas för hand") },
            ],
          },
          {
            id: "h-faq", type: "faq", layout: "two-column",
            heading: t("Bra att veta"),
            items: [
              { question: t("Hur lång tid tar en middag?"), answer: t("Räkna med två till tre timmar om ni delar flera rätter. Vill ni hinna med något efteråt säger ni det bara till oss.") },
              { question: t("Finns det parkering?"), answer: t("Det finns kantstensparkering på Tegelbruksgatan och ett parkeringshus två kvarter bort. Det är tio minuters promenad från centralstationen.") },
              { question: t("Är lokalen tillgänglig?"), answer: t("Ja, entrén och matsalen är i markplan utan trösklar, och vi har toalett anpassad för rullstol.") },
              { question: t("Kan jag beställa utan att boka?"), answer: t("Ja, baren och cirka hälften av borden sparas för gäster utan bokning. Helger fylls snabbt, så boka gärna i förväg.") },
            ],
          },
          {
            id: "h-contact", type: "contact", layout: "split-info",
            heading: t("Hitta hit"),
            body: t("Vi har öppet tisdag till lördag. Köket stänger klockan 22 och baren håller öppet till 23."),
            email: "hej@tegelbruket.se", phone: "011 – 123 45 67", address,
          },
          {
            id: "h-cta", type: "cta", layout: "image-bleed",
            heading: t("Boka ditt bord i dag"),
            body: t("Skriv hur många ni är och när ni vill komma, så återkommer vi inom ett dygn."),
            ctaLabel: t("Boka bord"), ctaLink: "/kontakt", imageUrl: img("kontakt-banner"),
          },
        ],
      },
      {
        path: "/meny",
        label: t("Meny"),
        seoTitle: t("Meny — Bistro Tegelbruket"),
        seoDescription: t("Meny — Bistro Tegelbruket, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "m-hero", type: "hero", layout: "fade-bottom",
            eyebrow: t("KVÄLLSMENY"),
            headline: t("Menyn just nu"),
            body: t("Fråga oss gärna om allergier — vi hjälper till."),
            imageUrl: img("meny-banner"),
          },
          {
            id: "m-menu", type: "menu", layout: "classic",
            heading: t("Mat och dryck"),
            intro: t("Beställ flera rätter och dela. Personalen hjälper gärna till att sätta ihop en meny."),
            categories: menu,
            note: t("Menyn är ett exempel och rätterna är påhittade. Kontakta oss alltid vid allergi."),
          },
          {
            id: "m-cta", type: "cta", layout: "centered",
            heading: t("Hungrig nu?"),
            body: t("Boka bord eller kom förbi — baren har alltid plats för några fler."),
            ctaLabel: t("Boka bord"), ctaLink: "/kontakt",
          },
        ],
      },
      {
        path: "/om-oss",
        label: t("Om oss"),
        seoTitle: t("Om oss — Bistro Tegelbruket"),
        seoDescription: t("Om oss — Bistro Tegelbruket, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "o-hero", type: "hero", layout: "split-right",
            eyebrow: t("VÅR HISTORIA"),
            headline: t("Från gammalt tegelbruk till kvarterets matsal"),
            body: t("Bistro Tegelbruket öppnade 2019 i en före detta verkstadslokal med bevarade tegelväggar. Vi ville skapa en plats där man kan sätta sig med vänner och dela många små rätter."),
            ctaLabel: t("Se menyn"), ctaLink: "/meny", imageUrl: img("om-kok"),
          },
          {
            id: "o-story", type: "about", layout: "image-left",
            heading: t("Så började det"),
            body: t("Huset byggdes som tegelbruk på 1920-talet och användes sedan som verkstad i flera decennier. När vi tog över lokalen lät vi tegelväggarna och de gamla stålbalkarna vara kvar, och lade till växter, ljus och långa bord.") + "\n\n" +
              t("Köket lagar med skaldjur, ris och grönsaker i säsong, och i baren skakas drinkarna för hand. Fråga gärna personalen — vi hjälper dig att sätta ihop en måltid som passar sällskapet.") + "\n\n" +
              t("Vi tror att en bra kväll är en lång kväll. Därför har vi få regler: ta det lugnt, beställ efter hand och stanna så länge ni vill."),
            imageUrl: img("gal-4"),
          },
          {
            id: "o-values", type: "grid", layout: "numbered",
            eyebrow: t("SÅ ARBETAR VI"),
            heading: t("Fyra saker vi inte tummar på"),
            items: [
              { title: t("Råvaror med ursprung"), body: t("Vi köper skaldjur och fisk av leverantörer vi känner och frågar alltid var råvaran kommer ifrån.") },
              { title: t("Det bästa delas"), body: t("Menyn är gjord för att delas. Små rätter, stora fat och plats för alla att prova.") },
              { title: t("Hantverk i baren"), body: t("Våra drinkar skakas, rörs och garneras för hand. Det finns alltid ett bra alkoholfritt alternativ.") },
              { title: t("Alla ska få plats"), body: t("Vegetariskt, veganskt och glutenfritt finns på varje avdelning av menyn, och vi svarar gärna på frågor om allergier.") },
            ],
          },
          {
            id: "o-numbers", type: "about", layout: "stats-split",
            heading: t("Tegelbruket i siffror"),
            body: t("Vi är ett litet ställe med stora fat. Här är det som får köket och baren att gå runt en vanlig kväll."),
            collageImageUrls: [img("gal-3"), img("ostron")],
            stats: [
              { value: "2019", label: t("Öppnade") },
              { value: "48", label: t("Platser i matsalen") },
              { value: "12", label: t("Cocktails på kartan") },
              { value: "5", label: t("Kvällar i veckan") },
            ],
          },
          {
            id: "o-evening", type: "grid", layout: "cards",
            eyebrow: t("EN KVÄLL HOS OSS"),
            heading: t("Så går det till"),
            items: [
              { title: t("Skål vid ankomst"), body: t("Ni får ett bord eller en plats i baren och en välkomstdrink om ni vill. Ingen brådska."), imageUrl: img("gal-1") },
              { title: t("Dela och prova"), body: t("Beställ några rätter i taget så kommer maten när den är klar. Vi hjälper er att välja."), imageUrl: img("gal-3") },
              { title: t("Avsluta i baren"), body: t("Ta en provarbricka eller en klassiker i baren. Happy hour mellan 17 och 19."), imageUrl: img("gal-2") },
            ],
          },
          {
            id: "o-cta", type: "cta", layout: "centered",
            heading: t("Vi ser fram emot att ha dig som gäst"),
            body: t("Boka bord eller kom förbi och sätt dig i baren."),
            ctaLabel: t("Boka bord"), ctaLink: "/kontakt",
          },
        ],
      },
      {
        path: "/kontakt",
        label: t("Kontakt"),
        seoTitle: t("Kontakt — Bistro Tegelbruket"),
        seoDescription: t("Boka bord — Bistro Tegelbruket, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "k-hero", type: "hero", layout: "centered",
            eyebrow: t("HAPPY HOUR 17–19"),
            headline: t("Boka ett bord hos oss"),
            body: t("Skriv när ni vill komma och hur många ni är, så återkommer vi inom ett dygn."),
            imageUrl: img("quote-bg"),
          },
          {
            id: "k-form", type: "contactForm", layout: "centered",
            heading: t("Skicka en bokningsförfrågan"),
            body: t("Skriv datum, klockslag och antal gäster i meddelandet, och berätta om det är något vi ska veta om allergier eller födelsedagar."),
            submitLabel: t("Skicka bokningsförfrågan"),
          },
          {
            id: "k-info", type: "contact", layout: "split-info",
            heading: t("Öppettider och adress"),
            body: t("Tisdag–lördag, 16–23") + ". " + t("Köket stänger klockan 22 och baren håller öppet till 23."),
            email: "hej@tegelbruket.se", phone: "011 – 123 45 67", address,
          },
          {
            id: "k-faq", type: "faq", layout: "two-column",
            heading: t("Vanliga frågor om bokning"),
            items: [
              { question: t("Hur stora sällskap tar ni emot?"), answer: t("Vi tar emot sällskap på upp till tolv personer vid långbordet. För större grupper, skriv till oss så ordnar vi en egen kväll.") },
              { question: t("Kan jag avboka?"), answer: t("Ja, avboka gärna senast samma dag så att bordet kan gå till någon annan. Vi tar ingen avgift.") },
              { question: t("Går det bra att ta med barn?"), answer: t("Absolut. Vi har barnstolar och kan göra små portioner av flera rätter.") },
              { question: t("Hur gör ni med allergier?"), answer: t("Berätta när ni bokar eller när ni sätter er, så guidar personalen er rätt på menyn.") },
            ],
          },
        ],
      },
    ],
  };
}
