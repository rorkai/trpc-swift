import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "trpc-to-swift",
    root: import.meta.dirname,
    globals: true,
    fsModuleCache: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
