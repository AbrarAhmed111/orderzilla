/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        oz: {
          muted: "var(--oz-muted)",
          success: "var(--oz-success)",
          border: "var(--oz-border)",
          danger: "var(--oz-danger)",
          dark: "var(--oz-dark)",
          surface: "var(--oz-surface)",
          brand: "var(--oz-brand)",
          "brand-2": "var(--oz-brand-2)",
        },
      },
    },
  },
  plugins: [],
};
