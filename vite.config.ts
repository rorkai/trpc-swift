import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 120,
    // The fixture outputs are golden files that the tests compare byte for byte.
    ignorePatterns: ["tests/*/Output.swift"],
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
