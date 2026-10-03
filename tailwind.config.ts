import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
      },
      colors: {
        bg: "#F7F5F2",
        surface: "#FFFFFF",
        ink: "#17171A",
        "ink-dim": "#6B6A66",
        line: "#E7E4DD",
        accent: "#C6FF5E",
        "accent-ink": "#0C1004",
        "accent-soft": "#F0FADB",
        warm: "#E8714A",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Work Sans", "system-ui", "sans-serif"],
      },
      // Rörelserna för Millie, chattredigerarens maskot (components/Millie.tsx)
      // — en lugn flytande loop i vila, en piggare studs+vagg när hon jobbar
      // (se "active"-läget), och en separat, lite snabbare vaggning för
      // hårtofsarna så de inte rör sig exakt i takt med kroppen.
      keyframes: {
        "millie-float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-3px) rotate(-1deg)" },
        },
        "millie-bounce": {
          "0%, 100%": { transform: "translateY(0px) rotate(-3deg)" },
          "25%": { transform: "translateY(-7px) rotate(2deg)" },
          "50%": { transform: "translateY(-1px) rotate(-2deg)" },
          "75%": { transform: "translateY(-5px) rotate(3deg)" },
        },
        "millie-hair": {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
      },
      animation: {
        "millie-float": "millie-float 2.8s ease-in-out infinite",
        "millie-bounce": "millie-bounce 0.8s ease-in-out infinite",
        "millie-hair": "millie-hair 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
