// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    react(),
    // applyBaseStyles: false → usamos packages/design-system/theme.css como base
    tailwind({ applyBaseStyles: false }),
  ],
});
