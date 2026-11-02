# trpc-to-swift

Generates Swift `Codable` types for tRPC procedures from the router's **inferred** TypeScript types.

Most tRPC routers have no `.output()` schemas, so schema-based generators (OpenAPI, `trpc-swift`) cannot see the response types. `trpc-to-swift` asks the TypeScript 7 checker ([tsrs](https://github.com/oxc-project/tsrs)) for `inferRouterInputs` / `inferRouterOutputs` of each procedure instead, so the generated types are exactly what the implementation returns.

## Usage

Create a config next to your Swift sources:

```json
{
  "tsconfig": "../api/tsconfig.json",
  "router": "../api/src/router.ts",
  "routerType": "AppRouter",
  "namespace": "TRPC",
  "output": "./Sources/App/TRPC.generated.swift",
  "procedures": ["user.profile", "projects.list"]
}
```

`tsrs` is a peer dependency: npm, pnpm and bun install it automatically, and a project that pins its own `tsrs` keeps that version.

Paths are relative to the config file. `routerType` defaults to `AppRouter` and `namespace` to `TRPC`.

```sh
trpc-to-swift trpc-to-swift.json          # write the Swift file
trpc-to-swift trpc-to-swift.json --check  # exit 1 when the committed file is stale
```

With Nix, `nix run github:rorkai/trpc-swift -- trpc-to-swift.json` runs it without a Node setup of your own.

Run `--check` in CI or a pre-commit hook to catch server changes that would break the Swift client.

### What is generated

- One namespace per router, with `Input` / `Output` types per procedure
- SuperJSON-aware scalars: `Date`, `Set` (as arrays), `bigint`, branded primitives
- String and boolean literal unions as enums; tagged object unions as enums with associated values
- Shapes Swift cannot represent (recursive types, `unknown`, tuples, untagged unions, `Map`) fall back to `TRPCJSONValue` with a warning

## Development

The development environment is provided by Nix. With [direnv](https://direnv.net/), `direnv allow` loads it; otherwise run `nix develop`. The shell installs the pnpm dependencies and the git hooks.

```sh
just test             # fixture tests; Swift compilation runs only where Xcode is installed
just update-fixtures  # regenerate tests/*/Output.swift
just check            # vp check: format, lint and type-check
just fmt
```

Each directory under `tests/` is a fixture: a `router.ts`, a `trpc-to-swift.json`, and the committed `Output.swift` the generator must reproduce.
