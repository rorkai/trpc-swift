import { resolve } from "node:path";

import { generateFixture } from "../generate-fixture.ts";
import { canRunSwift, typeCheckSwift } from "../swift-compiler.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("generates the committed Swift", { timeout: 60_000 }, async () => {
  const { swift, warnings, outputPath } = await generateFixture(import.meta.dirname);

  await expect(swift).toMatchFileSnapshot(outputPath);
  expect(warnings).toEqual([
    { procedure: "builtins.values", location: "output.counts", reason: "Map (SuperJSON sends [key, value] pairs)" },
  ]);
});

// real-time-wait: runs the Swift compiler as a child process.
test("the committed Swift compiles", { skip: !canRunSwift, timeout: 60_000 }, () => {
  expect(typeCheckSwift(resolve(import.meta.dirname, "Output.swift"))).toEqual({ status: 0, diagnostics: "" });
});
