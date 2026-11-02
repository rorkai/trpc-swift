import * as z from "zod/v4";

import { t } from "../trpc.ts";

export const appRouter = t.router({
  health: t.router({
    ping: t.procedure.query(() => "pong"),
  }),
  user: t.router({
    profile: t.procedure.query(() => ({
      id: "user_1",
      avatarUrl: null as string | null,
      bio: undefined as string | undefined,
      isSubscribed: true,
      credits: 12.5,
      createdAt: new Date(),
    })),
  }),
  projects: t.router({
    list: t.procedure
      .input(z.object({ cursor: z.string().nullish(), limit: z.number().optional() }).optional())
      .query(() => ({ items: [{ id: "project_1", title: "Demo" }], nextCursor: null as string | null })),
    get: t.procedure
      .input(z.object({ projectId: z.string() }))
      .query(() => (Math.random() > 0.5 ? { id: "project_1", title: "Demo" } : null)),
    delete: t.procedure.input(z.object({ projectId: z.string() })).mutation(() => {}),
    // `title` must be sent even when null; `description` may be left out.
    update: t.procedure
      .input(
        z.object({
          projectId: z.string(),
          title: z.string().nullable(),
          description: z.string().nullish(),
          // Rejects any value, including null, so the key must be left out.
          source: z.never().optional(),
          // Accepts only null, so the key must be sent as null.
          clearedAt: z.null(),
        }),
      )
      .mutation(() => ({ ok: true })),
  }),
});

export type AppRouter = typeof appRouter;
