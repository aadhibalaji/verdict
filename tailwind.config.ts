import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          50: "#f5f1ea",
          100: "#e7dfd1",
          200: "#c9bda4",
          300: "#9c8d70",
          400: "#6a5e44",
          500: "#3d3528",
          600: "#241f17",
          700: "#16130d",
          800: "#0c0a07",
          900: "#050402",
        },
        brass: {
          300: "#e4c170",
          400: "#c89a3c",
          500: "#a47324",
          600: "#7a531a",
        },
        blood: {
          400: "#c9433a",
          500: "#9c2a22",
          600: "#6e1c17",
        },
        verdure: {
          400: "#5c8f6a",
          500: "#3f6f4d",
        },
      },
      boxShadow: {
        gavel: "0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(228,193,112,0.08)",
        chamber: "inset 0 1px 0 rgba(228,193,112,0.08), inset 0 0 80px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(rgba(228,193,112,0.04) 1px, transparent 1px)",
        chamber:
          "radial-gradient(ellipse at top, rgba(164,115,36,0.10) 0%, rgba(5,4,2,0) 60%), radial-gradient(ellipse at bottom, rgba(156,42,34,0.07) 0%, rgba(5,4,2,0) 55%)",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "45%": { opacity: "0.85" },
          "55%": { opacity: "0.92" },
        },
        gavel: {
          "0%": { transform: "rotate(-22deg) translateY(-8px)" },
          "55%": { transform: "rotate(8deg) translateY(0)" },
          "70%": { transform: "rotate(0deg) translateY(0)" },
          "100%": { transform: "rotate(0deg) translateY(0)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cursorBlink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        flicker: "flicker 4s ease-in-out infinite",
        gavel: "gavel 0.7s ease-out forwards",
        riseIn: "riseIn 0.5s ease-out forwards",
        cursorBlink: "cursorBlink 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
