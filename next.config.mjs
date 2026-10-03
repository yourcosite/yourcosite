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

export default nextConfig;
