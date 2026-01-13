/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./packages/frontend/src/**/*.{ts,tsx,html}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
