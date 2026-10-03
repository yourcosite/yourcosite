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
  // @imgly/background-removal (frilägg-loggan-funktionen, körs bara i
  // webbläsaren) drar in onnxruntime-web, som har en Node-specifik variant
  // webpack annars försöker tolka under bygget och kraschar på. Den
  // varianten används aldrig i webbläsaren, så vi stänger av den helt.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
    };
    // onnxruntime-web blandar CJS/ESM i sina .mjs-filer på ett sätt webpack
    // annars kraschar på redan vid byggtidens statiska analys (även om
    // koden bara körs i webbläsaren, bakom en dynamisk import).
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
