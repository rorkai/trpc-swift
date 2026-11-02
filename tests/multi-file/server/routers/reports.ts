import { publicProcedure, router } from "../trpc";

// Loaded through `lazy()`, so the app router only sees this module through a dynamic import.
export const reportsRouter = router({
  summary: publicProcedure.query(async () => ({ total: 3, generatedAt: new Date() })),
});
