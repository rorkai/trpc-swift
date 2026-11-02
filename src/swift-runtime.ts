/** Support types every generated file declares once, ahead of the procedures. */
export const SWIFT_RUNTIME = `public enum TRPCProcedureKind: Sendable {
    case query
    case mutation
    case subscription
}

/// A tRPC procedure: its path on the router, and the JSON shapes it accepts and returns.
public protocol TRPCProcedure {
    associatedtype Input: Encodable & Sendable
    associatedtype Output: Decodable & Sendable
    static var path: String { get }
    static var kind: TRPCProcedureKind { get }
}

/// The input of a procedure that takes none, or the output of one that returns nothing.
public struct TRPCVoid: Codable, Hashable, Sendable {
    public init() {}

    public init(from decoder: any Decoder) throws {}

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encodeNil()
    }
}

/// A value whose TypeScript type has no Codable equivalent, such as \`unknown\`, a tuple, or an untagged union.
public enum TRPCJSONValue: Codable, Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([TRPCJSONValue])
    case object([String: TRPCJSONValue])

    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([TRPCJSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: TRPCJSONValue].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case let .bool(value): try container.encode(value)
        case let .number(value): try container.encode(value)
        case let .string(value): try container.encode(value)
        case let .array(value): try container.encode(value)
        case let .object(value): try container.encode(value)
        }
    }
}

/// Coders for the \`json\` half of a SuperJSON payload, where a Date travels as an ISO 8601 string with milliseconds.
public enum TRPCCoding {
    public static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(string) {
                return date
            }
            return try Date.ISO8601FormatStyle().parse(string)
        }
        return decoder
    }

    public static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(date.formatted(Date.ISO8601FormatStyle(includingFractionalSeconds: true)))
        }
        return encoder
    }
}`;
