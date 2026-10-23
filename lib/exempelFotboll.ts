import type { SiteContent, MenuCategory } from "./contentModel";
import type { TFunction } from "./i18n/config";

// Fotbollsklubbens exempel under /exempel/fotboll. Byggt av samma sektioner
// som kundernas sajter (renderas av SitePreview). Träningstider och avgifter
// är menysektioner, ett enkelt sätt att få en tydlig lista med tid eller pris
// till höger. Alla texter går genom t() så exemplet följer besökarens språk.
export function buildFootballExample(t: TFunction): SiteContent {
  const img = (n: string) => `/images/fotboll-${n}.jpg`;

  const schedule: MenuCategory[] = [
    {
      name: t("MÅNDAG"),
      items: [
        { name: t("Knattarna, 6–8 år"), description: t("Lindvallens IP, konstgräsplanen"), price: "17.00–18.00" },
        { name: t("Tjejlaget, 9–12 år"), description: t("Lindvallens IP, stora planen"), price: "18.00–19.30" },
      ],
    },
    {
      name: t("TISDAG"),
      items: [
        { name: t("Ungdomslaget, 9–12 år"), description: t("Lindvallens IP, stora planen"), price: "17.30–19.00" },
        { name: t("Fotbollsskolan, 5–7 år"), description: t("Lindvallens IP, konstgräsplanen"), price: "17.00–18.00" },
      ],
    },
    {
      name: t("TORSDAG"),
      items: [
        { name: t("Ungdomslaget, 13–15 år"), description: t("Lindvallens IP, stora planen"), price: "18.00–19.30" },
        { name: t("Tjejlaget, 9–12 år"), description: t("Idrottshallen, vid dåligt väder"), price: "17.00–18.30" },
      ],
    },
    {
      name: t("LÖRDAG"),
      description: t("Matcher och cuper följer spelschemat. Ledarna meddelar tider i laget."),
      items: [
        { name: t("Matchdag, alla lag"), description: t("Lindvallens IP, hemmamatcher"), price: "10.00–15.00" },
      ],
    },
  ];

  const fees: MenuCategory[] = [
    {
      name: t("TERMINSAVGIFT"),
      description: t("Gäller en termin och ingår i licens och försäkring."),
      items: [
        { name: t("Knattar, 6–8 år"), description: t("Lekfull träning och korta matcher"), price: "450 kr" },
        { name: t("Ungdom, 9–12 år"), description: t("Träning två gånger i veckan och matcher"), price: "650 kr" },
        { name: t("Ungdom, 13–15 år"), description: t("Träning, matcher och cuper"), price: "750 kr" },
      ],
    },
    {
      name: t("TILLÄGG"),
      items: [
        { name: t("Fotbollsskola på lov"), description: t("Fem dagar med bollar, lekar och lunch"), price: "695 kr" },
        { name: t("Matchställ"), description: t("Tröja, shorts och strumpor"), price: "450 kr" },
        { name: t("Syskonrabatt"), description: t("För varje syskon efter det första"), price: t("−100 kr") },
      ],
    },
  ];

  const address = t("Idrottsvägen 4, 591 30 Motala");

  return {
    theme: {
      skin: "kontrast",
      accentColor: "#1F5FD6",
      secondaryColors: ["#D62839", "#F2C94C"],
      font: "sans",
      backgroundMode: "light",
      buttonStyle: "square",
      headerLayout: "pill-bar",
      headerCta: { path: "/bli-medlem", label: t("Bli medlem") },
    },
    pages: [
      {
        path: "/",
        label: t("Hem"),
        seoTitle: t("Exempel: Lindvallens FK"),
        seoDescription: t("Lindvallens FK, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "h-hero", type: "hero", layout: "quad",
            headline: t("Fotboll för alla"),
            body: t("Lindvallens FK är en ungdomsförening i Motala där alla får vara med, oavsett nivå. Vi spelar för att det är kul, och för att växa tillsammans."),
            ctaLabel: t("Bli medlem"), ctaLink: "/bli-medlem", imageUrl: img("lag"),
            stats: [
              { value: "", label: t("Första träningen är gratis") },
              { value: "", label: t("Lag för alla åldrar") },
              { value: "", label: t("Utbildade ledare") },
            ],
          },
          {
            id: "h-about", type: "about", layout: "image-left",
            heading: t("En förening för hela bygden"),
            body: t("Lindvallens FK grundades 1968 av några föräldrar som ville ge barnen i området en plats att spela fotboll. I dag har vi fjorton lag för barn och unga, och ett gäng ledare som brinner för att alla ska få vara med.") + "\n\n" +
              t("Hos oss kommer glädjen före resultaten. Vi tränar tillsammans, tävlar när det är kul och firar varandras framgångar, stora som små."),
            imageUrl: img("koner"),
          },
          {
            id: "h-teams", type: "grid", layout: "bento",
            eyebrow: t("VÅRA LAG"),
            heading: t("Hitta ditt lag"),
            intro: t("Vi har lag för barn och unga i alla åldrar. Kom och prova, första träningen är gratis."),
            items: [
              { title: t("Knattarna"), body: t("För dig som är 6 till 8 år. Lekfull träning där bollen alltid är med."), imageUrl: img("ben"), link: "/lag", linkLabel: t("Se alla lag") },
              { title: t("Ungdomslagen"), body: t("För dig som är 9 till 15 år. Träning, matcher och cuper med laget."), imageUrl: img("hall"), link: "/lag", linkLabel: t("Se alla lag") },
              { title: t("Tjejlaget"), body: t("Ett lag där tjejer tränar och spelar tillsammans, med egna ledare."), imageUrl: img("tjej"), link: "/lag", linkLabel: t("Se alla lag") },
            ],
          },
          {
            id: "h-why", type: "grid", layout: "icon-row",
            eyebrow: t("DÄRFÖR LINDVALLEN"),
            heading: t("Fyra saker vi tror på"),
            items: [
              { title: t("Alla får spela"), body: t("Ingen sitter på bänken för att ha missat en träning. Alla barn får speltid i våra matcher."), icon: "users" },
              { title: t("Utbildade ledare"), body: t("Alla ledare går vår ledarutbildning och har utdrag ur belastningsregistret."), icon: "shield" },
              { title: t("Låga avgifter"), body: t("Vi håller avgifterna nere så att ingen ska behöva avstå. Det finns även stöd att söka."), icon: "heart" },
              { title: t("Trygg miljö"), body: t("Vi arbetar aktivt mot mobbning och gör hellre en extra paus än en onödig tackling."), icon: "flag" },
            ],
          },
          {
            id: "h-news", type: "grid", layout: "alternating-rows",
            eyebrow: t("AKTUELLT"),
            heading: t("Det här händer just nu"),
            items: [
              { title: t("Höstcupen i november"), body: t("Fyra lag från klubben anmäler sig till årets höstcup. Kom och heja!"), imageUrl: img("skott") },
              { title: t("Fotbollsskola på höstlovet"), body: t("En vecka med bollar, lekar och tekniska övningar för barn mellan 5 och 8 år."), imageUrl: img("trana") },
              { title: t("Vi söker fler ledare"), body: t("Gillar du fotboll och barn? Vi ger dig utbildning, utrustning och ett gott sällskap."), imageUrl: img("tranare") },
            ],
          },
          {
            id: "h-reviews", type: "testimonials", layout: "full-bleed", imageUrl: img("ben"),
            heading: t("Det här säger våra medlemmar"),
            items: [
              { quote: t("Min dotter var blyg första träningen, men efter en månad ville hon inte missa någon. Ledarna är fantastiska."), author: t("Förälder till en nioåring") },
              { quote: t("Här får alla vara med. Det är det som gör att man vill komma tillbaka vecka efter vecka."), author: t("Spelare i ungdomslaget") },
              { quote: t("Jag blev ledare för att mitt barn spelade här. Nu har jag aldrig haft roligare på en måndagskväll."), author: t("Ledare för knattarna") },
            ],
          },
          {
            id: "h-gallery", type: "gallery", layout: "tiles",
            heading: t("Från träningar och matcher"),
            items: [
              { imageUrl: img("skott"), caption: t("Skott på mål") },
              { imageUrl: img("trana"), caption: t("Träning i solskenet") },
              { imageUrl: img("ben"), caption: t("Dribbling mellan konerna") },
              { imageUrl: img("koner"), caption: t("Konövning med hela laget") },
              { imageUrl: img("tranare"), caption: t("Samling före matchen") },
              { imageUrl: img("hall"), caption: t("Inomhusträning på vintern") },
            ],
          },
          {
            id: "h-faq", type: "faq", layout: "stacked",
            heading: t("Bra att veta"),
            items: [
              { question: t("Måste man kunna spela fotboll sedan tidigare?"), answer: t("Nej. Vi tar emot alla som vill börja, och våra ledare ser till att alla får vara med oavsett nivå.") },
              { question: t("Kan man prova först?"), answer: t("Ja, första träningen är gratis. Kom i bekväma kläder så fixar vi en boll och en plats i laget.") },
              { question: t("Vad behöver barnet ha med sig?"), answer: t("Gympaskor eller fotbollsskor, benskydd och vattenflaska. Skydd och skor kan vi låna ut första gången.") },
              { question: t("Finns det plats i alla lag?"), answer: t("De flesta lag har plats. Hör av dig så berättar vi var det finns lediga platser just nu.") },
            ],
          },
          {
            id: "h-contact", type: "contact", layout: "split-info",
            heading: t("Hitta till oss"),
            body: t("Vi tränar på Lindvallens IP. Kom förbi på en träning eller hör av dig om du har frågor."),
            email: "hej@lindvallensfk.se", phone: "0141 – 123 45", address,
          },
          {
            id: "h-cta", type: "cta", layout: "dark-split",
            heading: t("Kom och prova första träningen gratis"),
            body: t("Skriv till oss, så berättar vi vilket lag och vilken dag som passar bäst."),
            ctaLabel: t("Bli medlem"), ctaLink: "/bli-medlem", imageUrl: img("tranare"),
          },
        ],
      },
      {
        path: "/lag",
        label: t("Lag"),
        seoTitle: t("Lag och träningstider — Lindvallens FK"),
        seoDescription: t("Lag och träningstider — Lindvallens FK, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "l-hero", type: "hero", layout: "split-left",
            eyebrow: t("VÅRA LAG"),
            headline: t("Ett lag för varje spelare"),
            body: t("Här ser du vilka lag vi har och när de tränar. Hittar du inte rätt, hör av dig så hjälper vi dig."),
            imageUrl: img("hall"),
          },
          {
            id: "l-teams", type: "grid", layout: "list",
            heading: t("Lag och åldersgrupper"),
            items: [
              { title: t("Fotbollsskolan, 5–7 år"), body: t("Det första mötet med fotbollen. Lekar, bollövningar och mycket skratt."), imageUrl: img("koner") },
              { title: t("Knattarna, 6–8 år"), body: t("Korta matcher, enkla övningar och fokus på glädjen i att spela."), imageUrl: img("lag") },
              { title: t("Ungdomslagen, 9–15 år"), body: t("Fler matcher, cuper och lite mer taktik. Fortfarande med glädjen i fokus."), imageUrl: img("trana") },
              { title: t("Tjejlaget, 9–12 år"), body: t("Ett lag med egna ledare där tjejerna tränar, spelar och utvecklas tillsammans."), imageUrl: img("tjej") },
            ],
          },
          {
            id: "l-schedule", type: "menu", layout: "classic",
            heading: t("Träningstider"),
            intro: t("Tiderna gäller höstterminen. Vid dåligt väder tränar vi i idrottshallen."),
            categories: schedule,
            note: t("Tiderna är ett exempel. Ledarna meddelar ändringar i lagets grupp."),
          },
          {
            id: "l-cta", type: "cta", layout: "image-bleed", imageUrl: img("skott"),
            heading: t("Vill du prova?"),
            body: t("Första träningen är gratis. Skriv till oss, så hittar vi rätt lag."),
            ctaLabel: t("Bli medlem"), ctaLink: "/bli-medlem",
          },
        ],
      },
      {
        path: "/bli-medlem",
        label: t("Bli medlem"),
        seoTitle: t("Bli medlem — Lindvallens FK"),
        seoDescription: t("Bli medlem — Lindvallens FK, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "m-hero", type: "hero", layout: "split-right",
            eyebrow: t("BLI MEDLEM"),
            headline: t("Välkommen till laget"),
            body: t("Det är enkelt att börja hos oss. Du kommer på en träning, hittar ditt lag och anmäler dig när du känner dig redo."),
            ctaLabel: t("Anmäl dig"), ctaLink: "/kontakt", imageUrl: img("tjej"),
          },
          {
            id: "m-steps", type: "grid", layout: "icon-circles",
            eyebrow: t("SÅ GÅR DET TILL"),
            heading: t("Tre steg till laget"),
            items: [
              { title: t("Kom och prova"), body: t("Första träningen är gratis. Kom i bekväma kläder så fixar vi resten."), icon: "calendar" },
              { title: t("Hitta ditt lag"), body: t("Ledarna hjälper dig att hitta ett lag som passar din ålder och dina önskemål."), icon: "users" },
              { title: t("Anmäl dig"), body: t("Fyll i formuläret på kontaktsidan, så får du medlemsinformation och en faktura på terminsavgiften."), icon: "check" },
            ],
          },
          {
            id: "m-fees", type: "menu", layout: "elegant",
            heading: t("Avgifter"),
            intro: t("Vi håller avgifterna låga, så att ingen ska behöva avstå. Hör av dig om du behöver stöd."),
            categories: fees,
            note: t("Avgifterna är ett exempel. Medlemsavgiften ingår i terminsavgiften."),
          },
          {
            id: "m-faq", type: "faq", layout: "stacked",
            heading: t("Frågor om medlemskap"),
            items: [
              { question: t("Kan jag få hjälp med avgiften?"), answer: t("Ja, hör av dig så berättar vi om stöd och bidrag. Ingen ska behöva avstå av ekonomiska skäl.") },
              { question: t("Vad ingår i terminsavgiften?"), answer: t("Träning, ledare, licens, försäkring och användning av klubbens bollar och material.") },
              { question: t("Kan jag byta lag under säsongen?"), answer: t("Ja, om det finns plats. Prata med ledaren i laget så löser vi det tillsammans.") },
            ],
          },
          {
            id: "m-cta", type: "cta", layout: "centered",
            heading: t("Redo att bli en i laget?"),
            body: t("Skriv till oss, så hör vi av oss inom ett dygn."),
            ctaLabel: t("Anmäl dig"), ctaLink: "/kontakt",
          },
        ],
      },
      {
        path: "/om-oss",
        label: t("Om oss"),
        seoTitle: t("Om oss — Lindvallens FK"),
        seoDescription: t("Om oss — Lindvallens FK, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "o-hero", type: "hero", layout: "beam",
            eyebrow: t("VÅR HISTORIA"),
            headline: t("Från två mål till fjorton lag"),
            body: t("Lindvallens FK startade 1968 med en grusplan och en handfull föräldrar. I dag spelar över trehundra barn och unga hos oss."),
            ctaLabel: t("Se våra lag"), ctaLink: "/lag", imageUrl: img("trana"),
          },
          {
            id: "o-story", type: "about", layout: "image-right",
            heading: t("Så började det"),
            body: t("Allt började med en grusplan vid Lindvallen och några föräldrar som ville att barnen skulle ha någonstans att spela. Nu, mer än femtio år senare, finns både en konstgräsplan och en egen klubbstuga.") + "\n\n" +
              t("Vi drivs av ideella krafter. Föräldrar, ungdomsledare och gamla spelare delar på ansvaret, och alla är välkomna att bidra på det sätt de kan.") + "\n\n" +
              t("Vi tror att fotboll är bäst när alla får vara med. Därför har vi få regler: kom i tid, hjälp varandra och ha roligt."),
            imageUrl: img("skott"),
          },
          {
            id: "o-values", type: "grid", layout: "numbered",
            eyebrow: t("SÅ ARBETAR VI"),
            heading: t("Det här står vi för"),
            items: [
              { title: t("Glädje först"), body: t("Fotboll ska vara kul. Resultaten kommer av sig själva när alla trivs.") },
              { title: t("Alla får vara med"), body: t("Vi delar upp lagen så att alla får spela och utvecklas i sin egen takt.") },
              { title: t("Ansvar och respekt"), body: t("Vi respekterar varandra, domarna och motståndarna, både på planen och vid sidan om.") },
              { title: t("Ideellt engagemang"), body: t("Klubben drivs av föräldrar och ledare som lägger sin tid för att barnen ska få en bra fritid.") },
            ],
          },
          {
            id: "o-numbers", type: "about", layout: "stats-split",
            heading: t("Klubben i siffror"),
            body: t("Vi är en liten förening med stort engagemang. Så här ser en vanlig säsong ut hos oss."),
            collageImageUrls: [img("ring"), img("koner")],
            stats: [
              { value: "1968", label: t("Grundades") },
              { value: "14", label: t("Lag") },
              { value: "320", label: t("Medlemmar") },
              { value: "35", label: t("Ledare") },
            ],
          },
          {
            id: "o-practice", type: "grid", layout: "intro-divided",
            eyebrow: t("EN TRÄNING HOS OSS"),
            heading: t("Så ser en träning ut"),
            items: [
              { title: t("Samling och uppvärmning"), body: t("Vi samlas, hälsar och värmer upp med bollen. Alla vet vad som ska hända."), imageUrl: img("lag") },
              { title: t("Övningar i smågrupper"), body: t("Teknik, passningar och skott i små grupper så att alla får röra bollen ofta."), imageUrl: img("ben") },
              { title: t("Spel och avslutning"), body: t("Vi avslutar med spel, ibland med blandade lag, och pratar ihop oss efteråt."), imageUrl: img("tranare") },
            ],
          },
          {
            id: "o-cta", type: "cta", layout: "image-bleed", imageUrl: img("trana"),
            heading: t("Välkommen att vara med"),
            body: t("Kom och prova en träning eller hör av dig om du vill bli ledare."),
            ctaLabel: t("Bli medlem"), ctaLink: "/bli-medlem",
          },
        ],
      },
      {
        path: "/kontakt",
        label: t("Kontakt"),
        seoTitle: t("Kontakt — Lindvallens FK"),
        seoDescription: t("Kontakt och anmälan — Lindvallens FK, exempel byggt med YourCoSite."),
        sections: [
          {
            id: "k-hero", type: "hero", layout: "fade-bottom",
            eyebrow: t("VI SVARAR INOM ETT DYGN"),
            headline: t("Hör av dig till klubben"),
            body: t("Frågor om lag, träningar eller medlemskap? Skriv till oss, så hjälper vi dig vidare."),
            imageUrl: img("hall"),
          },
          {
            id: "k-form", type: "contactForm", layout: "split-map", address,
            heading: t("Skicka ett meddelande"),
            body: t("Berätta barnets ålder och om ni vill prova eller anmäla er, så hör vi av oss."),
            submitLabel: t("Skicka meddelande"),
          },
          {
            id: "k-info", type: "contact", layout: "split-info",
            heading: t("Adress och kontakt"),
            body: t("Vi tränar på Lindvallens IP. Kansliet har öppet tisdagar mellan 17 och 19."),
            email: "hej@lindvallensfk.se", phone: "0141 – 123 45", address,
          },
          {
            id: "k-faq", type: "faq", layout: "two-column",
            heading: t("Vanliga frågor"),
            items: [
              { question: t("Hur kontaktar jag ett lag?"), answer: t("Skriv till oss via formuläret så skickar vi vidare till rätt ledare. Svar får du oftast inom ett dygn.") },
              { question: t("Hur blir jag ledare?"), answer: t("Hör av dig och berätta lite om dig själv. Du behöver ingen fotbollserfarenhet, bara lust att lära och ha roligt.") },
              { question: t("Kan vi hyra planen?"), answer: t("Ja, konstgräsplanen kan hyras när den inte används av lagen. Skriv till oss med önskad tid.") },
            ],
          },
        ],
      },
    ],
  };
}
