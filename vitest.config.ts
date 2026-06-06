import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

// Unit tests target the PURE modules — the metadata engine (schema-manager,
// query-builder), tenant-context, validation, and server-action logic. The
// default node environment is all we need. tsconfigPaths wires the "@/*"
// alias so test imports resolve exactly like app code.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/components/**/actions.ts",
        "src/components/**/validation.ts",
      ],
    },
  },
})
