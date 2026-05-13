import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const site = resolve(__dirname, "site");

export default defineConfig({
  root: "site",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(site, "index.html"),
        filme: resolve(site, "filme.html"),
      },
    },
  },
});
