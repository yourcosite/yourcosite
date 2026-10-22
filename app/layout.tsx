import type { Metadata } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import ErrorReporter from "@/components/ErrorReporter";
import { I18nProvider } from "@/components/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import { headers } from "next/headers";
import { LOCALES, localizedPath } from "@/lib/i18n/config";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
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

const META: Record<string, { title: string; description: string }> = {
  sv: {
    title: "YourCoSite — din hemsida, byggd genom ett samtal",
    description:
      "Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite bygga er hemsida. Sen fortsätter ni bara att be om ändringar.",
  },
  en: {
    title: "YourCoSite — your website, built through a conversation",
    description:
      "Describe your business, show us what you like, and let YourCoSite build your website. Then just keep asking for changes.",
  },
  da: {
    title: "YourCoSite — din hjemmeside, bygget gennem en samtale",
    description:
      "Beskriv virksomheden, vis os, hvad I kan lide, og lad YourCoSite bygge jeres hjemmeside. Derefter fortsætter I bare med at bede om ændringer.",
  },
  fi: {
    title: "YourCoSite — kotisivusi, rakennettu keskustelun avulla",
    description:
      "Kuvaile yritystänne, näytä meille, mistä pidätte, ja anna YourCoSiten rakentaa kotisivunne. Sen jälkeen pyydätte vain muutoksia.",
  },
  de: {
    title: "YourCoSite — deine Website, gebaut durch ein Gespräch",
    description:
      "Beschreibt euer Unternehmen, zeigt uns, was euch gefällt, und lasst YourCoSite eure Website bauen. Danach bittet ihr einfach um Änderungen.",
  },
  fr: {
    title: "YourCoSite — votre site web, créé grâce à une conversation",
    description:
      "Décrivez votre activité, montrez-nous ce que vous aimez, et laissez YourCoSite créer votre site web. Ensuite, vous n’avez plus qu’à demander des modifications.",
  },
  es: {
    title: "YourCoSite — tu web, creada mediante una conversación",
    description:
      "Describid vuestro negocio, mostradnos lo que os gusta y dejad que YourCoSite cree vuestra web. Después solo tenéis que pedir cambios.",
  },
};

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const m = META[locale] || META.sv;
  // Publika sidor: adress per språk så att sökmotorerna hittar rätt version.
  let alternates: Metadata["alternates"];
  try {
    const route = headers().get("x-ycs-route");
    if (route) {
      const languages: Record<string, string> = {};
      for (const l of LOCALES) languages[l] = localizedPath(route, l);
      languages["x-default"] = localizedPath(route, "sv");
      alternates = { canonical: localizedPath(route, locale), languages };
    }
  } catch {}
  return {
    alternates,
    metadataBase: new URL("https://yourcosite.vercel.app"),
    title: { default: m.title, template: "%s — YourCoSite" },
    description: m.description,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  return (
    <html lang={locale}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <I18nProvider locale={locale} dict={DICTIONARIES[locale]}>
          {children}
          <ImpersonationBanner />
          <ErrorReporter />
        </I18nProvider>
      </body>
    </html>
  );
}
