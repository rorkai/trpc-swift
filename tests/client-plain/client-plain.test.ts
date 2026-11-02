import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { createHTTPServer } from "@trpc/server/adapters/standalone";

import { generateFixture } from "../generate-fixture.ts";
import { canRunSwift, runSwiftAsync, typeCheckSwift } from "../swift-compiler.ts";
import { appRouter } from "./router.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("generates the client for a router without a transformer", { timeout: 60_000 }, async () => {
  const { swift, warnings, outputPath } = await generateFixture(import.meta.dirname);

  await expect(swift).toMatchFileSnapshot(outputPath);
  expect(swift).toContain("public static let superJSON = false");
  expect(warnings).toEqual([]);
});

// real-time-wait: runs the Swift compiler as a child process.
test("the committed Swift compiles", { skip: !canRunSwift, timeout: 60_000 }, () => {
  expect(typeCheckSwift(resolve(import.meta.dirname, "Output.swift"))).toEqual({ status: 0, diagnostics: "" });
});

// real-time-wait: builds a Swift program and runs it against a tRPC server on a local port.
test(
  "the generated client calls a live router without a transformer",
  { skip: !canRunSwift, timeout: 180_000 },
  async () => {
    const server = createHTTPServer({ router: appRouter });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      const { port } = server.address() as AddressInfo;
      const result = await runSwiftAsync(
        [resolve(import.meta.dirname, "Output.swift"), resolve(import.meta.dirname, "main.swift")],
        { TRPC_URL: `http://127.0.0.1:${port}` },
      );
      expect(result).toEqual({ status: 0, output: "ok\n" });
    } finally {
      await new Promise((done) => server.close(done));
    }
  },
);
