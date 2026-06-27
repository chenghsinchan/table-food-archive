import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f1ea",
        "paper-dim": "#eae6dc",
        ink: "#141414",
        "ink-soft": "#3a3a3a",
        grey: "#8b8782",
        mark: "#e23b2e", // red active mark
        annotate: "#2f49d1", // blue annotation
        violet: "#6b3fd6", // purple annotation
      },
      fontFamily: {
        sans: [
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
    },
  },
  plugins: [],
} satisfies Config;
