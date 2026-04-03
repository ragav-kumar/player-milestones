import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const entryFile = fileURLToPath(new URL("./src/module.ts", import.meta.url));

/**
 * Vite configuration for bundling the Foundry module entrypoint into `dist/`.
 */
export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: entryFile,
      formats: ["es"],
      fileName: () => "player-milestones.js"
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          return assetInfo.name === "style.css"
            ? "player-milestones.css"
            : assetInfo.name ?? "[name][extname]";
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
