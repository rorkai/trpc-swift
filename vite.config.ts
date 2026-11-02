import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 120,
    // Golden files that the tests compare byte for byte.
    ignorePatterns: ["tests/*/Output.swift", "config-schema.json"],
  },
  pack: {
    entry: ["src/cli.ts"],
    publint: true,
    unused: true,
    exports: {
      // A CLI, not a library: the entry becomes `bin`, and importing the package exposes no module.
      bin: true,
      exclude: ["cli"],
      customExports: { "./config-schema.json": "./config-schema.json" },
    },
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
