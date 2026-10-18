import type { Metadata } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { I18nProvider } from "@/components/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
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
};

export function generateMetadata(): Metadata {
  const m = META[getLocale()] || META.sv;
  return {
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
        </I18nProvider>
      </body>
    </html>
  );
}
