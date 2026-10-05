import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const corpus = fileURLToPath(new URL("../docs/analyse/corpus-prototype", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@corpus": corpus } },
  server: { fs: { allow: [".", corpus] } },
  test: { environment: "node" },
});
