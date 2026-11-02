import * as z from "zod/v4";

import { t } from "../trpc.ts";

export const appRouter = t.router({
  inputs: t.router({
    // The client sends the schema's input side: defaults and transforms only apply on the server.
    defaults: t.procedure
      .input(
        z.object({
          page: z.number().default(1),
          sort: z.enum(["newest", "oldest"]).default("newest"),
          tags: z.array(z.string()).optional(),
        }),
      )
      .query(({ input }) => input.page),
    transforms: t.procedure
      .input(z.object({ count: z.string().transform((value) => Number(value)) }))
      .query(({ input }) => input.count),
    // Nested objects, arrays of objects and dates in the input.
    nested: t.procedure
      .input(
        z.object({
          filter: z.object({ from: z.date(), to: z.date().nullable() }),
          items: z.array(z.object({ id: z.string(), quantity: z.number().int() })),
          metadata: z.record(z.string(), z.string()),
        }),
      )
      .mutation(() => true),
    // A discriminated union input becomes a tagged enum the client encodes.
    discriminated: t.procedure
      .input(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("email"), address: z.string() }),
          z.object({ type: z.literal("sms"), phone: z.string() }),
        ]),
      )
      .mutation(() => true),
    // A primitive input rather than an object.
    primitive: t.procedure.input(z.string()).query(({ input }) => input.length),
  }),
});

export type AppRouter = typeof appRouter;
