/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        panel: "#f7f8f5",
        line: "#d7dcd2",
        moss: "#556b4f",
        steel: "#3b6473",
        coral: "#b85f4d"
      }
    }
  },
  plugins: []
};
