import { resolve } from "node:path";

import { generateFixture } from "../generate-fixture.ts";
import { canRunSwift, typeCheckSwift } from "../swift-compiler.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("follows a router split across modules, aliases, merges and lazy imports", { timeout: 60_000 }, async () => {
  const { swift, warnings, outputPath } = await generateFixture(import.meta.dirname);

  await expect(swift).toMatchFileSnapshot(outputPath);
  expect(warnings).toEqual([]);
});

// real-time-wait: runs the Swift compiler as a child process.
test("the committed Swift compiles", { skip: !canRunSwift, timeout: 60_000 }, () => {
  expect(typeCheckSwift(resolve(import.meta.dirname, "Output.swift"))).toEqual({ status: 0, diagnostics: "" });
});
