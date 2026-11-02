import { basename, dirname, join, relative } from "node:path";

import { serverFS } from "tsrs/fs";
import {
  API,
  SignatureKind,
  SymbolFlags,
  TypeFlags,
  type Checker,
  type Symbol as TsSymbol,
  type Type,
} from "tsrs/sync";

import type { ObjectWireType, ProcedureKind, TagValue, WireProcedure, WireType, WireWarning } from "./ir.ts";
import { ProbeTypeCheckError, UnresolvedTypeError } from "./trpc-swift-errors.ts";

export type ExtractOptions = {
  /** Absolute path of the tsconfig that type-checks the router module. */
  tsconfigPath: string;
  /** Absolute path of the module that exports the router type. */
  routerModulePath: string;
  /** Exported type name of the router, usually `AppRouter`. */
  routerTypeName: string;
  /** Dotted procedure paths such as `projects.list`. */
  procedures: readonly string[];
};

export type ExtractResult = {
  procedures: WireProcedure[];
  warnings: WireWarning[];
  /** Whether the router serialises through a transformer, which this generator takes to be SuperJSON. */
  transformer: boolean;
};

const PROBE_FILE_NAME = "__trpc_swift_probe__.ts";
const PROBE_TSCONFIG_NAME = "tsconfig.__trpc_swift_probe__.json";
const ROUTER_PROBE_NAME = "RouterProbe";
const TRANSFORMER_PROBE_NAME = "TransformerProbe";

const NULLISH = TypeFlags.Null | TypeFlags.Undefined | TypeFlags.Void;
const ABSENT = TypeFlags.Undefined | TypeFlags.Void;
const PRIMITIVE = TypeFlags.String | TypeFlags.Number | TypeFlags.Boolean | TypeFlags.BigInt;
const STRING_LIKE = TypeFlags.String | TypeFlags.StringLiteral | TypeFlags.TemplateLiteral | TypeFlags.StringMapping;
const NUMBER_LIKE = TypeFlags.Number | TypeFlags.NumberLiteral;
const BOOLEAN_LIKE = TypeFlags.Boolean | TypeFlags.BooleanLiteral;

/** SuperJSON sends a Set as an array of its values, so it decodes like one. */
const LIST_TYPES = new Set(["Array", "ReadonlyArray", "Set", "ReadonlySet"]);

/**
 * Resolves each procedure's input, output, and kind with the tsrs TypeScript 7
 * checker. Output types are inferred from the procedure implementations, so
 * no procedure needs an `.output()` schema.
 *
 * A virtual probe module next to the tsconfig names the types through
 * `inferRouterInputs`/`inferRouterOutputs`; nothing is written to disk.
 */
export function extractProcedures(options: ExtractOptions): ExtractResult {
  const projectDir = dirname(options.tsconfigPath);
  const probePath = join(projectDir, PROBE_FILE_NAME);
  const probeTsconfigPath = join(projectDir, PROBE_TSCONFIG_NAME);
  const probe = buildProbeSource(options, projectDir);
  const virtualFiles = new Map([
    [probePath, probe.source],
    [
      probeTsconfigPath,
      JSON.stringify({
        extends: `./${basename(options.tsconfigPath)}`,
        // The probe imports files the virtual `files` list does not name, which composite projects reject.
        compilerOptions: { composite: false, noEmit: true },
        files: [PROBE_FILE_NAME],
        include: [],
      }),
    ],
  ]);

  const api = new API({
    cwd: projectDir,
    fs: {
      readFile: (fileName) => virtualFiles.get(fileName) ?? serverFS.useOS,
      fileExists: (fileName) => (virtualFiles.has(fileName) ? true : serverFS.useOS),
      directoryExists: serverFS.useOS,
      getAccessibleEntries: serverFS.useOS,
      realpath: serverFS.useOS,
      stat: serverFS.useOS,
      writeFile: serverFS.useOS,
      removeFile: serverFS.useOS,
    },
  });
  using _ = { [Symbol.dispose]: () => api.close() };

  const project = api.createSnapshot({ openProjects: [probeTsconfigPath] }).getConfiguredProject(probeTsconfigPath);
  if (project == null) {
    throw new ProbeTypeCheckError({ diagnostics: [`could not open ${options.tsconfigPath}`] });
  }
  const diagnostics = project.program.getSemanticDiagnostics(probePath);
  if (diagnostics.length > 0) {
    const messages = diagnostics.map((diagnostic) => {
      const path = probe.procedureAt(diagnostic.pos);
      // Router types print in full and run to tens of kilobytes; the first clause names the problem.
      const text = diagnostic.text.split(/ on type '/)[0] ?? diagnostic.text;
      return path == null ? text : `${path}: ${text}`;
    });
    // Each probe line names a procedure three times, so one bad path reports three identical errors.
    throw new ProbeTypeCheckError({ diagnostics: [...new Set(messages)] });
  }

  const { checker } = project;
  const sourceFile = project.program.getSourceFile(probePath);
  const moduleSymbol = sourceFile == null ? undefined : checker.getSymbolAtLocation(sourceFile);
  const exported = new Map(
    (moduleSymbol == null ? [] : checker.getExportsOfModule(moduleSymbol)).map((symbol) => [
      symbol.name,
      checker.getDeclaredTypeOfSymbol(symbol),
    ]),
  );

  // A router type re-exported from a name that does not exist leaves the probe itself error-free: the diagnostic
  // belongs to the module that re-exports it, and every procedure type silently resolves to an error type.
  if (exported.get(ROUTER_PROBE_NAME)?.isErrorType() !== false) {
    const routerDiagnostics = project.program.getSemanticDiagnostics(options.routerModulePath).map((d) => d.text);
    throw new ProbeTypeCheckError({
      diagnostics: [
        `${options.routerTypeName} from ${relative(projectDir, options.routerModulePath)} does not resolve to a type`,
        ...routerDiagnostics,
      ],
    });
  }

  const warnings: WireWarning[] = [];
  const unresolved: string[] = [];
  const procedures = options.procedures.map((path, index): WireProcedure => {
    const typeOf = (name: string) => {
      const type = exported.get(`${name}${index}`);
      if (type == null) {
        throw new ProbeTypeCheckError({ diagnostics: [`probe is missing ${name}${index} for ${path}`] });
      }
      return type;
    };
    const converter = new WireTypeConverter(checker, {
      warn: (location, reason) => warnings.push({ procedure: path, location, reason }),
      unresolved: (location) => unresolved.push(`${path} ${location}`),
    });
    return {
      path,
      kind: procedureKind(typeOf("Kind")),
      input: converter.convert(typeOf("Input"), "input"),
      output: noValue(typeOf("Output")) ? { kind: "void" } : converter.convert(typeOf("Output"), "output"),
    };
  });

  if (unresolved.length > 0) {
    throw new UnresolvedTypeError({ locations: unresolved });
  }
  const transformerType = exported.get(TRANSFORMER_PROBE_NAME);
  // tRPC types the setting as `true` once `initTRPC.create({ transformer })` names one, else `false`.
  const transformer = transformerType?.isBooleanLiteralType() === true ? transformerType.value : true;
  return { procedures, warnings, transformer };
}

/** The probe module, and a lookup from a position in it back to the procedure whose line it falls on. */
function buildProbeSource(options: ExtractOptions, projectDir: string) {
  const routerImport = relative(projectDir, options.routerModulePath).replace(/\.tsx?$/, "");
  const specifier = routerImport.startsWith(".") ? routerImport : `./${routerImport}`;
  const header = [
    `import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";`,
    `import type { ${options.routerTypeName} as Router } from "${specifier}";`,
    `type Inputs = inferRouterInputs<Router>;`,
    `type Outputs = inferRouterOutputs<Router>;`,
    `type Procedures = Router["_def"]["record"];`,
    // A subscription's inferred output is the async iterable itself; a client handles one yielded message at a time.
    `type Message<T> = T extends AsyncIterable<infer M> ? M : T;`,
    `export type ${ROUTER_PROBE_NAME} = Router;`,
    `export type ${TRANSFORMER_PROBE_NAME} = Router["_def"]["_config"]["$types"]["transformer"];`,
  ];
  const procedureLines = options.procedures.map((path, index) => {
    const access = path
      .split(".")
      .map((segment) => `[${JSON.stringify(segment)}]`)
      .join("");
    return [
      `export type Input${index} = Inputs${access};`,
      `export type Kind${index} = Procedures${access}["_def"]["type"];`,
      `export type Output${index} = Kind${index} extends "subscription" ? Message<Outputs${access}> : Outputs${access};`,
    ].join(" ");
  });
  const source = `${[...header, ...procedureLines].join("\n")}\n`;
  const procedureAt = (position: number) => {
    const line = source.slice(0, position).split("\n").length - 1;
    return options.procedures[line - header.length];
  };
  return { source, procedureAt };
}

/**
 * An output of `never` carries no value: without a transformer tRPC's serialisation turns a
 * `void` result into `never`, as JSON has no `undefined`, and a resolver that always throws
 * infers it too. Either way the response has no data, which the client reads as `TRPCVoid`.
 */
function noValue(type: Type) {
  return (type.flags & TypeFlags.Never) !== 0;
}

function procedureKind(type: Type): ProcedureKind {
  const value = type.isStringLiteralType() ? type.value : undefined;
  if (value === "query" || value === "mutation" || value === "subscription") {
    return value;
  }
  throw new ProbeTypeCheckError({ diagnostics: [`unexpected procedure kind type`] });
}

type ConverterReport = {
  warn: (location: string, reason: string) => void;
  unresolved: (location: string) => void;
};

class WireTypeConverter {
  /** Type ids on the current path, so a recursive type becomes `json` instead of recursing forever. */
  private readonly visiting = new Set<number>();

  private readonly checker: Checker;
  private readonly report: ConverterReport;

  // Plain fields rather than parameter properties: Node's type stripping runs the CLI and rejects them.
  constructor(checker: Checker, report: ConverterReport) {
    this.checker = checker;
    this.report = report;
  }

  convert(type: Type, location: string): WireType {
    if (this.visiting.has(type.id)) {
      return this.unsupported(location, "recursive type");
    }
    this.visiting.add(type.id);
    const wire = this.convertUnvisited(type, location);
    this.visiting.delete(type.id);
    return wire;
  }

  private convertUnvisited(type: Type, location: string): WireType {
    const { flags } = type;
    if (type.isErrorType()) {
      this.report.unresolved(location);
      return { kind: "json" };
    }
    if (flags & (TypeFlags.Any | TypeFlags.Unknown)) {
      // `unknown` admits null and a missing key, so the Swift property must be optional to decode them.
      return optional(this.unsupported(location, "any or unknown"), true);
    }
    if (flags & TypeFlags.Never) {
      return this.unsupported(location, "never");
    }
    if (flags & NULLISH) {
      return { kind: "void" };
    }
    if (flags & BOOLEAN_LIKE) {
      return { kind: "boolean" };
    }
    if (flags & STRING_LIKE) {
      return { kind: "string" };
    }
    if (flags & NUMBER_LIKE) {
      return { kind: "number" };
    }
    // SuperJSON's json half carries a bigint as its decimal string.
    if (flags & (TypeFlags.BigInt | TypeFlags.BigIntLiteral)) {
      return { kind: "string", bigint: true };
    }
    if (type.isUnionType()) {
      return this.convertUnion(type.getTypes(), location);
    }
    if (type.isIntersectionType()) {
      // A branded primitive such as `string & { __brand: "ID" }` travels as the primitive alone.
      const primitive = type.getTypes().find((member) => member.flags & PRIMITIVE);
      return primitive == null ? this.convertObjectLike(type, location) : this.convert(primitive, location);
    }
    if (flags & TypeFlags.Object) {
      return this.convertObjectLike(type, location);
    }
    return this.unsupported(location, this.checker.typeToString(type));
  }

  private convertUnion(members: readonly Type[], location: string): WireType {
    const present = members.filter((member) => (member.flags & NULLISH) === 0);
    const inner = this.convertNonNullishUnion(present, location);
    if (present.length === members.length) {
      return inner;
    }
    return optional(
      inner,
      members.some((member) => member.flags & ABSENT),
    );
  }

  private convertNonNullishUnion(members: readonly Type[], location: string): WireType {
    const [first] = members;
    if (first == null) {
      return { kind: "void" };
    }
    if (members.length === 1) {
      return this.convert(first, location);
    }
    if (members.every((member) => member.flags & BOOLEAN_LIKE)) {
      return { kind: "boolean" };
    }
    if (members.every((member) => member.flags & NUMBER_LIKE)) {
      return { kind: "number" };
    }
    if (members.every((member) => member.flags & STRING_LIKE)) {
      const literals = members.flatMap((member) => (member.isStringLiteralType() ? [member.value] : []));
      return literals.length === members.length ? { kind: "stringEnum", values: literals } : { kind: "string" };
    }
    if (members.every((member) => member.flags & (TypeFlags.Object | TypeFlags.Intersection))) {
      return this.convertObjectUnion(members, location);
    }
    return this.unsupported(location, `mixed union ${members.map((m) => this.checker.typeToString(m)).join(" | ")}`);
  }

  /** Objects that share a property holding a distinct string literal in each member decode as a tagged enum. */
  private convertObjectUnion(members: readonly Type[], location: string): WireType {
    const tag = this.findTag(members);
    if (tag == null) {
      return this.unsupported(location, "object union without a string or boolean literal tag");
    }
    const variants = members.map((member) => {
      const tagValue = this.literalOfProperty(member, tag) ?? { kind: "string" as const, value: "" };
      const type = this.convertObjectLike(member, `${location}(${tag}=${String(tagValue.value)})`);
      return { tagValue, type: type.kind === "object" ? type : { kind: "object" as const, properties: [] } };
    });
    return { kind: "taggedUnion", tag, variants };
  }

  private findTag(members: readonly Type[]) {
    const [first] = members;
    if (first == null) {
      return undefined;
    }
    return this.checker
      .getPropertiesOfType(first)
      .map((property) => property.name)
      .find((name) => {
        const values = members.map((member) => this.literalOfProperty(member, name));
        const kinds = new Set(values.map((value) => value?.kind));
        // Every member needs a distinct literal of one kind: strings, or exactly `true` and `false`.
        return (
          values.every((value) => value != null) &&
          kinds.size === 1 &&
          new Set(values.map((value) => value?.value)).size === values.length
        );
      });
  }

  private literalOfProperty(type: Type, name: string) {
    const property = this.checker.getPropertyOfType(type, name);
    const propertyType = property == null ? undefined : this.checker.getTypeOfSymbol(property);
    if (propertyType?.isStringLiteralType()) {
      return { kind: "string", value: propertyType.value } satisfies TagValue;
    }
    if (propertyType?.isBooleanLiteralType()) {
      return { kind: "boolean", value: propertyType.value } satisfies TagValue;
    }
    return undefined;
  }

  private convertObjectLike(type: Type, location: string): WireType {
    const symbolName = type.getSymbol()?.name;
    // SuperJSON sends a Date as an ISO 8601 string in `json` and restores it from `meta`.
    if (symbolName === "Date") {
      return { kind: "date" };
    }
    // A tuple such as `[string, number]` is a reference to a generic tuple target, not a tuple type itself.
    if (type.isTupleType() || (type.isTypeReference() && type.getTarget().isTupleType())) {
      return this.unsupported(location, "tuple");
    }
    if (type.isTypeReference() && symbolName != null && LIST_TYPES.has(symbolName)) {
      const [element] = this.checker.getTypeArguments(type);
      return element == null
        ? this.unsupported(location, "list without element type")
        : {
            kind: "array",
            element: this.convert(element, `${location}[]`),
            ...(symbolName === "Set" || symbolName === "ReadonlySet" ? { set: true as const } : {}),
          };
    }
    // SuperJSON sends these as values its `meta` restores, so their own properties never reach JSON.
    if (symbolName === "Map" || symbolName === "ReadonlyMap") {
      return this.unsupported(location, "Map (SuperJSON sends [key, value] pairs)");
    }
    if (symbolName === "RegExp" || symbolName === "URL") {
      return { kind: "string" };
    }
    if (symbolName === "Error") {
      return this.unsupported(location, "Error");
    }

    const properties = this.checker.getPropertiesOfType(type);
    if (properties.length === 0) {
      const stringIndex = this.checker
        .getIndexInfosOfType(type)
        .find((info) => info.keyType.flags & (TypeFlags.String | TypeFlags.Number));
      if (stringIndex != null) {
        return { kind: "record", value: this.convert(stringIndex.valueType, `${location}{}`) };
      }
      if (this.checker.getSignaturesOfType(type, SignatureKind.Call).length > 0) {
        return this.unsupported(location, "function");
      }
    }
    return this.convertProperties(properties, location);
  }

  private convertProperties(properties: readonly TsSymbol[], location: string): ObjectWireType {
    const wireProperties = properties.flatMap((property) => {
      const propertyType = this.checker.getTypeOfSymbol(property);
      if (propertyType == null) {
        return [];
      }
      // JSON drops functions, so a method on a returned object never reaches the client.
      if (this.checker.getSignaturesOfType(propertyType, SignatureKind.Call).length > 0) {
        return [];
      }
      const omittable =
        (property.flags & SymbolFlags.Optional) !== 0 ||
        (propertyType.isUnionType() ? propertyType.getTypes() : [propertyType]).some((member) => member.flags & ABSENT);
      const type = this.convert(propertyType, `${location}.${property.name}`);
      if (type.kind === "void") {
        // A key that can only be undefined never reaches JSON. TypeScript adds one to each union member that lacks
        // the key, so keeping it would make the member's payload require a key the server never sends.
        // A key that can only be null still has to be sent as null.
        return omittable ? [] : [{ name: property.name, type: { kind: "optional" as const, inner: type, omittable } }];
      }
      return [{ name: property.name, type: omittable ? optional(type, true) : type }];
    });
    return { kind: "object", properties: wireProperties };
  }

  private unsupported(location: string, reason: string): WireType {
    this.report.warn(location, reason);
    return { kind: "json" };
  }
}

function optional(type: WireType, omittable: boolean): WireType {
  if (type.kind === "void") {
    return type;
  }
  if (type.kind === "optional") {
    return { ...type, omittable: type.omittable || omittable };
  }
  return { kind: "optional", inner: type, omittable };
}
