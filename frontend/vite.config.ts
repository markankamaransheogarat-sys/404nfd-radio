import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// No PWA/offline caching (deliberately removed — see public/sw.js for why). This is a fast-
// moving app under active development; a service worker serving stale JS between deploys caused
// real, repeated production incidents (stuck clients quietly breaking playback for everyone,
// unfixable short of the affected person manually clearing site data).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
  },
});
