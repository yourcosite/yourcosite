import { ImageResponse } from "next/og";

// Delningsbild för länkar (Slack, sms, iMessage-förhandsvisningar osv).
// Next.js plockar upp den här automatiskt (App Router-konventionen
// "app/opengraph-image.tsx") och sätter og:image/twitter:image på alla
// sidor som inte definierar en egen — samma mörka/lime-profil som loggan
// och resten av produkten, så en delad länk känns igen direkt.
//
// Texten här är på ENGELSKA med flit, även om resten av produkten (UI,
// onboarding, Millie) är på svenska — den här bilden är det som syns när
// NÅGON ANNAN än kunden ser länken (delad i en Slack-kanal, ett gruppchatt
// osv.), och om/när vi går mot fler länder är det den bredast begripliga
// varianten. Ändra tillbaka till svenska här om vi bestämmer motsatsen.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "YourCoSite — your website, built through a conversation";

export default function Image() {
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
          Your website, built through a conversation
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9E9C97", marginTop: 26, maxWidth: 760 }}>
          Describe your business, pick a style — then just keep asking for changes.
        </div>
      </div>
    ),
    { ...size }
  );
}
