import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "@": "/src" } // TS paths와 런타임 해상도 일치
  }
});