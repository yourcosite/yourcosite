import type { Metadata } from "next";
import "./globals.css";
// Typsnitt för sajt-skinsen (lib/skins.ts), självhostade via npm så de
// fungerar utan externa anrop. Webbläsaren hämtar bara de som faktiskt används.
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/syne/wght.css";
import "@fontsource-variable/playfair-display/wght.css";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "@fontsource/dm-serif-display/latin-400-italic.css";

export const metadata: Metadata = {
  // Behövs för att och:image/twitter:image (se app/opengraph-image.tsx) ska
  // kunna lösas till en fullständig URL när länkar delas i t.ex. Slack/sms.
  metadataBase: new URL("https://yourcosite.vercel.app"),
  title: {
    default: "YourCoSite — din hemsida, byggd genom ett samtal",
    template: "%s — YourCoSite",
  },
  description:
    "Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite bygga er hemsida. Sen fortsätter ni bara att be om ändringar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
