import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { assertSupportedTrpc, SUPPORTED_TRPC_RANGE } from "../../src/trpc-version.ts";

/** A project directory whose node_modules holds an `@trpc/server` manifest of the given version. */
function projectWithTrpc(version: string | undefined) {
  const dir = mkdtempSync(join(tmpdir(), "trpc-to-swift-version-"));
  writeFileSync(join(dir, "package.json"), "{}");
  if (version != null) {
    const trpcDir = join(dir, "node_modules/@trpc/server");
    mkdirSync(trpcDir, { recursive: true });
    writeFileSync(join(trpcDir, "package.json"), JSON.stringify({ name: "@trpc/server", version }));
  }
  return dir;
}

test("the supported range is the declared peer dependency", () => {
  expect(SUPPORTED_TRPC_RANGE).toBe("^11.8.1");
});

test("accepts the tRPC the fixtures run on", () => {
  expect(() => assertSupportedTrpc(resolve(import.meta.dirname, ".."))).not.toThrow();
});

test.each(["10.45.4", "11.7.0", "12.0.0"])("rejects @trpc/server %s with the supported range", (version) => {
  expect(() => assertSupportedTrpc(projectWithTrpc(version))).toThrow(
    expect.objectContaining({ name: "UnsupportedTrpcVersionError", found: version, supported: "^11.8.1" }),
  );
});

test("says when the project has no @trpc/server at all", () => {
  expect(() => assertSupportedTrpc(projectWithTrpc(undefined))).toThrow(
    expect.objectContaining({ name: "UnsupportedTrpcVersionError", found: undefined }),
  );
});
