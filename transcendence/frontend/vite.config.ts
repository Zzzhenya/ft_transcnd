import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3004,
    host: true, // Allow external connections
    proxy: {
      // Proxy API calls to the gateway
      '/ws': {
        target: 'http://gateway:3000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      },
      '/api': {
        target: 'http://gateway:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: { "@": "/src" } // TS paths와 런타임 해상도 일치
  }
});