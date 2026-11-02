import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cliPath = resolve(import.meta.dirname, "../../src/cli.ts");
const testsDir = resolve(import.meta.dirname, "..");

/** Writes a config into a fresh directory outside the repository, pointing back at a fixture router. */
function setUp(fixture: string, procedures: readonly string[], extra: Record<string, unknown> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "trpc-to-swift-cli-"));
  const configPath = join(dir, "trpc-to-swift.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      tsconfig: join(testsDir, "tsconfig.json"),
      router: join(testsDir, fixture, "router.ts"),
      // Relative paths resolve against the config file, not the working directory.
      output: "./Generated.swift",
      procedures,
      ...extra,
    }),
  );
  return { dir, configPath, outputPath: join(dir, "Generated.swift") };
}

function run(args: readonly string[], cwd: string) {
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// real-time-wait: each case spawns the CLI, which spawns the TypeScript 7 checker.
describe("trpc-to-swift CLI", { timeout: 60_000 }, () => {
  test("writes the Swift file next to the config, whatever the working directory", () => {
    const { configPath, outputPath } = setUp("procedures", ["projects.list", "health.ping"]);

    const result = run([configPath], tmpdir());

    expect(result).toMatchObject({ status: 0, stdout: expect.stringContaining("(2 procedures)") });
    expect(readFileSync(outputPath, "utf8")).toContain('public static let path = "projects.list"');
  });

  test("--check passes when the committed file is current and fails once it drifts", () => {
    const { dir, configPath, outputPath } = setUp("procedures", ["projects.list"]);
    run([configPath], dir);

    expect(run([configPath, "--check"], dir)).toMatchObject({
      status: 0,
      stdout: expect.stringContaining("is up to date"),
    });

    writeFileSync(outputPath, `${readFileSync(outputPath, "utf8")}// edited by hand\n`);
    const stale = run([configPath, "--check"], dir);
    expect(stale).toMatchObject({ status: 1, stderr: expect.stringContaining("is out of date") });
    // --check never rewrites the file it compares.
    expect(readFileSync(outputPath, "utf8")).toContain("// edited by hand");
  });

  test("--check fails when the output file does not exist yet", () => {
    const { dir, configPath } = setUp("procedures", ["projects.list"]);

    expect(run([configPath, "--check"], dir)).toMatchObject({ status: 1 });
  });

  test("prints a warning for each shape it falls back to TRPCJSONValue for", () => {
    const { dir, configPath } = setUp("unsupported", ["unsupported.shapes"]);

    const result = run([configPath], dir);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(
      "warning: unsupported.shapes output.payload: any or unknown; typed as TRPCJSONValue",
    );
  });

  test("rejects a config without procedures", () => {
    const { dir, configPath } = setUp("procedures", []);

    expect(run([configPath], dir)).toMatchObject({ status: 1, stderr: expect.stringContaining("procedures") });
  });

  test("rejects a misspelt key instead of falling back to its default", () => {
    const { dir, configPath } = setUp("procedures", ["projects.list"], { routertype: "ApiRouter" });

    expect(run([configPath], dir)).toMatchObject({ status: 1, stderr: expect.stringContaining("routertype") });
  });

  test("accepts the $schema key that editors use", () => {
    const { dir, configPath } = setUp("procedures", ["projects.list"], { $schema: "./config-schema.json" });

    expect(run([configPath], dir).status).toBe(0);
  });
});
