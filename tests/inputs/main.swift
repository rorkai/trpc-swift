import Foundation

// Encodes inputs the way a client sends them; any failed check exits non-zero.
func check(_ condition: Bool, _ message: String) {
    if !condition {
        print("FAIL: \(message)")
        exit(1)
    }
}

let encoder = TRPCCoding.makeEncoder()
encoder.outputFormatting = .sortedKeys

func json<T: Encodable>(_ value: T) throws -> String {
    String(decoding: try encoder.encode(value), as: UTF8.self)
}

let defaults = try json(TRPC.Inputs.Defaults.Input())
check(defaults == "{}", "keys with a server-side default are left out: \(defaults)")

let sorted = try json(TRPC.Inputs.Defaults.Input(sort: .oldest))
check(sorted == #"{"sort":"oldest"}"#, "a set default key is sent: \(sorted)")

let transformed = try json(TRPC.Inputs.Transforms.Input(count: "3"))
check(transformed == #"{"count":"3"}"#, "a transformed key is sent as the schema's input type: \(transformed)")

let nested = try json(
    TRPC.Inputs.Nested.Input(
        filter: .init(from: Date(timeIntervalSince1970: 0), to: nil),
        items: [.init(id: "a", quantity: 2)],
        metadata: ["k": "v"]
    )
)
check(
    nested == #"{"filter":{"from":"1970-01-01T00:00:00.000Z","to":null},"items":[{"id":"a","quantity":2}],"metadata":{"k":"v"}}"#,
    "nested inputs encode dates as ISO 8601 and send a required nullable key as null: \(nested)"
)

let email = try json(TRPC.Inputs.Discriminated.Input.email(.init(address: "a@example.com")))
check(email == #"{"address":"a@example.com","type":"email"}"#, "a tagged input writes its tag: \(email)")

let primitive = try json("hello" as TRPC.Inputs.Primitive.Input)
check(primitive == #""hello""#, "a primitive input encodes as itself: \(primitive)")
print("ok")
