import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        heading: "rgb(var(--color-heading) / <alpha-value>)",
        body: "rgb(var(--color-body) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-tint": "rgb(var(--color-accent-tint) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        "success-bg": "rgb(var(--color-success-bg) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter-tight)", "Helvetica Neue", "Arial", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "18px",
        panel: "26px",
        hero: "20px",
      },
      backdropBlur: {
        glass: "18px",
      },
      boxShadow: {
        glass: "0 8px 28px rgba(60,40,20,0.16), inset 0 1px 0 rgba(255,255,255,0.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
