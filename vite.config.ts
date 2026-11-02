import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 120,
    // Golden files that the tests compare byte for byte.
    ignorePatterns: ["tests/*/Output.swift", "config-schema.json"],
  },
  pack: {
    entry: ["src/cli.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    name: "trpc-to-swift",
    root: import.meta.dirname,
    globals: true,
    fsModuleCache: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
