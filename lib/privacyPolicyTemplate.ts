// Enkel, FAST textmall för kundens integritetspolicy när de inte har en
// egen att ladda upp (onboarding steg 5). Medvetet INTE AI-skriven — det
// här är juridiskt grundinnehåll, och en språkmodell som friformulerar
// det kan hitta på fel eller otydligheter. Samma princip som
// YourCoSites egna juridikdokument: en standardmall baserad på GDPR,
// inte juridisk rådgivning, och kunden uppmanas att låta en jurist
// granska innan den används skarpt.
//
// Mallen finns per språk (sajtens språk) och innehåller även en
// "företagsuppgifter"-del med det landet kräver på en webbplats
// (Impressum i Tyskland, mentions légales i Frankrike, aviso legal i
// Spanien, företagsuppgifter i Norden). Språk utan egen mall får engelska.
//
// Texten returneras som "markdown-lite" — bara "## "-rubriker och
// tomrad-separerade stycken — eftersom det är allt PrivacyPolicyBlock i
// SitePreview.tsx kan rendera. Håll den formen om texten ändras.

export type PolicyInput = {
  companyName: string;
  orgNumber: string;
  address: string;
  email: string;
  lang?: string;
  country?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  legalForm?: string | null;
  register?: string | null;
  capital?: string | null;
  representative?: string | null;
};

// Tillsynsmyndighet per land (där kunden kan klaga).
const AUTHORITY: Record<string, Record<string, string>> = {
  // key d = fallback när landet saknas
  da: {"SE": "Integritetsskyddsmyndigheten (IMY)", "DK": "Datatilsynet", "FI": "Tietosuojavaltuutetun toimisto", "DE": "den for din delstat kompetente databeskyttelsesmyndighed", "FR": "CNIL", "ES": "Agencia Española de Protección de Datos (AEPD)", "d": "den nationale tilsynsmyndighed for databeskyttelse"},
  fi: {"SE": "Ruotsin tietosuojaviranomainen (IMY)", "DK": "Tanskan tietosuojaviranomainen (Datatilsynet)", "FI": "tietosuojavaltuutetun toimisto", "DE": "osavaltiosi toimivaltainen tietosuojaviranomainen", "FR": "Ranskan tietosuojaviranomainen (CNIL)", "ES": "Espanjan tietosuojaviranomainen (AEPD)", "d": "kansallinen tietosuojaviranomainen"},
  de: {"SE": "die schwedische Datenschutzbehörde (IMY)", "DK": "die dänische Datenschutzbehörde (Datatilsynet)", "FI": "das Büro des Datenschutzbeauftragten (Tietosuojavaltuutetun toimisto)", "DE": "die für dein Bundesland zuständige Datenschutzaufsichtsbehörde", "FR": "die französische Datenschutzbehörde (CNIL)", "ES": "die spanische Datenschutzbehörde (AEPD)", "d": "deine nationale Datenschutzaufsichtsbehörde"},
  fr: {"SE": "l’autorité suédoise de protection des données (IMY)", "DK": "l’autorité danoise de protection des données (Datatilsynet)", "FI": "le bureau du médiateur de la protection des données (Tietosuojavaltuutetun toimisto)", "DE": "l’autorité de protection des données compétente de votre Land", "FR": "la CNIL", "ES": "l’agence espagnole de protection des données (AEPD)", "d": "votre autorité nationale de protection des données"},
  es: {"SE": "la autoridad sueca de protección de datos (IMY)", "DK": "la autoridad danesa de protección de datos (Datatilsynet)", "FI": "la Oficina del Defensor de la Protección de Datos (Tietosuojavaltuutetun toimisto)", "DE": "la autoridad de protección de datos competente de tu estado federado", "FR": "la CNIL", "ES": "la Agencia Española de Protección de Datos (AEPD)", "d": "tu autoridad nacional de protección de datos"},
  sv: {"SE": "Integritetsskyddsmyndigheten (IMY)", "DK": "Datatilsynet", "FI": "Tietosuojavaltuutetun toimisto", "DE": "den för er delstat behöriga dataskyddsmyndigheten", "FR": "CNIL", "ES": "Agencia Española de Protección de Datos (AEPD)", "d": "den nationella tillsynsmyndigheten för dataskydd"},
  en: {"SE": "the Swedish Authority for Privacy Protection (IMY)", "DK": "the Danish Data Protection Agency (Datatilsynet)", "FI": "the Office of the Data Protection Ombudsman (Tietosuojavaltuutetun toimisto)", "DE": "the competent data protection authority of your federal state", "FR": "the CNIL", "ES": "the Spanish Data Protection Agency (AEPD)", "d": "your national data protection authority"},
};
const authorityFor = (lang: string, country?: string | null) => {
  const a = AUTH_BY(lang);
  return a[country ?? ""] ?? a.d;
};
function AUTH_BY(lang: string) { return AUTHORITY[lang] ?? AUTHORITY.en; }

type Labels = {
  h_company: string; h_de: string; h_fr: string; h_es: string;
  lab: string[]; h: string[];
  ctrl: string; collect: string; use: string; keep: string; rights: string; cookies: string;
};
const TEXTS: Record<string, Labels> = {
  sv: {
  "h_company": "Företagsuppgifter",
  "h_de": "Företagsuppgifter",
  "h_fr": "Företagsuppgifter",
  "h_es": "Företagsuppgifter",
  "lab": [
    "Företag",
    "Bolagsform",
    "Organisationsnummer",
    "Momsregistreringsnummer",
    "Adress",
    "E-post",
    "Telefon",
    "Företrädare",
    "Register",
    "Aktiekapital"
  ],
  "h": [
    "Personuppgiftsansvarig",
    "Vilka uppgifter vi samlar in",
    "Hur vi använder uppgifterna",
    "Lagringstid",
    "Dina rättigheter",
    "Cookies"
  ],
  "ctrl": "{company}, org.nr {org}, {address}, är personuppgiftsansvarig för de personuppgifter som samlas in via den här webbplatsen. Vid frågor, kontakta {email}.",
  "collect": "Vi samlar in de uppgifter du själv lämnar till oss, t.ex. namn, e-postadress och telefonnummer när du använder ett kontaktformulär eller bokar tid. Vi samlar också in viss teknisk besöksdata (t.ex. sidvisningar och ungefärlig plats) via cookies, men bara om du samtyckt till det — se vår cookiebanner.",
  "use": "Uppgifterna används för att svara på din förfrågan, hantera en bokning eller beställning, och för att vid samtycke förstå hur webbplatsen används. Vi säljer aldrig dina uppgifter till tredje part.",
  "keep": "Vi sparar uppgifterna så länge det behövs för att hantera ditt ärende, eller så länge lagen kräver (t.ex. bokföringslagstiftningen för eventuella underlag kopplade till köp).",
  "rights": "Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter, samt rätt till dataportabilitet och att invända mot viss behandling. Kontakta oss på {email}. Du har också rätt att klaga hos {authority}.",
  "cookies": "Vi använder cookies enligt kategorierna som visas i cookiebannern på webbplatsen. Nödvändiga cookies kan inte stängas av; övriga kräver ditt aktiva samtycke. Om webbplatsen visar flöden eller inlägg från Facebook eller Instagram laddas de först när du har godkänt alla cookies, och då gäller även Metas egna villkor och integritetspolicy."
},
  en: {
  "h_company": "Company information",
  "h_de": "Legal notice (Impressum)",
  "h_fr": "Legal notice (mentions légales)",
  "h_es": "Legal notice (aviso legal)",
  "lab": [
    "Company",
    "Legal form",
    "Company registration number",
    "VAT number",
    "Address",
    "Email",
    "Phone",
    "Represented by",
    "Commercial register",
    "Share capital"
  ],
  "h": [
    "Data controller",
    "What data we collect",
    "How we use the data",
    "Retention",
    "Your rights",
    "Cookies"
  ],
  "ctrl": "{company}, company registration number {org}, {address}, is the data controller for the personal data collected through this website. If you have any questions, contact {email}.",
  "collect": "We collect the data you give us yourself, for example your name, email address and phone number when you use a contact form or book an appointment. We also collect some technical visitor data (for example page views and approximate location) through cookies, but only if you have consented to it. See our cookie banner.",
  "use": "The data is used to answer your enquiry, handle a booking or an order and, with your consent, to understand how the website is used. We never sell your data to third parties.",
  "keep": "We keep the data for as long as it is needed to handle your case, or for as long as the law requires (for example accounting rules for records linked to a purchase).",
  "rights": "You have the right to request access to, rectification of or erasure of your personal data, as well as the right to data portability and to object to certain processing. Contact us at {email}. You also have the right to lodge a complaint with {authority}.",
  "cookies": "We use cookies according to the categories shown in the cookie banner on the website. Necessary cookies cannot be switched off; the others require your active consent. If the website shows feeds or posts from Facebook or Instagram, they are only loaded once you have accepted all cookies, and Meta's own terms and privacy policy then also apply."
},
  da: {
  "h_company": "Virksomhedsoplysninger",
  "h_de": "Virksomhedsoplysninger",
  "h_fr": "Virksomhedsoplysninger",
  "h_es": "Virksomhedsoplysninger",
  "lab": [
    "Virksomhed",
    "Selskabsform",
    "CVR-nummer",
    "Momsnummer",
    "Adresse",
    "E-mail",
    "Telefon",
    "Repræsentant",
    "Register",
    "Aktiekapital"
  ],
  "h": [
    "Dataansvarlig",
    "Hvilke oplysninger vi indsamler",
    "Sådan bruger vi oplysningerne",
    "Opbevaringstid",
    "Dine rettigheder",
    "Cookies"
  ],
  "ctrl": "{company}, CVR-nr. {org}, {address}, er dataansvarlig for de personoplysninger, der indsamles via dette websted. Kontakt {email} ved spørgsmål.",
  "collect": "Vi indsamler de oplysninger, du selv giver os, f.eks. navn, e-mailadresse og telefonnummer, når du bruger en kontaktformular eller booker en tid. Vi indsamler også visse tekniske besøgsdata (f.eks. sidevisninger og omtrentlig placering) via cookies, men kun hvis du har givet samtykke hertil — se vores cookiebanner.",
  "use": "Oplysningerne bruges til at besvare din henvendelse, håndtere en booking eller bestilling og, med dit samtykke, til at forstå, hvordan webstedet bruges. Vi sælger aldrig dine oplysninger til tredjepart.",
  "keep": "Vi opbevarer oplysningerne, så længe det er nødvendigt for at behandle din sag, eller så længe loven kræver det (f.eks. bogføringsreglerne for eventuelle bilag knyttet til et køb).",
  "rights": "Du har ret til at anmode om indsigt i, berigtigelse af eller sletning af dine personoplysninger samt ret til dataportabilitet og til at gøre indsigelse mod visse behandlinger. Kontakt os på {email}. Du har også ret til at klage til {authority}.",
  "cookies": "Vi bruger cookies i henhold til de kategorier, der vises i cookiebanneret på webstedet. Nødvendige cookies kan ikke slås fra; de øvrige kræver dit aktive samtykke. Hvis webstedet viser feeds eller opslag fra Facebook eller Instagram, indlæses de først, når du har accepteret alle cookies, og så gælder også Metas egne vilkår og privatlivspolitik."
},
  fi: {
  "h_company": "Yrityksen tiedot",
  "h_de": "Yrityksen tiedot",
  "h_fr": "Yrityksen tiedot",
  "h_es": "Yrityksen tiedot",
  "lab": [
    "Yritys",
    "Yhtiömuoto",
    "Y-tunnus",
    "Arvonlisäverotunnus",
    "Osoite",
    "Sähköposti",
    "Puhelin",
    "Edustaja",
    "Rekisteri",
    "Osakepääoma"
  ],
  "h": [
    "Rekisterinpitäjä",
    "Mitä tietoja keräämme",
    "Miten käytämme tietoja",
    "Säilytysaika",
    "Oikeutesi",
    "Evästeet"
  ],
  "ctrl": "{company}, Y-tunnus {org}, {address}, on tämän verkkosivuston kautta kerättävien henkilötietojen rekisterinpitäjä. Ota kysymyksissä yhteyttä osoitteeseen {email}.",
  "collect": "Keräämme tiedot, jotka annat meille itse, esimerkiksi nimen, sähköpostiosoitteen ja puhelinnumeron, kun käytät yhteydenottolomaketta tai varaat ajan. Keräämme myös joitakin teknisiä kävijätietoja (esim. sivunäytöt ja likimääräinen sijainti) evästeiden avulla, mutta vain jos olet antanut siihen suostumuksen — katso evästebanneri.",
  "use": "Tietoja käytetään vastaamaan tiedusteluusi, käsittelemään varausta tai tilausta ja suostumuksellasi ymmärtämään, miten verkkosivustoa käytetään. Emme koskaan myy tietojasi kolmansille osapuolille.",
  "keep": "Säilytämme tiedot niin kauan kuin on tarpeen asiasi käsittelemiseksi tai niin kauan kuin laki edellyttää (esim. kirjanpitosäännökset ostoihin liittyvälle aineistolle).",
  "rights": "Sinulla on oikeus pyytää pääsyä henkilötietoihisi, niiden oikaisemista tai poistamista sekä oikeus tietojen siirtämiseen ja oikeus vastustaa tiettyä käsittelyä. Ota yhteyttä osoitteeseen {email}. Sinulla on myös oikeus tehdä valitus taholle {authority}.",
  "cookies": "Käytämme evästeitä verkkosivuston evästebannerissa esitettyjen luokkien mukaisesti. Välttämättömiä evästeitä ei voi poistaa käytöstä; muut vaativat aktiivisen suostumuksesi. Jos verkkosivusto näyttää Facebookin tai Instagramin syötteitä tai julkaisuja, ne ladataan vasta, kun olet hyväksynyt kaikki evästeet, ja silloin sovelletaan myös Metan omia ehtoja ja tietosuojakäytäntöä."
},
  de: {
  "h_company": "Anbieterangaben",
  "h_de": "Impressum",
  "h_fr": "Impressum",
  "h_es": "Impressum",
  "lab": [
    "Unternehmen",
    "Rechtsform",
    "Handelsregisternummer / Registrierungsnummer",
    "USt-IdNr.",
    "Anschrift",
    "E-Mail",
    "Telefon",
    "Vertreten durch",
    "Handelsregister",
    "Stammkapital"
  ],
  "h": [
    "Verantwortlicher",
    "Welche Daten wir erheben",
    "Wie wir die Daten verwenden",
    "Speicherdauer",
    "Deine Rechte",
    "Cookies"
  ],
  "ctrl": "{company}, Registernummer {org}, {address}, ist Verantwortlicher für die über diese Website erhobenen personenbezogenen Daten. Bei Fragen wende dich an {email}.",
  "collect": "Wir erheben die Daten, die du uns selbst mitteilst, zum Beispiel deinen Namen, deine E-Mail-Adresse und deine Telefonnummer, wenn du ein Kontaktformular nutzt oder einen Termin buchst. Außerdem erheben wir über Cookies einige technische Besucherdaten (z. B. Seitenaufrufe und ungefährer Standort), jedoch nur, wenn du eingewilligt hast — siehe unser Cookie-Banner.",
  "use": "Die Daten werden verwendet, um deine Anfrage zu beantworten, eine Buchung oder Bestellung abzuwickeln und, mit deiner Einwilligung, um zu verstehen, wie die Website genutzt wird. Wir verkaufen deine Daten niemals an Dritte.",
  "keep": "Wir speichern die Daten so lange, wie es zur Bearbeitung deines Anliegens erforderlich ist oder wie es das Gesetz verlangt (z. B. Buchführungsvorschriften für Belege im Zusammenhang mit einem Kauf).",
  "rights": "Du hast das Recht, Auskunft über deine personenbezogenen Daten sowie deren Berichtigung oder Löschung zu verlangen, außerdem das Recht auf Datenübertragbarkeit und das Recht, bestimmten Verarbeitungen zu widersprechen. Kontaktiere uns unter {email}. Du hast außerdem das Recht, dich bei {authority} zu beschweren.",
  "cookies": "Wir verwenden Cookies gemäß den Kategorien, die im Cookie-Banner der Website angezeigt werden. Notwendige Cookies können nicht abgeschaltet werden; die übrigen erfordern deine aktive Einwilligung. Zeigt die Website Feeds oder Beiträge von Facebook oder Instagram, werden diese erst geladen, nachdem du alle Cookies akzeptiert hast; dann gelten auch die eigenen Bedingungen und die Datenschutzerklärung von Meta."
},
  fr: {
  "h_company": "Informations sur l’entreprise",
  "h_de": "Mentions légales",
  "h_fr": "Mentions légales",
  "h_es": "Mentions légales",
  "lab": [
    "Entreprise",
    "Forme juridique",
    "SIREN / numéro d’immatriculation",
    "N° de TVA intracommunautaire",
    "Adresse",
    "E-mail",
    "Téléphone",
    "Représentée par",
    "Registre du commerce et des sociétés (RCS)",
    "Capital social"
  ],
  "h": [
    "Responsable du traitement",
    "Les données que nous collectons",
    "Comment nous utilisons les données",
    "Durée de conservation",
    "Vos droits",
    "Cookies"
  ],
  "ctrl": "{company}, numéro d’immatriculation {org}, {address}, est le responsable du traitement des données personnelles collectées via ce site web. Pour toute question, contactez {email}.",
  "collect": "Nous collectons les données que vous nous communiquez vous-même, par exemple votre nom, votre adresse e-mail et votre numéro de téléphone lorsque vous utilisez un formulaire de contact ou prenez rendez-vous. Nous collectons aussi certaines données techniques de visite (par exemple pages vues et localisation approximative) via des cookies, mais uniquement si vous y avez consenti — voir notre bannière de cookies.",
  "use": "Les données servent à répondre à votre demande, à gérer une réservation ou une commande et, avec votre consentement, à comprendre comment le site est utilisé. Nous ne vendons jamais vos données à des tiers.",
  "keep": "Nous conservons les données aussi longtemps que nécessaire pour traiter votre demande, ou aussi longtemps que la loi l’exige (par exemple les règles comptables pour les pièces liées à un achat).",
  "rights": "Vous avez le droit de demander l’accès à vos données personnelles, leur rectification ou leur effacement, ainsi que le droit à la portabilité des données et le droit de vous opposer à certains traitements. Contactez-nous à l’adresse {email}. Vous avez également le droit d’introduire une réclamation auprès de {authority}.",
  "cookies": "Nous utilisons des cookies selon les catégories affichées dans la bannière de cookies du site. Les cookies nécessaires ne peuvent pas être désactivés ; les autres exigent votre consentement actif. Si le site affiche des flux ou des publications de Facebook ou d’Instagram, ils ne sont chargés qu’une fois que vous avez accepté tous les cookies, et les conditions et la politique de confidentialité de Meta s’appliquent alors également."
},
  es: {
  "h_company": "Datos de la empresa",
  "h_de": "Aviso legal",
  "h_fr": "Aviso legal",
  "h_es": "Aviso legal",
  "lab": [
    "Empresa",
    "Forma jurídica",
    "NIF / número de registro",
    "N.º de IVA",
    "Domicilio",
    "Correo electrónico",
    "Teléfono",
    "Representante",
    "Registro Mercantil",
    "Capital social"
  ],
  "h": [
    "Responsable del tratamiento",
    "Qué datos recopilamos",
    "Cómo usamos los datos",
    "Plazo de conservación",
    "Tus derechos",
    "Cookies"
  ],
  "ctrl": "{company}, con número de registro {org}, {address}, es la responsable del tratamiento de los datos personales recopilados a través de este sitio web. Si tienes preguntas, contacta con {email}.",
  "collect": "Recopilamos los datos que nos facilitas tú mismo, por ejemplo tu nombre, tu correo electrónico y tu teléfono cuando usas un formulario de contacto o reservas una cita. También recopilamos algunos datos técnicos de visita (por ejemplo, páginas vistas y ubicación aproximada) mediante cookies, pero solo si has dado tu consentimiento; consulta nuestro banner de cookies.",
  "use": "Los datos se utilizan para responder a tu consulta, gestionar una reserva o un pedido y, con tu consentimiento, para entender cómo se usa el sitio web. Nunca vendemos tus datos a terceros.",
  "keep": "Conservamos los datos el tiempo necesario para gestionar tu caso, o el que exija la ley (por ejemplo, la normativa contable para los documentos vinculados a una compra).",
  "rights": "Tienes derecho a solicitar el acceso a tus datos personales, su rectificación o supresión, así como el derecho a la portabilidad de los datos y a oponerte a determinados tratamientos. Contacta con nosotros en {email}. También tienes derecho a presentar una reclamación ante {authority}.",
  "cookies": "Utilizamos cookies según las categorías que se muestran en el banner de cookies del sitio web. Las cookies necesarias no se pueden desactivar; las demás requieren tu consentimiento activo. Si el sitio web muestra feeds o publicaciones de Facebook o Instagram, solo se cargan después de que hayas aceptado todas las cookies, y entonces también se aplican las condiciones y la política de privacidad de Meta."
},
};

function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function lines(labels: string[], rows: (string | null | undefined)[]) {
  return rows
    .map((v, i) => (v && String(v).trim() ? `${labels[i]}: ${String(v).trim()}` : ""))
    .filter(Boolean)
    .join("\n\n");
}

export function generatePrivacyPolicyText(p: PolicyInput): string {
  const lang = p.lang && TEXTS[p.lang] ? p.lang : "en";
  const T = TEXTS[lang];
  const heading = p.country === "DE" ? T.h_de : p.country === "FR" ? T.h_fr : p.country === "ES" ? T.h_es : T.h_company;
  const vars = {
    company: p.companyName,
    org: p.orgNumber,
    address: p.address,
    email: p.email,
    authority: authorityFor(lang, p.country),
  };
  const facts = lines(T.lab, [p.companyName, p.legalForm, p.orgNumber, p.vatNumber, p.address, p.email, p.phone, p.representative, p.register, p.capital]);
  return [
    `## ${heading}\n\n${facts}`,
    `## ${T.h[0]}\n\n${fill(T.ctrl, vars)}`,
    `## ${T.h[1]}\n\n${T.collect}`,
    `## ${T.h[2]}\n\n${T.use}`,
    `## ${T.h[3]}\n\n${T.keep}`,
    `## ${T.h[4]}\n\n${fill(T.rights, vars)}`,
    `## ${T.h[5]}\n\n${T.cookies}`,
  ].join("\n\n");
}
