import * as z from "zod/v4";

import { t } from "../trpc.ts";

export const appRouter = t.router({
  naming: t.router({
    // Keys that are Swift keywords or not Swift identifiers get Swift names and CodingKeys.
    keys: t.procedure.query(() => ({
      default: true,
      "app-icon-url": "https://example.com/icon.png",
      "2xScale": 2,
      self: "me",
    })),
    // Element types are named after the singular of the array property.
    arrays: t.procedure.query(() => ({
      items: [{ id: "a" }],
      entries: [{ id: "b" }],
      data: [{ id: "c" }],
      address: [{ id: "d" }],
    })),
    // Nested types that would share a name, or take one Swift reserves, are renamed.
    collisions: t.procedure.query(() => ({
      type: { name: "a" },
      owner: { profile: { name: "b" } },
      profile: { name: "c" },
    })),
    // Keys and values that sanitise to the same Swift name get numbered, and a nested
    // type never takes a name such as `String` that generated references rely on.
    sanitisedCollisions: t.procedure.query(() => ({
      "foo-bar": 1,
      fooBar: 2,
      mode: "foo-bar" as "foo-bar" | "fooBar",
      string: { value: "a" },
    })),
    // A nested type named after a protocol would break every `: Codable, Hashable, Sendable` beside it.
    protocolNames: t.procedure.query(() => ({ hashable: { a: 1 }, codingKey: { b: 2 } })),
    // `encode(to:)` names its parameter `encoder` and its container `container`; fields with those names must not be shadowed.
    encoderNames: t.procedure
      .input(z.object({ encoder: z.string().nullable(), container: z.string() }))
      .mutation(() => true),
    foo_bar: t.procedure.query(() => 1),
    fooBar: t.procedure.query(() => 2),
    type: t.procedure.query(() => 3),
    // A tag starting with a digit names its payload after the tag key.
    tags: t.procedure.query(() => ({
      step: { step: "2fa-code" as const, codeLength: 6 } as
        | { step: "2fa-code"; codeLength: number }
        | { step: "2fa-method"; method: "sms" | "totp" },
    })),
  }),
});

export type AppRouter = typeof appRouter;
