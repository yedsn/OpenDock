import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  root: "src-ui",
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 6250,
    strictPort: true
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020"
  }
});
