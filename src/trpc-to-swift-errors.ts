import { ErrorFactory } from "@praha/error-factory";

/** The probe that names each procedure's types failed to type-check, so its inferred types cannot be trusted. */
export class ProbeTypeCheckError extends ErrorFactory({
  name: "ProbeTypeCheckError",
  message: ({ diagnostics }) => `the router could not be type-checked:\n${diagnostics.join("\n")}`,
  fields: ErrorFactory.fields<{ diagnostics: readonly string[] }>(),
}) {}

/**
 * A type the checker could not resolve, such as one from a missing module or
 * declaration. Typing it as `TRPCJSONValue` would make the output depend on
 * which files the machine happens to have, so generation stops instead.
 */
export class UnresolvedTypeError extends ErrorFactory({
  name: "UnresolvedTypeError",
  message: ({ locations }) => `the checker could not resolve these types:\n${locations.join("\n")}`,
  fields: ErrorFactory.fields<{ locations: readonly string[] }>(),
}) {}

/**
 * The router project resolves no `@trpc/server`, or one outside the supported range. The generator reads tRPC's
 * internal router types, which change between majors, so it stops before they produce misleading errors.
 */
export class UnsupportedTrpcVersionError extends ErrorFactory({
  name: "UnsupportedTrpcVersionError",
  message: ({ found, supported, projectDir }) =>
    found == null
      ? `@trpc/server is not installed for ${projectDir}; trpc-to-swift supports ${supported}`
      : `@trpc/server ${found} is installed for ${projectDir}, but trpc-to-swift supports ${supported}`,
  fields: ErrorFactory.fields<{ found: string | undefined; supported: string; projectDir: string }>(),
}) {}
