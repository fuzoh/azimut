import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const corpus = fileURLToPath(new URL("../docs/analyse/corpus-prototype", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@corpus": corpus } },
  server: { fs: { allow: [".", corpus] } },
  // Worker en module ES (imports partagés avec le thread principal : noyau, corpus).
  worker: { format: "es" },
  test: { environment: "node" },
});
