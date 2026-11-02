import { resolve } from "node:path";

import { loadConfig } from "../src/config.ts";
import { extractProcedures } from "../src/extract.ts";
import { generateSwift } from "../src/swift.ts";

/** Runs the generator on `<fixture>/trpc-to-swift.json` the way the CLI does. */
export async function generateFixture(fixtureDir: string) {
  const config = await loadConfig(resolve(fixtureDir, "trpc-to-swift.json"));
  const { procedures, warnings } = extractProcedures({
    tsconfigPath: config.tsconfig,
    routerModulePath: config.router,
    routerTypeName: config.routerType,
    procedures: config.procedures,
  });
  const swift = generateSwift(procedures, {
    namespace: config.namespace,
    regenerateCommand: "trpc-to-swift trpc-to-swift.json",
  });
  return { swift, warnings, outputPath: config.output };
}
