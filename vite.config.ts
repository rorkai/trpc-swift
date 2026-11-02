import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 120,
    // The fixture outputs are golden files that the tests compare byte for byte.
    ignorePatterns: ["tests/*/Output.swift"],
  },
  pack: {
    entry: ["src/cli.ts"],
    // The CLI ships as one file; tsrs stays external as a peer so a project can pin its own.
    deps: { onlyBundle: ["gunshi", "zod", "@praha/error-factory", "ts-pattern"] },
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
