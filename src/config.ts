import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import * as z from "zod/v4";

// Strict, so a misspelt key such as `routertype` fails instead of silently falling back to the default.
const configSchema = z.strictObject({
  /** Lets a config point editors at its JSON Schema; the CLI ignores it. */
  $schema: z.string().optional(),
  /** tsconfig that type-checks the router, relative to the config file. */
  tsconfig: z.string(),
  /** Module exporting the router type, relative to the config file. */
  router: z.string(),
  routerType: z.string().default("AppRouter"),
  namespace: z.string().default("TRPC"),
  /** Generated Swift file, relative to the config file. */
  output: z.string(),
  procedures: z.array(z.string().regex(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/)).min(1),
});

type TrpcToSwiftConfig = z.infer<typeof configSchema>;

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
  } satisfies TrpcToSwiftConfig;
}
