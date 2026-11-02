import { lazy } from "@trpc/server";

import { mergeRouters, router } from "../trpc";
import { healthRouter } from "./health";
import { projectsRouter } from "./projects";
import { usersRouter } from "./users";

export const appRouter = mergeRouters(
  // Top-level procedures merged in from another router.
  healthRouter,
  router({
    users: usersRouter,
    projects: projectsRouter,
    reports: lazy(() => import("./reports").then((m) => m.reportsRouter)),
  }),
);

export type AppRouter = typeof appRouter;
