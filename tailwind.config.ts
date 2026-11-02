import type { Config } from "tailwindcss";

/**
 * Every color resolves to a design token in src/styles/tokens.css, so the whole
 * app re-themes when `data-theme` flips on <html> — no per-component edits.
 *
 * The function form is what makes alpha modifiers keep working: `bg-gold/30`
 * would emit an unusable value against a plain `var(...)` string, so when
 * Tailwind passes an opacityValue we wrap the token in color-mix() instead.
 */
const token =
  (name: string) =>
  ({ opacityValue }: { opacityValue?: string }) => {
    // Tailwind calls this two different ways and the difference matters:
    //   • plain utility (bg-surface)  → opacityValue is the STRING
    //     "var(--tw-bg-opacity)", which is not a number.
    //   • alpha modifier (bg-gold/30) → opacityValue is "0.3".
    // Coercing the first form with Number() yields NaN, and
    // `color-mix(in srgb, var(--x) NaN%, transparent)` is invalid at
    // computed-value time — so the declaration is dropped and the utility
    // silently does nothing. Anything non-numeric must resolve to the opaque
    // token instead.
    if (opacityValue === undefined) return `var(${name})`;
    const alpha = Number(opacityValue);
    if (!Number.isFinite(alpha) || alpha >= 1) return `var(${name})`;
    return `color-mix(in srgb, var(${name}) ${alpha * 100}%, transparent)`;
  };

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* — Semantic names. Prefer these in new code. — */
        bg: token("--color-bg"),
        surface: token("--color-surface"),
        sunken: token("--color-surface-sunken"),
        divider: token("--color-divider"),
        dividerStrong: token("--color-divider-strong"),
        onAccent: token("--color-on-accent"),
        accent: {
          DEFAULT: token("--color-accent-600"),
          100: token("--color-accent-100"),
          200: token("--color-accent-200"),
          300: token("--color-accent-300"),
          400: token("--color-accent-400"),
          500: token("--color-accent-500"),
          600: token("--color-accent-600"),
          700: token("--color-accent-700"),
          800: token("--color-accent-800"),
          900: token("--color-accent-900"),
        },
        bronze: {
          DEFAULT: token("--color-accent-2-600"),
          100: token("--color-accent-2-100"),
          600: token("--color-accent-2-600"),
          800: token("--color-accent-2-800"),
        },

        /* — Legacy names, retargeted to tokens. —
           Kept so every component written against the old navy/gold palette
           adopts the new system without being edited. The names now lie about
           their hue on purpose; migrate call sites to the semantic names above
           as files are touched. */
        navy: {
          950: token("--color-bg"),
          900: token("--color-surface"),
          800: token("--color-surface-sunken"),
        },
        gold: token("--color-accent-600"),
        champagne: token("--color-accent-2-600"),
        ink: token("--color-text"),
        mutedFg: token("--color-text-muted"),
        line: token("--color-divider"),
        success: token("--color-success"),
        danger: token("--color-danger"),
        warning: token("--color-warning"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter-tight)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        h1: ["var(--text-h1)", { lineHeight: "1.08", letterSpacing: "-0.028em" }],
        h2: ["var(--text-h2)", { lineHeight: "1.12", letterSpacing: "-0.025em" }],
        h3: ["var(--text-h3)", { lineHeight: "1.16", letterSpacing: "-0.021em" }],
        h4: ["var(--text-h4)", { lineHeight: "1.2" }],
        h5: ["var(--text-h5)", { lineHeight: "1.25" }],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        floating: "var(--shadow-lg)",
        gold: "var(--shadow-md)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      maxWidth: {
        container: "var(--container)",
        narrow: "var(--container-narrow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
      },
      transitionDuration: {
        fast: "140ms",
        DEFAULT: "220ms",
        slow: "420ms",
      },
      backdropBlur: {
        18: "18px",
        20: "20px",
      },
      screens: {
        nav: "981px",
        // Enough room for all three catalog triggers PLUS the two homepage
        // anchors without the actions wrapping to a second row.
        wide: "1140px",
      },
    },
  },
  plugins: [],
};

export default config;
