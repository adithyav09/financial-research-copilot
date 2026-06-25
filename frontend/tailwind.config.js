/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1117",
          secondary: "#1a1d2e",
          tertiary: "#242738",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
        },
        border: {
          DEFAULT: "#2a2d3e",
        },
      },
    },
  },
  plugins: [],
};
