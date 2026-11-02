import * as z from "zod/v4";

import { authedProcedure, publicProcedure, router } from "../trpc";

export const usersRouter = router({
  me: authedProcedure.query(({ ctx }) => ({ id: ctx.userId, name: "Ada" })),
  byId: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => ({ id: input.id, name: "Ada" })),
});
