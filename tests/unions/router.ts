import { t } from "../trpc.ts";

type Balance = { name: "free"; balance: number; periodEndAt: Date } | { name: "pay-as-you-go-credit"; balance: number };

// A variant literally tagged "unknown" moves the fallback case to another name.
type Event = { kind: "unknown"; raw: string } | { kind: "opened"; at: Date };

export const appRouter = t.router({
  unions: t.router({
    scalars: t.procedure.query(() => ({
      role: "editor" as "editor" | "viewer" | null,
      enabled: true as boolean | null,
      size: 1 as 1 | 2 | 3,
      label: "a" as `prefix-${string}` | "plain",
    })),
    tagged: t.procedure.query(() => ({ balances: [] as Balance[], event: null as Event | null })),
    // A boolean literal tag decodes as an exhaustive enum.
    booleanTagged: t.procedure.query(() => ({
      result: { ok: true } as { ok: true; value: string } | { ok: false; error: string },
    })),
    // TypeScript gives each inferred member the keys it lacks as `?: undefined`; those never reach JSON.
    inferredMembers: t.procedure.query(() =>
      Math.random() > 0.5
        ? { status: "charged" as const, receiptId: "receipt_1" }
        : { status: "no_saved_card" as const },
    ),
    // Objects with no shared literal tag cannot decode as an enum.
    untagged: t.procedure.query(() => ({ result: { a: "x" } as { a: string } | { b: number } })),
    // Strings mixed with objects have no Codable shape.
    mixed: t.procedure.query(() => ({ attachment: "a" as string | { url: string } })),
  }),
});

export type AppRouter = typeof appRouter;
