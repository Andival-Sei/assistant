import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pwaDevEnabled = env.VITE_PWA_DEV_ENABLED === "true";

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: "auto",
        includeAssets: ["favicon.svg"],
        // По умолчанию в dev SW отключён (меньше шума в консоли).
        // Для диагностики push можно включить через VITE_PWA_DEV_ENABLED=true.
        devOptions: {
          enabled: pwaDevEnabled,
          type: "module",
        },
        manifest: {
          name: "Ассистент",
          short_name: "Ассистент",
          description:
            "Ассистент — финансы, здоровье, списки и семья в одном приложении",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#020617",
          theme_color: "#10b981",
          orientation: "portrait",
          icons: [
            {
              src: "/favicon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
            },
          ],
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 2500,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
