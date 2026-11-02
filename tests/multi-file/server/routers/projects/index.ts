import { publicProcedure, router } from "../../trpc";
import { membersRouter } from "./members";

export const projectsRouter = router({
  list: publicProcedure.query(() => [{ id: "project_1", title: "Demo" }]),
  // A router nested from another file.
  members: membersRouter,
});
