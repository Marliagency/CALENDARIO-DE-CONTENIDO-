/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Chrome neutro (no cambia entre workspaces)
        base: {
          DEFAULT: "var(--bg-base)",
        },
        surface: "var(--bg-surface)",
        hover: "var(--bg-hover)",
        border: "var(--border)",
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        // Acento del workspace
        ws: {
          DEFAULT: "var(--ws-primary)",
          secondary: "var(--ws-secondary)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "32px",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
