import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { satisfies } from "semver";

import packageJson from "../package.json" with { type: "json" };
import { UnsupportedTrpcVersionError } from "./trpc-to-swift-errors.ts";

/** The `@trpc/server` range the peer dependency declares, so the check and the manifest cannot drift apart. */
export const SUPPORTED_TRPC_RANGE = packageJson.peerDependencies["@trpc/server"];

/** Fails unless the project at `projectDir` resolves an `@trpc/server` within {@link SUPPORTED_TRPC_RANGE}. */
export function assertSupportedTrpc(projectDir: string) {
  const found = installedTrpcVersion(projectDir);
  if (found == null || !satisfies(found, SUPPORTED_TRPC_RANGE, { includePrerelease: true })) {
    throw new UnsupportedTrpcVersionError({ found, supported: SUPPORTED_TRPC_RANGE, projectDir });
  }
}

function installedTrpcVersion(projectDir: string) {
  // Resolved from the router's project, where the probe's `import "@trpc/server"` resolves too.
  const require = createRequire(join(projectDir, "package.json"));
  try {
    const manifest: unknown = JSON.parse(readFileSync(require.resolve("@trpc/server/package.json"), "utf8"));
    return typeof manifest === "object" &&
      manifest != null &&
      "version" in manifest &&
      typeof manifest.version === "string"
      ? manifest.version
      : undefined;
  } catch {
    return undefined;
  }
}
