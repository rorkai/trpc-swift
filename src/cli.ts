#!/usr/bin/env node
/**
 * Generates Swift `Codable` types for tRPC procedures from the router's
 * inferred TypeScript types.
 *
 *   trpc-to-swift <config.json>          write the Swift file
 *   trpc-to-swift <config.json> --check  exit 1 when the committed file is stale
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename, relative } from "node:path";

import { cli, define } from "gunshi";
import { boolean, positional, required, string } from "gunshi/combinators";

import { loadConfig } from "./config.ts";
import { extractProcedures } from "./extract.ts";
import { generateSwift } from "./swift.ts";
import packageJson from "../package.json" with { type: "json" };

const command = define({
  name: "trpc-to-swift",
  description: "Generate Swift Codable types for tRPC procedures from the router's inferred TypeScript types",
  args: {
    config: required(positional(string({ description: "Path to a trpc-to-swift.json config" }))),
    check: boolean({ description: "Exit 1 instead of writing when the generated file is out of date" }),
  },
  run: async (ctx) => {
    const config = await loadConfig(ctx.values.config);
    const { procedures, warnings } = extractProcedures({
      tsconfigPath: config.tsconfig,
      routerModulePath: config.router,
      routerTypeName: config.routerType,
      procedures: config.procedures,
    });

    for (const warning of warnings) {
      console.warn(`warning: ${warning.procedure} ${warning.location}: ${warning.reason}; typed as TRPCJSONValue`);
    }

    const swift = generateSwift(procedures, {
      namespace: config.namespace,
      // The config's file name alone keeps the header the same whichever directory the CLI runs from.
      regenerateCommand: `trpc-to-swift ${basename(ctx.values.config)}`,
    });
    const outputPath = relative(process.cwd(), config.output);

    if (ctx.values.check !== true) {
      await writeFile(config.output, swift);
      console.log(`wrote ${outputPath} (${procedures.length} procedures)`);
      return;
    }
    const current = await readFile(config.output, "utf8").catch(() => "");
    if (current !== swift) {
      const cliPath = relative(process.cwd(), process.argv[1] ?? "trpc-to-swift");
      console.error(`${outputPath} is out of date; regenerate it with: node ${cliPath} ${ctx.values.config}`);
      process.exitCode = 1;
      return;
    }
    console.log(`${outputPath} is up to date (${procedures.length} procedures)`);
  },
});

await cli(process.argv.slice(2), command, {
  name: "trpc-to-swift",
  version: packageJson.version,
  renderHeader: null,
});
