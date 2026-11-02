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
