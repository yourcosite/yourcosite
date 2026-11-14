import { ImageResponse } from "next/og";

// Delningsbild för länkar (sms, Messenger, Slack osv.), en per språk.
// Adressen sätts i app/layout.tsx som /api/og?lang=<språk>, så den som delar
// en sida på t.ex. /en/priser får en engelsk bild och en svensk adress en
// svensk. Samma mörka/lime-profil som loggan.
const size = { width: 1200, height: 630 };

const TEXTS: Record<string, { title: string; sub: string }> = {
  sv: { title: "Din hemsida, byggd genom ett samtal", sub: "Beskriv verksamheten, välj en stil — sen fortsätter du bara be om ändringar." },
  en: { title: "Your website, built through a conversation", sub: "Describe your business, pick a style — then just keep asking for changes." },
  da: { title: "Din hjemmeside, bygget gennem en samtale", sub: "Beskriv virksomheden, vælg en stil — og bliv så bare ved med at bede om ændringer." },
  fi: { title: "Kotisivusi, rakennettu keskustelun avulla", sub: "Kuvaile yritystäsi, valitse tyyli — ja pyydä sitten vain muutoksia." },
  de: { title: "Deine Website, gebaut durch ein Gespräch", sub: "Beschreibe dein Unternehmen, wähle einen Stil — und bitte danach einfach um Änderungen." },
  fr: { title: "Votre site web, créé grâce à une conversation", sub: "Décrivez votre activité, choisissez un style — puis demandez simplement des modifications." },
  es: { title: "Tu web, creada mediante una conversación", sub: "Describe tu negocio, elige un estilo — y después solo pide cambios." },
};

function render(lang: string) {
  const text = TEXTS[lang] || TEXTS.sv;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          backgroundColor: "#17171A",
          backgroundImage:
            "radial-gradient(circle at 14% 12%, rgba(198,255,94,0.22), transparent 55%), radial-gradient(circle at 86% 88%, rgba(198,255,94,0.14), transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 44 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect x="2" y="4" width="28" height="18" rx="7" fill="#C6FF5E" />
            <path d="M10 22 L10 29 L17 22 Z" fill="#C6FF5E" />
            <circle cx="11" cy="13" r="1.9" fill="#0C1004" />
            <circle cx="16" cy="13" r="1.9" fill="#0C1004" />
            <circle cx="21" cy="13" r="1.9" fill="#0C1004" />
          </svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#F5F4F1" }}>
            YourCoSite
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            lineHeight: 1.15,
            color: "#F5F4F1",
            maxWidth: 920,
            fontWeight: 500,
          }}
        >
          {text.title}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9E9C97", marginTop: 26, maxWidth: 760 }}>
          {text.sub}
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } }
  );
}

export function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") || "sv";
  return render(lang);
}
