import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /src[\\/].*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  test: {
    globals: true,
    setupFiles: "./src/setupTests.js",
    environment: "jsdom",
    exclude: ["node_modules/**", "dist/**", "build/**", "e2e/**"],
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          supabase: ["@supabase/supabase-js"],
          scanner: ["html5-qrcode"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
