/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js cachar annars en redan besökt sidas serverrenderade innehåll
    // i webbläsaren i 30s (även för dynamiska sidor) och återanvänder den
    // cachen vid klick-navigering — exakt det som gjorde att en nybyggd
    // sajts bilder på /webbplats bara syntes efter en hård omladdning.
    // Stänger av den cachen helt så varje sidnavigering alltid hämtar
    // sajtens senaste innehåll.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

// Säkerhetsrubriker på alla svar. Ingen strikt Content-Security-Policy än,
// eftersom kundsajter får ha egna spårningskoder och inbäddningar.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

nextConfig.headers = async () => [
  { source: "/:path*", headers: securityHeaders },
  // Inloggade delar och adminportalen ska aldrig hamna i sökmotorer.
  ...["admin", "dashboard", "redigera", "sidor", "bokningar", "installningar", "fakturering", "avboka"].map((p) => ({
    source: `/${p}/:path*`,
    headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
  })),
];

export default nextConfig;
