// "Nytt"-rutan i redigeraren (components/WhatsNewModal.tsx). Lägg ALLTID nya
// poster ÖVERST — den översta postens id avgör om knappen visar en prick för
// den som inte sett den. Skriv för kunden: kort, utan tekniska ord. "try" är
// ett exempel som fylls i meddelanderutan när kunden klickar på "Prova".
import { msg } from "@/lib/i18n/config";

export type WhatsNewEntry = {
  id: string;
  date: string; // ÅÅÅÅ-MM-DD
  icon: string;
  title: string;
  text: string;
  try?: string;
};

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-10-20-bokningsvillkor",
    date: "2026-10-20",
    icon: "📜",
    title: msg("Egna villkor i bokningen"),
    text: msg("Under Bokningar och Inställningar kan du lägga in egna villkor, till exempel avbokningsvillkor. Millie kan skriva ett utkast åt dig. Du läser igenom och kryssar i att du själv ansvarar för texten. Besökarna ser villkoren och måste godkänna dem innan de bokar, och villkoren följer med bekräftelsemejlet."),
  },
  {
    id: "2026-10-20-nyheter-tider",
    date: "2026-10-20",
    icon: "⏰",
    title: msg("Schemalägg och avpublicera nyheter"),
    text: msg("Du kan nu bestämma när en nyhet ska publiceras och när den ska tas ner av sig själv, till exempel när en kampanj tar slut. Det gör du under Nyheter, eller genom att be Millie. Hon frågar också när du skapar en nyhet, och kan ändra publiceringen på en nyhet som redan finns."),
    try: msg("Skriv en nyhet om vår kampanj, publicera den 1 november kl 08 och ta ner den 30 november"),
  },
  {
    id: "2026-10-18-menyer-med-knapp",
    date: "2026-10-18",
    icon: "🔘",
    title: msg("Meny med en tydlig knapp"),
    text: msg("Fem nya menyer där en knapp som Bokning står ut: klassisk, meny i mitten, centrerad logga, flytande pillermeny och en minimal. Knappen går automatiskt till din bokningssida (annars kontaktsidan), och du kan byta text eller sida. Fråga Millie om menyn så visar hon förslagen."),
    try: msg("Kan vi ändra menyn?"),
  },
  {
    id: "2026-10-18-bokning-manuell",
    date: "2026-10-18",
    icon: "✍️",
    title: msg("Lägg in bokningar själv och pausa mellan tider"),
    text: msg("Under Bokningar kan du lägga in en bokning manuellt, till exempel när en kund ringt. Du kan också ange tid till nästa bokning per paket, så en behandling på 25 minuter med 5 minuters paus ger nästa tid 30 minuter senare, medan kunden bara ser 25 minuter. Besökare måste nu fylla i namn, e-post och telefon när de bokar."),
  },
  {
    id: "2026-10-18-sju-sprak",
    date: "2026-10-18",
    icon: "🌍",
    title: msg("Verktyget på sju språk"),
    text: msg("Verktyget finns nu på svenska, engelska, danska, finska, tyska, franska och spanska. Byt språk under Inställningar, fliken Språk, eller med språkväljaren i menyn."),
  },
  {
    id: "2026-10-18-bokningsmallar",
    date: "2026-10-18",
    icon: "🖼️",
    title: msg("Bokningen i flera utseenden"),
    text: msg("Bokningen finns nu med bild bredvid, bild i bakgrunden eller som en kompakt ruta, och som färdiga bokningssidor: Klassisk, Bildstark och Lugn. Millie frågar vilket du vill ha och använder dina egna foton. Nya sidor och sektioner Millie lägger till får nu också bilder från dina foton i stället för tomma platser."),
    try: msg("Skapa en bokningssida"),
  },
  {
    id: "2026-10-18-bokning",
    date: "2026-10-18",
    icon: "📅",
    title: msg("Låt besökarna boka tid hos dig"),
    text: msg("Nu finns ett bokningssystem. Under Bokningar lägger du upp paket med längd och pris, ställer in dina tider och ser alla bokningar. Besökaren väljer tjänst, dag och tid på din sajt och får en bekräftelse på mejl, och du får ett mejl direkt. Bokade tider blockeras automatiskt. Be Millie lägga till en bokning på en sida så visas den."),
    try: msg("Lägg till en bokning på sidan Kontakt"),
  },
  {
    id: "2026-10-13-dra-och-slapp",
    date: "2026-10-13",
    icon: "✋",
    title: msg("Dra och släpp sidorna"),
    text: msg("Under Sidor kan du nu ta tag i en sida och dra den dit du vill ha den i menyn. Håller du den över en annan sida öppnas en plats under den. Släpper du där blir den en undersida. Pilarna och knappen Flytta finns kvar, bra på mobilen."),
  },
  {
    id: "2026-10-13-flytta-till-undersida",
    date: "2026-10-13",
    icon: "🗂️",
    title: msg("Gör en befintlig sida till undersida"),
    text: msg("Under Sidor finns nu en knapp Flytta vid varje sida. Med den gör du sidan till undersida under en annan sida, eller tar ut den till huvudmenyn igen. Knappar som leder till sidan uppdateras automatiskt. Menyn visar också alla dina sidor nu, även om du har många."),
  },
  {
    id: "2026-10-12-flytta-sidor",
    date: "2026-10-12",
    icon: "↕️",
    title: msg("Byt plats på sidorna i menyn"),
    text: msg("Under Sidor finns nu pilar ↑ och ↓ vid varje sida. Med dem flyttar du sidan i menyn. Undersidor flyttas inom sin huvudsida. Startsidan ligger alltid först. Du kan också be Millie att flytta en sida."),
  },
  {
    id: "2026-10-12-lanka-dokument",
    date: "2026-10-12",
    icon: "📄",
    title: msg("Länka till dokument"),
    text: msg("Du kan nu ladda upp en PDF, ett Word-dokument eller en Excel-fil och låta en knapp eller Läs mer-rad leda till den. Klicka på knappen, välj 🔗 Länk och sedan Dokument. Besökaren kan öppna eller ladda ner filen."),
  },
  {
    id: "2026-10-12-dela-forhandsvisning",
    date: "2026-10-12",
    icon: "📤",
    title: "Dela förhandsvisningen",
    text: "Under förhandsvisningen finns knappen Dela förhandsvisning. Du får en länk som du kan skicka till kollegor och kunder. De kan titta på sajten utan att logga in, men inte ändra något. Länken gäller i 14 dagar, och du kan stänga av den när du vill. Du väljer också om en knapp ska öppnas i samma eller ett nytt fönster, och kan prova den med Testa länken.",
  },
  {
    id: "2026-10-12-byt-lank",
    date: "2026-10-12",
    icon: "🔗",
    title: "Byt länk och text på knappar",
    text: "Klicka på en knapp eller en Läs mer-rad i förhandsvisningen. Då dyker två små knappar upp: ✎ Text för att byta vad det står, och 🔗 Länk för att välja en av dina sidor eller skriva en egen webbadress.",
  },
  {
    id: "2026-10-12-undersidor",
    date: "2026-10-12",
    icon: "🗂️",
    title: "Undersidor under en huvudsida",
    text: "Nu kan du ha en huvudsida, till exempel Produkter, med egna undersidor under, en per produkt. De visas som en rullgardin i menyn. Du lägger till dem när du bygger sajten, under Sidor eller genom att be Millie.",
    try: "Lägg till en undersida under Tjänster som heter Konsultation",
  },
  {
    id: "2026-10-12-skriv-sjalv",
    date: "2026-10-12",
    icon: "✏️",
    title: "Ändra texten själv",
    text: "Klicka på en text i förhandsvisningen så dyker en liten penna ✎ upp på den. Tryck på pennan och skriv in den nya texten direkt, utan Millie. Du kan ångra med knappen.",
  },
  {
    id: "2026-10-11-redigera-vid-uppladdning",
    date: "2026-10-11",
    icon: "✂️",
    title: "Redigera bilden innan du laddar upp den",
    text: "När du bifogar en bild visas knappen ✂️ Redigera bredvid filnamnet. Klicka på den för att beskära, vrida eller justera färgerna innan du skickar.",
  },
  {
    id: "2026-10-10-nyhetsforhandsvisning",
    date: "2026-10-10",
    icon: "👀",
    title: "Förhandsgranska nyheter direkt",
    text: "När Millie skrivit en nyhet öppnas den i ett eget fönster så du ser hur den ser ut. Därifrån kan du ändra rubrik och text själv, be Millie skriva om den, och sedan publicera direkt eller behålla den som utkast.",
    try: "Skriv en nyhet om att vi har nytt öppethållande",
  },
  {
    id: "2026-10-10-nyhetsvarning",
    date: "2026-10-10",
    icon: "📰",
    title: "Millie vaktar dina nyheter",
    text: "Skapar du en nyhet utan att sajten har någon nyhetslista, eller tas listan bort, säger Millie till och erbjuder att lägga till den med ett klick.",
  },
  {
    id: "2026-10-10-kontrollfragor",
    date: "2026-10-10",
    icon: "🤔",
    title: "Millie frågar när hon är osäker",
    text: "Är något oklart gissar hon inte längre. Hon ställer en kort fråga med några svar du kan klicka på.",
  },
  {
    id: "2026-10-10-bildredigerare",
    date: "2026-10-10",
    icon: "✂️",
    title: "Redigera bilder",
    text: "Klicka på en bild i förhandsvisningen och välj Redigera bild. Du kan beskära, zooma, vrida, spegla och justera ljus, kontrast och färg.",
  },
  {
    id: "2026-10-10-bild-bredvid-text",
    date: "2026-10-10",
    icon: "🖼️",
    title: "Bild bredvid texten",
    text: "Om oss-sektionen finns nu med en bild till vänster eller höger om texten.",
    try: "Lägg en bild bredvid texten i Om oss",
  },
  {
    id: "2026-10-10-prata",
    date: "2026-10-10",
    icon: "🎤",
    title: "Prata med Millie",
    text: "Tryck på mikrofonen vid skrivrutan och säg vad du vill ändra på svenska. Finns i Chrome, Edge och Safari.",
  },
  {
    id: "2026-10-10-avstand-justering",
    date: "2026-10-10",
    icon: "↔️",
    title: "Avstånd och textjustering per sektion",
    text: "Gör en enskild sektion tätare eller luftigare, och vänster-, mitt- eller högerställ texten. Rutor som blir färre centreras av sig själva.",
    try: "Gör den här sektionen tajtare",
  },
  {
    id: "2026-10-07-historik",
    date: "2026-10-07",
    icon: "💬",
    title: "Millie minns din chatt",
    text: "Dina senaste ändringar finns kvar när du öppnar redigeraren igen, även på en annan enhet. Ångra-knappen tar tillbaka senaste ändringen.",
  },
  {
    id: "2026-10-06-utseende",
    date: "2026-10-06",
    icon: "🎨",
    title: "Nya reglage för utseendet",
    text: "Byt färg- och typografipaket, gör rubrikerna större, ändra knappform, menyns placering, flytta sektioner och sidor, eller be om bättre Google-text.",
    try: "Gör rubrikerna större",
  },
];
