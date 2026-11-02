---
name: trpc-swift
description: When adding, changing or checking Swift types generated from a tRPC router with trpc-swift.
---

# trpc-swift

trpc-swift turns the **inferred** TypeScript types of tRPC procedures into Swift `Codable` types. The router's implementation is the contract: no `.output()` schema is needed, and changing what a resolver returns changes the Swift.

Config, options and generated output: `node_modules/@rork-ai/trpc-swift/README.md`; every config key is described in `node_modules/@rork-ai/trpc-swift/config-schema.json`.

## Workflow

1. Find the project's `trpc-swift.json` (it names the router, the tsconfig and the output file).
2. To expose a procedure to Swift, add its dotted path (`projects.list`, or `ping` for a root procedure) to `procedures`.
3. Regenerate with `trpc-swift <config>`. Never edit the generated file by hand; the next run overwrites it.
4. Read every `warning:` line. Each one is a shape the generator could not express and typed as `TRPCJSONValue`. Prefer fixing the TypeScript type on the server, following [references/warnings.md](references/warnings.md); accept the fallback only when the server is out of reach.
5. Commit the generated file with the server change that caused it. CI or a git hook should run `trpc-swift <config> --check`, which exits 1 when the committed file is stale.

## Using the types in Swift

- Each procedure is `<Namespace>.<Router>.<Procedure>` (default namespace `TRPC`) conforming to `TRPCProcedure`, with `path`, `kind`, `Input` and `Output`. A procedure without input or output uses `TRPCVoid`.
- Call procedures with the generated `TRPCClient` (`client.call(TRPC.Projects.List.self, input)`), or build and read requests with `TRPCWire` when the app keeps its own networking. Both send SuperJSON's `meta` for `Date`, `Set` and `bigint` inputs; a hand-written transport usually forgets it. `"client": false` in the config generates the types alone.
- Inputs follow the schema's input side: a key with a zod `.default()` is optional, and a `T | null` key is still sent as `null`.
- A subscription's `Output` is one message, not the stream.
