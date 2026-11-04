import { msg } from "@/lib/i18n/config";

// Funktionerna som visas på startsidan och funktionssidan (samma texter, så de
// översätts en gång). Lägg bara till sådant som redigeraren faktiskt klarar.
export const features = [
  { icon: "globe", title: msg("Sajten på flera språk"), body: msg("Översätt hela sajten till upp till tre språk till med ett klick, och växla mellan dem med flaggorna.") },
  { icon: "pointer", title: msg("Markera och be"), body: msg("Klicka på en text, bild eller knapp så får du förslag som passar just den. Skriv sen vad du vill ändra.") },
  { icon: "undo", title: msg("Ångra och Historik"), body: msg("Ångra senaste ändringen med ett klick, och bläddra i hela samtalet med Millie i Historik.") },
  { icon: "history", title: msg("Tidigare versioner"), body: msg("Innan varje ändring sparas en kopia av sajten. Gå tillbaka till hur den såg ut för en stund sedan.") },
  { icon: "pages", title: msg("Sidor på ett ställe"), body: msg("Lägg till, byt namn på, flytta och ta bort sidor direkt i redigeraren, utan att lämna samtalet.") },
  { icon: "news", title: msg("Nyheter"), body: msg("Skriv en artikel i en ruta som öppnas ovanpå sajten, med kategorier och förhandsvisning.") },
  { icon: "bookings", title: msg("Bokningar"), body: msg("Ta emot bokningar av tider och paket, och hantera dem i redigeraren.") },
  { icon: "search", title: msg("Optimera för Google"), body: msg("Välj ett sökord så skriver Millie om texten så att Google hittar den, och frågar om hon undrar något.") },
  { icon: "bulb", title: msg("Förbättra"), body: msg("En checklista som visar vad som kan bli bättre på sajten. Fixa det med Millie med ett klick.") },
  { icon: "image", title: msg("Dina bilder"), body: msg("Ladda upp bilder en gång. Millie kan använda dem, byta ut dem och skriva bildtexter åt dig.") },
  { icon: "design", title: msg("Design på ett ställe"), body: msg("Byt färger, typsnitt, knappar och layout för hela sajten. Formulär och knappar följer med.") },
  { icon: "wand", title: msg("Millie säger som det är"), body: msg("Kan hon inte göra något säger hon det rakt, och du kan skicka önskemålet till oss.") },
];

// De sex som visas på startsidan.
export const homeFeatureIcons = ["globe", "pointer", "history", "search", "news", "bookings"];
