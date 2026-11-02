import { initTRPC, TRPCError } from "@trpc/server";
import * as z from "zod/v4";

// No transformer: the client sends and reads plain JSON instead of SuperJSON's envelope.
const t = initTRPC.create();

export const appRouter = t.router({
  plain: t.router({
    search: t.procedure
      .input(z.object({ q: z.string() }))
      .query(({ input }) => ({ q: input.q, length: input.q.length })),
    rename: t.procedure
      .input(z.object({ id: z.string(), title: z.string().nullable() }))
      .mutation(({ input }) => ({ id: input.id, title: input.title })),
    noop: t.procedure.mutation(() => {}),
    forbidden: t.procedure.query((): string => {
      throw new TRPCError({ code: "FORBIDDEN", message: "not yours" });
    }),
  }),
});

export type AppRouter = typeof appRouter;
