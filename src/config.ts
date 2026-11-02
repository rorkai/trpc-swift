import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import * as z from "zod/v4";

// Strict, so a misspelt key such as `routertype` fails instead of silently falling back to the default.
const configSchema = z
  .strictObject({
    $schema: z.string().optional().meta({ description: "JSON Schema for editor validation; ignored by the CLI." }),
    tsconfig: z.string().meta({ description: "tsconfig that type-checks the router, relative to this file." }),
    router: z.string().meta({ description: "Module exporting the router type, relative to this file." }),
    routerType: z.string().default("AppRouter").meta({ description: "Exported type name of the router." }),
    namespace: z.string().default("TRPC").meta({ description: "Swift enum that holds every generated procedure." }),
    output: z.string().meta({ description: "Generated Swift file, relative to this file." }),
    procedures: z
      .array(z.string().regex(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/))
      .min(1)
      .meta({ description: "Dotted procedure paths to generate, such as `projects.list`." }),
  })
  .meta({ title: "trpc-swift config" });

type TrpcSwiftConfig = z.infer<typeof configSchema>;

/** The config's JSON Schema, for the committed config-schema.json that editors validate against. */
export function configJsonSchema() {
  // The input side, so keys with a default stay optional as they are in the file.
  return z.toJSONSchema(configSchema, { io: "input" });
}

/** Reads a config file and resolves its paths against the file's directory. */
export async function loadConfig(configPath: string) {
  const absolutePath = resolve(configPath);
  const config = configSchema.parse(JSON.parse(await readFile(absolutePath, "utf8")));
  const base = dirname(absolutePath);
  return {
    ...config,
    tsconfig: resolve(base, config.tsconfig),
    router: resolve(base, config.router),
    output: resolve(base, config.output),
    procedures: [...new Set(config.procedures)],
  } satisfies TrpcSwiftConfig;
}
