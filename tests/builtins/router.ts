import { t } from "../trpc.ts";

type ProjectId = string & { readonly __brand: "ProjectId" };

export const appRouter = t.router({
  builtins: t.router({
    // SuperJSON's json half carries these as plain JSON values that `meta` later restores.
    values: t.procedure.query(() => ({
      projectId: "project_1" as ProjectId,
      tags: new Set(["a"]),
      readonlyTags: new Set(["a"]) as ReadonlySet<string>,
      size: 1n,
      pattern: /a/,
      createdAt: new Date(),
      counts: new Map([["a", 1]]),
    })),
  }),
});

export type AppRouter = typeof appRouter;
