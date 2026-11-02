<div align="centre">
    <a href="https://rork.com">
        <picture>
            <source media="(prefers-colour-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/rorkai/trpc-swift@main/docs/rork-logo-white.svg">
            <img src="https://cdn.jsdelivr.net/gh/rorkai/trpc-swift@main/docs/rork-logo-dark.svg" alt="Rork logo" width="186" height="46">
        </picture>
    </a>
    <h1>trpc-swift</h1>
</div>

<p align="centre">
    <a href="https://socket.dev/npm/package/@rork-ai/trpc-swift"><img src="https://socket.dev/api/badge/npm/package/@rork-ai/trpc-swift" alt="Socket Badge" /></a>
    <a href="https://npmjs.com/package/@rork-ai/trpc-swift"><img src="https://img.shields.io/npm/v/@rork-ai/trpc-swift?color=yellow" alt="npm version" /></a>
    <a href="https://tanstack.com/stats/npm?packageGroups=%5B%7B%22packages%22:%5B%7B%22name%22:%22@rork-ai/trpc-swift%22%7D%5D%7D%5D&range=30-days&transform=none&binType=daily&showDataMode=all&height=400"><img src="https://img.shields.io/npm/dt/@rork-ai/trpc-swift" alt="NPM Downloads" /></a>
    <a href="https://github.com/rorkai/trpc-swift/actions/workflows/ci.yaml"><img src="https://github.com/rorkai/trpc-swift/actions/workflows/ci.yaml/badge.svg" alt="CI" /></a>
    <a href="https://deepwiki.com/rorkai/trpc-swift"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

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

Every pull request and every commit on `main` is also published as a preview through [pkg.pr.new](https://pkg.pr.new/~/rorkai/trpc-swift), so an unreleased fix can be tried before it reaches npm. The pull request's pkg.pr.new comment gives the `npx` command that runs it.

### What is generated

- One namespace per router, with `Input` / `Output` types per procedure
- SuperJSON-aware scalars: `Date`, `Set` (as arrays), `bigint`, branded primitives
- String and boolean literal unions as enums; tagged object unions as enums with associated values
- Shapes Swift cannot represent (recursive types, `unknown`, tuples, untagged unions, `Map`) fall back to `TRPCJSONValue` with a warning

### Generated client

The generated file includes `TRPCClient`, which sends each procedure with tRPC's HTTP wire format: a query as a GET with `?input=`, a mutation as a POST. With a SuperJSON router it adds the `meta` that restores `Date`, `Set` and `bigint` inputs on the server, as the TypeScript client does.

```swift
let client = TRPCClient(baseURL: URL(string: "https://api.example.com/trpc")!) { request in
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}
let projects = try await client.call(TRPC.Projects.List.self, .init(limit: 20))
```

A failed call throws `TRPCClientError`: `.server(code:httpStatus:)` when the procedure threw, `.decoding` when the response no longer matches the generated types, and `.transport` otherwise. To keep your own networking, use `TRPCWire.request(for:input:baseURL:)` and `TRPCWire.output(of:from:httpStatus:)` directly, or set `"client": false` to generate the types alone. Subscriptions and batching are not supported.

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
