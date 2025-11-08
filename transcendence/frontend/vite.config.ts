import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Load .env from the monorepo root so frontend shares the same env values
  envDir: resolve(rootDir, ".."),
  server: {
    port: 3004,
    host: true, // Allow external connections
    proxy: {
      // Proxy API calls to the gateway for development
      // When accessing localhost:3004, these paths go to gateway:3000
      '/api': {
        target: 'http://gateway:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://gateway:3000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      }
    }
  },
  resolve: {
    alias: { "@": "/src" } // TS paths와 런타임 해상도 일치
  }
});