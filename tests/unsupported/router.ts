import { t } from "../trpc.ts";

type TreeNode = { label: string; children: TreeNode[] };

export const appRouter = t.router({
  unsupported: t.router({
    shapes: t.procedure.query(() => ({
      tree: { label: "root", children: [] } as TreeNode,
      payload: null as unknown,
      pair: ["a", 1] as [string, number],
      flags: {} as Record<string, boolean>,
      // JSON drops functions, so a method on the returned object never reaches the client.
      describe: () => "not serialised",
    })),
  }),
});

export type AppRouter = typeof appRouter;
