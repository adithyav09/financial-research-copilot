/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Legacy dark app tokens (used by not-yet-refactored surfaces). ---
        surface: {
          DEFAULT: "#0a0c10",
          secondary: "#111318",
          tertiary: "#1a1d24",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#60a5fa",
          muted: "#1d4ed8",
        },
        border: {
          DEFAULT: "#1f2330",
        },
        positive: "#10b981",
        negative: "#ef4444",
        warning: "#f59e0b",

        // --- Editorial/research design system (new). Driven by CSS variables in
        //     index.css so surfaces can be light-default with a dark variant.
        //     "annotated primary source": archival paper, signature ink-blue,
        //     filing-stamp red, ledger figures. See docs/architecture.md. ---
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        "accent-ink": {
          DEFAULT: "var(--accent-ink)",
          soft: "var(--accent-ink-soft)",
        },
        stamp: "var(--stamp)",
        "ledger-pos": "var(--ledger-pos)",
        "ledger-neg": "var(--ledger-neg)",
      },
      fontFamily: {
        // Newsreader = book serif for display (loaded in index.html); Inter body; JetBrains Mono for figures/citations.
        serif: ['Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
