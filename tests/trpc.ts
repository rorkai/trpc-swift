import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// SuperJSON keeps Date in the inferred output type, as a router using it would see.
export const t = initTRPC.create({ transformer: superjson });
