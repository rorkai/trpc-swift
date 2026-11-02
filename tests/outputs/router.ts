import { t } from "../trpc.ts";

interface Owner {
  id: string;
  /** An optional property, as opposed to one typed `T | undefined`. */
  nickname?: string;
}

type Timestamps = { createdAt: Date; updatedAt: Date | null };

export const appRouter = t.router({
  outputs: t.router({
    // An async resolver's Promise is unwrapped.
    async: t.procedure.query(async () => ({ ok: true })),
    // Interfaces and intersections of object types flatten into one struct.
    shapes: t.procedure.query(() => ({
      owner: { id: "user_1" } as Owner,
      project: { id: "project_1", createdAt: new Date(), updatedAt: null } as { id: string } & Timestamps,
      matrix: [[1, 2]] as number[][],
      labels: ["a"] as readonly string[],
      counts: {} as Record<string, number>,
    })),
    // A resolver that returns nothing.
    nothing: t.procedure.mutation(() => {}),
    nullable: t.procedure.query(() => (Math.random() > 0.5 ? "a" : null)),
  }),
});

export type AppRouter = typeof appRouter;
