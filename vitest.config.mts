import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the "@/*" path alias from tsconfig.json
    alias: [{ find: /^@\//, replacement: rootDir }],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
