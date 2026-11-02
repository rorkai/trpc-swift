import { resolve } from "node:path";

import { generateFixture } from "../generate-fixture.ts";
import { canRunSwift, typeCheckSwift } from "../swift-compiler.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("generates the committed Swift", { timeout: 60_000 }, async () => {
  const { swift, warnings, outputPath } = await generateFixture(import.meta.dirname);

  await expect(swift).toMatchFileSnapshot(outputPath);
  // `"client": false` keeps the output to the types, with nothing from the HTTP client.
  expect(swift).not.toContain("TRPCClient");
  expect(swift).not.toContain("FoundationNetworking");
  expect(warnings).toEqual([
    { procedure: "unsupported.shapes", location: "output.tree.children[]", reason: "recursive type" },
    { procedure: "unsupported.shapes", location: "output.payload", reason: "any or unknown" },
    { procedure: "unsupported.shapes", location: "output.pair", reason: "tuple" },
  ]);
});

// real-time-wait: runs the Swift compiler as a child process.
test("the committed Swift compiles", { skip: !canRunSwift, timeout: 60_000 }, () => {
  expect(typeCheckSwift(resolve(import.meta.dirname, "Output.swift"))).toEqual({ status: 0, diagnostics: "" });
});
