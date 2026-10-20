/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B5E20', light: '#4CAF50', dark: '#0D3B0F' },
        secondary: { DEFAULT: '#0D47A1', light: '#1976D2' },
        accent: '#FFD700',
      },
    },
  },
  plugins: [],
}
