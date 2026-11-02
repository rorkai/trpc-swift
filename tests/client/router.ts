import { TRPCError } from "@trpc/server";
import * as z from "zod/v4";

import { t } from "../trpc.ts";

export const appRouter = t.router({
  client: t.router({
    greeting: t.procedure.query(() => "hello"),
    // Echoes a query string, so characters URLSearchParams treats specially must survive the trip.
    search: t.procedure.input(z.object({ q: z.string() })).query(({ input }) => input.q),
    // Reports which SuperJSON values reached the resolver restored rather than as their JSON stand-ins.
    restored: t.procedure
      .input(
        z.object({
          at: z.date(),
          items: z.array(z.object({ at: z.date() })),
          tags: z.set(z.string()),
          count: z.bigint(),
          until: z.date().nullable(),
          byId: z.record(z.string(), z.date()),
        }),
      )
      .mutation(({ input }) => ({
        at: input.at,
        itemsAreDates: input.items.every((item) => item.at instanceof Date),
        tagCount: input.tags.size,
        countPlusOne: (input.count + 1n).toString(),
        untilIsNull: input.until === null,
        byIdAreDates: Object.values(input.byId).every((value) => value instanceof Date),
      })),
    optionalInput: t.procedure
      .input(z.object({ name: z.string() }).optional())
      .query(({ input }) => (input == null ? "anonymous" : input.name)),
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
