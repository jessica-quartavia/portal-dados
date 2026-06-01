import preset from "./packages/design-system/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  // Reaproveita os tokens do design system (fonte da verdade).
  presets: [preset],
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./templates/**/*.{astro,html,js,jsx,ts,tsx}",
  ],
};
