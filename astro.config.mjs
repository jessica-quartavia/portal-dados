// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

// Páginas principais: estáticas (HTML).
// SSR só onde precisa: /auth/callback e /api/* (prerender = false).
export default defineConfig({
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    build: {
      rollupOptions: {
        external: ["pg"],
      },
    },
  },
});
