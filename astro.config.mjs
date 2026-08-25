// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";

// SSR é obrigatório: middleware de auth, /auth/callback, /api/* e cookies.
// Não usar output static — a homepage protegida passaria a ser HTML público.
export default defineConfig({
  output: "server",
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
