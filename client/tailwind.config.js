/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        ink: "#05070a",
        panel: "#0b0f14",
        stroke: "#1d2732",
        electric: "#55a8ff",
        neon: "#a4f576",
      },
    },
  },
  plugins: [],
};
