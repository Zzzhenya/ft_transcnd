import { defineConfig, loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file from parent directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  
  return {
    envDir: path.resolve(__dirname, '..'), // Look for .env in parent directory
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
  };
});