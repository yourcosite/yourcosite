import type { Metadata } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import CookieConsent from "@/components/CookieConsent";
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
    title: "YourCoSite — Din hemsida, byggd genom ett samtal",
    description:
      "Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite bygga er hemsida. Sen fortsätter ni bara att be om ändringar.",
  },
  en: {
    title: "YourCoSite — Your website, built through a conversation",
    description:
      "Describe your business, show us what you like, and let YourCoSite build your website. Then just keep asking for changes.",
  },
  da: {
    title: "YourCoSite — Din hjemmeside, bygget gennem en samtale",
    description:
      "Beskriv virksomheden, vis os, hvad I kan lide, og lad YourCoSite bygge jeres hjemmeside. Derefter fortsætter I bare med at bede om ændringer.",
  },
  fi: {
    title: "YourCoSite — Kotisivusi, rakennettu keskustelun avulla",
    description:
      "Kuvaile yritystänne, näytä meille, mistä pidätte, ja anna YourCoSiten rakentaa kotisivunne. Sen jälkeen pyydätte vain muutoksia.",
  },
  de: {
    title: "YourCoSite — Deine Website, gebaut durch ein Gespräch",
    description:
      "Beschreibt euer Unternehmen, zeigt uns, was euch gefällt, und lasst YourCoSite eure Website bauen. Danach bittet ihr einfach um Änderungen.",
  },
  fr: {
    title: "YourCoSite — Votre site web, créé grâce à une conversation",
    description:
      "Décrivez votre activité, montrez-nous ce que vous aimez, et laissez YourCoSite créer votre site web. Ensuite, vous n’avez plus qu’à demander des modifications.",
  },
  es: {
    title: "YourCoSite — Tu web, creada mediante una conversación",
    description:
      "Describid vuestro negocio, mostradnos lo que os gusta y dejad que YourCoSite cree vuestra web. Después solo tenéis que pedir cambios.",
  },
};

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const m = META[locale] || META.sv;
  // Publika sidor: adress per språk så att sökmotorerna hittar rätt version.
  let alternates: Metadata["alternates"];
  let pageUrl = "/";
  const ogImage = `/api/og?lang=${locale}`;
  try {
    const route = headers().get("x-ycs-route");
    if (route) {
      pageUrl = localizedPath(route, locale);
      const languages: Record<string, string> = {};
      for (const l of LOCALES) languages[l] = localizedPath(route, l);
      languages["x-default"] = localizedPath(route, "sv");
      alternates = { canonical: localizedPath(route, locale), languages };
    }
  } catch {}
  return {
    alternates,
    metadataBase: new URL("https://www.yourcosite.com"),
    title: { default: m.title, template: "%s — YourCoSite" },
    description: m.description,
    // Utan egna og-taggar kan Messenger och andra hoppa över förhandsvisningen.
    // Delningsbilden finns per språk i app/api/og/route.tsx.
    openGraph: { type: "website", siteName: "YourCoSite", title: m.title, description: m.description, url: pageUrl, images: [{ url: ogImage, width: 1200, height: 630, alt: m.title }] },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: [ogImage] },
  };
}

// Google Tag Manager på våra egna publika sidor (startsida, priser m.fl.), inte
// i inloggade vyer eller på kundernas sajter. Consent Mode: ingen analys-
// cookie sätts förrän besökaren godkänt i CookieConsent. Meta Pixel följer samma
// val (fbq consent revoke/grant) och noscript-bilden används inte, eftersom den
// skulle skicka data utan samtycke.
const GTM_ID = "GTM-MDL9GDQB";
const META_PIXEL_ID = "774829522558659";
const GTM_SNIPPET = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
try{if(localStorage.getItem('ycs-consent')==='granted')gtag('consent','update',{analytics_storage:'granted'});}catch(e){}
dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=${GTM_ID}';document.head.appendChild(s);
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('consent','revoke');
try{if(localStorage.getItem('ycs-consent')==='granted')fbq('consent','grant');}catch(e){}
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  let publicPage = false;
  try { publicPage = !!headers().get("x-ycs-route"); } catch {}
  const m = META[locale] || META.sv;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "YourCoSite",
      legalName: "CS Kommunikationsbyrå AB",
      url: "https://www.yourcosite.com",
      logo: "https://www.yourcosite.com/icon",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "YourCoSite",
      url: "https://www.yourcosite.com",
      inLanguage: locale,
      description: m.description,
    },
  ];
  return (
    <html lang={locale}>
      <head>
        {publicPage && <script dangerouslySetInnerHTML={{ __html: GTM_SNIPPET }} />}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        {publicPage && (
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
          </noscript>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <I18nProvider locale={locale} dict={DICTIONARIES[locale]}>
          {children}
          <ImpersonationBanner />
          <ErrorReporter />
          {publicPage && <CookieConsent />}
        </I18nProvider>
      </body>
    </html>
  );
}
