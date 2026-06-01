/**
 * Grupo Quarta Via — Preset Tailwind
 * Mapeia os design tokens (tokens.json / theme.css) para classes utilitárias.
 * Use em tailwind.config.js:
 *   import preset from './packages/design-system/tailwind.preset.js'
 *   export default { presets: [preset], ... }
 *
 * Exemplos de uso:
 *   bg-bg  bg-surface  text-text  text-muted  border-border
 *   bg-primary  hover:bg-primary-hover  text-on-primary
 */

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#f47920",
          hover: "#d8661a",
          active: "#bf5613",
          soft: "#ffb066",
        },
        bg: "#0d0d0d",
        surface: {
          DEFAULT: "#1a1a1a",
          2: "#222222",
        },
        border: {
          DEFAULT: "#2a2a2a",
          strong: "#3a3a3a",
        },
        text: {
          DEFAULT: "#ffffff",
          muted: "#b3b3b3",
          subtle: "#7a7a7a",
        },
        "on-primary": "#0d0d0d",
        success: "#3fb950",
        warning: "#f5a623",
        danger: "#e5484d",
        info: "#3b82f6",
        chart: {
          1: "#f47920",
          2: "#ffb066",
          3: "#8ab4f8",
          4: "#3fb950",
          5: "#c792ea",
          6: "#56d4dd",
          7: "#e5484d",
          8: "#f5a623",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "24px",
        "2xl": "32px",
        kpi: "40px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "48px",
        8: "64px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
        md: "0 4px 12px rgba(0, 0, 0, 0.5)",
        lg: "0 12px 32px rgba(0, 0, 0, 0.6)",
      },
    },
  },
};
