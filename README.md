# trpc-swift

Generates Swift `Codable` types for tRPC procedures from the router's **inferred** TypeScript types.

Most tRPC routers have no `.output()` schemas, so schema-based generators (OpenAPI, or the unrelated unscoped [`trpc-swift`](https://www.npmjs.com/package/trpc-swift) package) cannot see the response types. `@rork-ai/trpc-swift` asks the TypeScript 7 checker ([tsrs](https://github.com/oxc-project/tsrs)) for `inferRouterInputs` / `inferRouterOutputs` of each procedure instead, so the generated types are exactly what the implementation returns.

## Usage

```sh
npm install --save-dev @rork-ai/trpc-swift
```

Create a config next to your Swift sources:

```json
{
  "$schema": "https://raw.githubusercontent.com/rorkai/trpc-swift/main/config-schema.json",
  "tsconfig": "../api/tsconfig.json",
  "router": "../api/src/router.ts",
  "routerType": "AppRouter",
  "namespace": "TRPC",
  "output": "./Sources/App/TRPC.generated.swift",
  "procedures": ["user.profile", "projects.list"]
}
```

`tsrs` is a peer dependency: npm, pnpm and bun install it automatically, and a project that pins its own `tsrs` keeps that version.

$schema gives editors completion and validation; without an npm install, point it at https://raw.githubusercontent.com/rorkai/trpc-swift/main/config-schema.json instead. Unknown keys are rejected, so a misspelt option fails rather than falling back to its default.

Paths are relative to the config file. `routerType` defaults to `AppRouter` and `namespace` to `TRPC`.

```sh
trpc-swift trpc-swift.json          # write the Swift file
trpc-swift trpc-swift.json --check  # exit 1 when the committed file is stale
```

With Nix, `nix run github:rorkai/trpc-swift -- trpc-swift.json` runs it without a Node setup of your own.

Run `--check` in CI or a pre-commit hook to catch server changes that would break the Swift client.

### What is generated

- One namespace per router, with `Input` / `Output` types per procedure
- SuperJSON-aware scalars: `Date`, `Set` (as arrays), `bigint`, branded primitives
- String and boolean literal unions as enums; tagged object unions as enums with associated values
- Shapes Swift cannot represent (recursive types, `unknown`, tuples, untagged unions, `Map`) fall back to `TRPCJSONValue` with a warning

### Generated client

Set `"client": true` to also generate `TRPCClient`, which sends each procedure with tRPC's HTTP wire format: a query as a GET with `?input=`, a mutation as a POST. With a SuperJSON router it adds the `meta` that restores `Date`, `Set` and `bigint` inputs on the server, as the TypeScript client does.

```swift
let client = TRPCClient(baseURL: URL(string: "https://api.example.com/trpc")!) { request in
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}
let projects = try await client.call(TRPC.Projects.List.self, .init(limit: 20))
```

A failed call throws `TRPCClientError`: `.server(code:httpStatus:)` when the procedure threw, `.decoding` when the response no longer matches the generated types, and `.transport` otherwise. To keep your own networking, use `TRPCWire.request(for:input:baseURL:)` and `TRPCWire.output(of:from:httpStatus:)` directly. Subscriptions and batching are not supported.

### Agent skill

The package ships an [agent skill](https://agentskills.io) in `skills/trpc-swift`, so a coding agent knows how to regenerate the types and fix fallbacks. pnpm 12.11+ links it into the project's agent skill directories once you approve it with `pnpm approve`.

## Development

The development environment is provided by Nix. With [direnv](https://direnv.net/), `direnv allow` loads it; otherwise run `nix develop`. The shell installs the pnpm dependencies and the git hooks.

```sh
just test             # fixture tests; Swift compilation runs only where Xcode is installed
just update-fixtures  # regenerate tests/*/Output.swift
just check            # vp check: format, lint and type-check
just fmt
```

Each directory under `tests/` is a fixture: a `router.ts`, a `trpc-swift.json`, and the committed `Output.swift` the generator must reproduce.
