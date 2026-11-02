import { initTRPC } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.context<{ userId: string | null }>().create({ transformer: superjson });

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
// Middleware narrows the context; the procedure's input and output types must come through unchanged.
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.userId == null) {
    throw new Error("unauthorised");
  }
  return next({ ctx: { userId: ctx.userId } });
});
