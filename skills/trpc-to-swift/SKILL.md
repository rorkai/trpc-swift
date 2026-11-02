---
name: trpc-to-swift
description: When adding, changing or checking Swift types generated from a tRPC router with trpc-to-swift.
---

# trpc-to-swift

trpc-to-swift turns the **inferred** TypeScript types of tRPC procedures into Swift `Codable` types. The router's implementation is the contract: no `.output()` schema is needed, and changing what a resolver returns changes the Swift.

Config, options and generated output: `node_modules/@rorkai/trpc-to-swift/README.md`; every config key is described in `node_modules/@rorkai/trpc-to-swift/config-schema.json`.

## Workflow

1. Find the project's `trpc-to-swift.json` (it names the router, the tsconfig and the output file).
2. To expose a procedure to Swift, add its dotted path (`projects.list`, or `ping` for a root procedure) to `procedures`.
3. Regenerate with `trpc-to-swift <config>`. Never edit the generated file by hand; the next run overwrites it.
4. Read every `warning:` line. Each one is a shape the generator could not express and typed as `TRPCJSONValue`. Prefer fixing the TypeScript type on the server, following [references/warnings.md](references/warnings.md); accept the fallback only when the server is out of reach.
5. Commit the generated file with the server change that caused it. CI or a git hook should run `trpc-to-swift <config> --check`, which exits 1 when the committed file is stale.

## Using the types in Swift

- Each procedure is `<Namespace>.<Router>.<Procedure>` (default namespace `TRPC`) conforming to `TRPCProcedure`, with `path`, `kind`, `Input` and `Output`. A procedure without input or output uses `TRPCVoid`.
- The types describe the `json` half of a SuperJSON payload. Decode and encode with `TRPCCoding.makeDecoder()` / `makeEncoder()`, which handle SuperJSON's date strings; the HTTP transport is the app's own.
- Inputs follow the schema's input side: a key with a zod `.default()` is optional, and a `T | null` key is still sent as `null`.
- A subscription's `Output` is one message, not the stream.
