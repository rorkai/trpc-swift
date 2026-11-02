import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Locates SDKs through xcode-select rather than `xcrun --show-sdk-path`, which fails in sandboxed shells.
function sdkPath(platform: "iPhoneSimulator" | "MacOSX") {
  if (process.platform !== "darwin") {
    return undefined;
  }
  const developerDir = spawnSync("xcode-select", ["-p"], { encoding: "utf8" }).stdout?.trim() ?? "";
  const path = join(developerDir, `Platforms/${platform}.platform/Developer/SDKs/${platform}.sdk`);
  return existsSync(path) ? path : undefined;
}

const iosSdk = sdkPath("iPhoneSimulator");
const macSdk = sdkPath("MacOSX");

/** Whether this machine has Xcode's Swift toolchain and SDKs. */
export const canRunSwift = iosSdk != null && macSdk != null;

// swiftc resolves its default SDK from SDKROOT, which can point at a stale SDK in a developer shell.
const { SDKROOT: _, ...env } = process.env;

function swiftc(args: readonly string[]) {
  const result = spawnSync("swiftc", ["-swift-version", "6", ...args], { encoding: "utf8", env });
  return { status: result.status, diagnostics: result.stderr };
}

/** Type-checks one Swift file for iOS in Swift 6 language mode. */
export function typeCheckSwift(file: string) {
  return swiftc(["-target", "arm64-apple-ios17.0-simulator", "-sdk", iosSdk ?? "", "-typecheck", file]);
}

/**
 * Builds the files into a macOS executable and runs it, so a test can decode
 * and encode real JSON with the generated types. One file must be `main.swift`.
 */
export function runSwift(files: readonly string[]) {
  const binary = join(mkdtempSync(join(tmpdir(), "trpc-swift-")), "main");
  const build = swiftc(["-target", "arm64-apple-macos14.0", "-sdk", macSdk ?? "", "-o", binary, ...files]);
  if (build.status !== 0) {
    return { status: build.status, output: build.diagnostics };
  }
  const run = spawnSync(binary, { encoding: "utf8", env });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

/**
 * Like {@link runSwift}, but runs the program without blocking the event loop, so it can call a
 * server the test itself serves. `extraEnv` reaches the program, e.g. the server's URL.
 */
export async function runSwiftAsync(files: readonly string[], extraEnv: Record<string, string>) {
  const binary = join(mkdtempSync(join(tmpdir(), "trpc-swift-")), "main");
  const build = swiftc(["-target", "arm64-apple-macos14.0", "-sdk", macSdk ?? "", "-o", binary, ...files]);
  if (build.status !== 0) {
    return { status: build.status, output: build.diagnostics };
  }
  return await new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(binary, { env: { ...env, ...extraEnv } });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, output }));
  });
}
