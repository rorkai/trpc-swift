import * as z from "zod/v4";

import { t } from "../trpc.ts";

export const appRouter = t.router({
  events: t.router({
    // tRPC 11 subscriptions are async generators; each yielded value is one message.
    onMessage: t.procedure.input(z.object({ roomId: z.string() })).subscription(async function* () {
      yield { id: "m1", text: "hi", sentAt: new Date() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
