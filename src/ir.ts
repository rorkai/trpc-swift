/** The JSON shape of a tRPC input or output, reduced to what Swift `Codable` can express. */
export type WireType =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "date" }
  | { kind: "void" }
  | { kind: "json" }
  | { kind: "stringEnum"; values: readonly string[] }
  | { kind: "array"; element: WireType }
  | { kind: "record"; value: WireType }
  /**
   * `null` or a missing key. `omittable` is false for `T | null`, whose key must
   * still be sent: a required nullable input rejects a body without it.
   */
  | { kind: "optional"; inner: WireType; omittable: boolean }
  | ObjectWireType
  | TaggedUnionWireType;

export type ObjectWireType = { kind: "object"; properties: readonly WireProperty[] };

type WireProperty = { name: string; type: WireType };

export type TaggedUnionWireType = {
  kind: "taggedUnion";
  tag: string;
  variants: readonly { tagValue: TagValue; type: ObjectWireType }[];
};

/** String tags allow an unknown fallback; a boolean tag has exactly a `true` and a `false` variant. */
export type TagValue = { kind: "string"; value: string } | { kind: "boolean"; value: boolean };

export type ProcedureKind = "query" | "mutation" | "subscription";

export type WireProcedure = {
  path: string;
  kind: ProcedureKind;
  input: WireType;
  output: WireType;
};

/** A type the generator could not express and replaced with `json`, reported so the gap is visible. */
export type WireWarning = { procedure: string; location: string; reason: string };
