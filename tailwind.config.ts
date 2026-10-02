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
    },
  },
  plugins: [],
};

export default config;
