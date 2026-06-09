import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  root: "src-ui",
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020"
  }
});
