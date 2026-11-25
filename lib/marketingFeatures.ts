import { msg } from "@/lib/i18n/config";

// Funktionerna som visas på startsidan och funktionssidan (samma texter, så de
// översätts en gång). Lägg bara till sådant som redigeraren faktiskt klarar.
// LÖPANDE: varje ny kundvänd funktion ska in här (och i homeFeatureIcons om den
// är bland de viktigaste), och demon (/demo) ska klara den. Se CLAUDE.md.
export const features = [
  { icon: "globe", title: msg("Sajten på flera språk"), body: msg("Översätt hela sajten till upp till tre språk till med ett klick, och växla mellan dem med flaggorna.") },
  { icon: "pointer", title: msg("Markera och be"), body: msg("Klicka på en text, bild eller knapp så får du förslag som passar just den. Skriv sen vad du vill ändra.") },
  { icon: "undo", title: msg("Ångra och Historik"), body: msg("Ångra senaste ändringen med ett klick, och bläddra i hela samtalet med Millie i Historik.") },
  { icon: "history", title: msg("Tidigare versioner"), body: msg("Innan varje ändring sparas en kopia av sajten. Gå tillbaka till hur den såg ut för en stund sedan.") },
  { icon: "pages", title: msg("Sidor på ett ställe"), body: msg("Lägg till, byt namn på, flytta och ta bort sidor direkt i redigeraren, utan att lämna samtalet.") },
  { icon: "news", title: msg("Nyheter"), body: msg("Skriv en artikel i en ruta som öppnas ovanpå sajten, med kategorier och förhandsvisning.") },
  { icon: "ball", title: msg("Spelschema och resultat"), body: msg("Lägg in matcher och resultat för hand, eller berätta för Millie. Besökarna ser kommande matcher och hur säsongen går.") },
  { icon: "bookings", title: msg("Bokningar"), body: msg("Ta emot bokningar av tider och paket, och hantera dem i redigeraren.") },
  { icon: "search", title: msg("Optimera för Google"), body: msg("Välj ett sökord så skriver Millie om texten så att Google hittar den, och frågar om hon undrar något.") },
  { icon: "bulb", title: msg("Förbättra"), body: msg("En checklista som visar vad som kan bli bättre på sajten. Fixa det med Millie med ett klick.") },
  { icon: "image", title: msg("Dina bilder"), body: msg("Ladda upp bilder en gång. Millie kan använda dem, byta ut dem och skriva bildtexter åt dig.") },
  { icon: "design", title: msg("Design på ett ställe"), body: msg("Byt färger, typsnitt, knappar och layout för hela sajten. Formulär och knappar följer med.") },
  { icon: "crop", title: msg("Beskär bilden där du vill"), body: msg("Välj vilken del av en bild som ska synas, just på den ytan, och se förhandsvisningen innan du sparar. Samma bild kan beskäras olika på olika ställen."), },
  { icon: "trash", title: msg("Ta bort med ett klick"), body: msg("Markera en text, knapp, ruta, bild eller hel sektion och tryck Ta bort. Går att ångra direkt."), },
  { icon: "layout", title: msg("Mallar för bilder och sektioner"), body: msg("Byt layout med ett klick: stående eller liggande bilder, med eller utan text, och bildtexter. Passar innehållet inte föreslår systemet en bättre mall."), },
  { icon: "bookings", title: msg("Bokning med påminnelser"), body: msg("Kunderna får påminnelse innan tiden, kan boka om själva och du sätter sista avbokningstid. Mejlen går ut i ditt namn och i din sajts stil."), },
  { icon: "wand", title: msg("Millie säger som det är"), body: msg("Kan hon inte göra något säger hon det rakt, och du kan skicka önskemålet till oss.") },
];

// De sex som visas på startsidan (byt ut de som blivit mindre nya).
export const homeFeatureIcons = ["globe", "pointer", "crop", "layout", "search", "bookings"];
