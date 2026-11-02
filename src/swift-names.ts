const SWIFT_KEYWORDS = new Set([
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "private",
  "precedencegroup",
  "protocol",
  "public",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  "break",
  "case",
  "catch",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "repeat",
  "return",
  "throw",
  "switch",
  "where",
  "while",
  "Any",
  "as",
  "await",
  "false",
  "is",
  "nil",
  "self",
  "Self",
  "super",
  "throws",
  "true",
  "try",
  "Type",
  "Protocol",
]);

function words(raw: string) {
  return raw
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0);
}

function capitalise(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function guardLeadingDigit(name: string) {
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

/** `pay-as-you-go-credit` → `PayAsYouGoCredit`. */
export function typeName(raw: string) {
  const name = guardLeadingDigit(words(raw).map(capitalise).join(""));
  return name.length === 0 ? "Value" : name;
}

/** `pay-as-you-go-credit` → `payAsYouGoCredit`; keeps an already valid camelCase key as it is. */
export function memberName(raw: string) {
  if (/^[a-z_][A-Za-z0-9_]*$/.test(raw)) {
    return escapeKeyword(raw);
  }
  const [first = "value", ...rest] = words(raw);
  return escapeKeyword(
    guardLeadingDigit(first.charAt(0).toLowerCase() + first.slice(1) + rest.map(capitalise).join("")),
  );
}

/**
 * Names that still mean something special inside backticks: an `init`
 * parameter named `self` hides the instance, so these get a suffix instead.
 */
const SHADOWING_NAMES = new Set(["self", "Self", "super", "init", "Type", "Protocol"]);

function escapeKeyword(name: string) {
  if (SHADOWING_NAMES.has(name)) {
    return `${name}Value`;
  }
  return SWIFT_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

/** Names the element type of an array property: `items` → `Item`, `entries` → `Entry`, `data` → `DataItem`. */
export function elementTypeName(propertyTypeName: string) {
  if (propertyTypeName.endsWith("ies")) {
    return `${propertyTypeName.slice(0, -3)}y`;
  }
  if (propertyTypeName.endsWith("s") && !propertyTypeName.endsWith("ss")) {
    return propertyTypeName.slice(0, -1);
  }
  return `${propertyTypeName}Item`;
}

/** Swift string literal for a wire key or tag value. */
export function swiftString(value: string) {
  return JSON.stringify(value);
}
