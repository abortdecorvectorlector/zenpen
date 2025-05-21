/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lightest: "#cae9ff",
        accent: "#bee9e8",
        dark: "#1b4965",
      },
    },
  },
  plugins: [],
}