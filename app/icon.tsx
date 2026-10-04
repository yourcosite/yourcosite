import { ImageResponse } from "next/og";

// Genererad favicon — samma pratbubbla med tre prickar som i Logo.tsx,
// bara den (ingen ordmärke) eftersom en flik-ikon är för liten för text.
// Next.js kopplar automatiskt in den här som favicon/app-ikon utan att
// behöva en statisk .ico-fil (App Router-konventionen "app/icon.tsx").
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17171A",
          borderRadius: 7,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 32 32">
          <rect x="2" y="4" width="28" height="18" rx="7" fill="#C6FF5E" />
          <path d="M10 22 L10 29 L17 22 Z" fill="#C6FF5E" />
          <circle cx="11" cy="13" r="1.9" fill="#0C1004" />
          <circle cx="16" cy="13" r="1.9" fill="#0C1004" />
          <circle cx="21" cy="13" r="1.9" fill="#0C1004" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
