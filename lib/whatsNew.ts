// "Nytt"-rutan i redigeraren (components/WhatsNewModal.tsx). Lägg ALLTID nya
// poster ÖVERST — den översta postens id avgör om knappen visar en prick för
// den som inte sett den. Skriv för kunden: kort, utan tekniska ord. "try" är
// ett exempel som fylls i meddelanderutan när kunden klickar på "Prova".
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
    id: "2026-10-12-byt-lank",
    date: "2026-10-12",
    icon: "🔗",
    title: "Byt länk på knappar",
    text: "Tryck på den lilla pennan vid en knapp eller en Läs mer-rad i förhandsvisningen och välj 🔗 Länk. Där väljer du en av dina sidor eller skriver en egen webbadress.",
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
