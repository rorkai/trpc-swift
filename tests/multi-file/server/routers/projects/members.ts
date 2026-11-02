import * as z from "zod/v4";

import type { Member } from "@server/models";
import { authedProcedure, router } from "@server/trpc";

const projectProcedure = authedProcedure.input(z.object({ projectId: z.string() }));

export const membersRouter = router({
  list: projectProcedure.query((): Member[] => []),
  // A second `.input()` merges into the base procedure's input.
  remove: projectProcedure.input(z.object({ memberId: z.string() })).mutation(() => ({ removed: true })),
});
