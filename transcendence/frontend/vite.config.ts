import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3004,
    host: true // Allow external connections
  },
  resolve: {
    alias: { "@": "/src" } // TS paths와 런타임 해상도 일치
  }
});