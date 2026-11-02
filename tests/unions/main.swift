import Foundation

// Decodes and re-encodes real wire JSON with the generated types; any failed check exits non-zero.
func check(_ condition: Bool, _ message: String) {
    if !condition {
        print("FAIL: \(message)")
        exit(1)
    }
}

let decoder = TRPCCoding.makeDecoder()
let encoder = TRPCCoding.makeEncoder()
encoder.outputFormatting = .sortedKeys

let tagged = try decoder.decode(
    TRPC.Unions.Tagged.Output.self,
    from: Data(#"""
    {"balances":[
      {"name":"free","balance":1,"periodEndAt":"2026-11-01T13:35:49.493Z"},
      {"name":"pay-as-you-go-credit","balance":2},
      {"name":"added-later","balance":3}
    ],"event":{"kind":"closed"}}
    """#.utf8)
)
guard case let .free(free) = tagged.balances[0] else {
    check(false, "the free tag decodes as .free")
    exit(1)
}
check(free.balance == 1, "the payload keeps its fields")
check(tagged.balances[2] == .unknown(tag: "added-later"), "an unrecognised tag decodes as the fallback")
check(tagged.event == .unknown2(tag: "closed"), "a union with an \"unknown\" tag moves the fallback case")

let encodedBalance = String(decoding: try encoder.encode(tagged.balances[1]), as: UTF8.self)
check(encodedBalance == #"{"balance":2,"name":"pay-as-you-go-credit"}"#, "the case writes its own tag: \(encodedBalance)")

let roundTripped = try decoder.decode(TRPC.Unions.Tagged.Output.self, from: try encoder.encode(tagged))
check(roundTripped == tagged, "encoding then decoding gives back the same value")

let scalars = try decoder.decode(
    TRPC.Unions.Scalars.Output.self,
    from: Data(#"{"role":"owner","enabled":null,"size":2,"label":"plain"}"#.utf8)
)
check(scalars.role?.rawValue == "owner", "a string the client does not know still decodes")
check(scalars.enabled == nil, "null decodes as nil")
let booleanTagged = try decoder.decode(
    TRPC.Unions.BooleanTagged.Output.self,
    from: Data(#"{"result":{"ok":false,"error":"nope"}}"#.utf8)
)
guard case let .notOk(failure) = booleanTagged.result else {
    check(false, "ok: false decodes as .notOk")
    exit(1)
}
check(failure.error == "nope", "a boolean-tagged payload keeps its fields")
let encodedResult = String(decoding: try encoder.encode(booleanTagged.result), as: UTF8.self)
check(encodedResult == #"{"error":"nope","ok":false}"#, "the boolean tag is written from the case: \(encodedResult)")

let inferred = try decoder.decode(TRPC.Unions.InferredMembers.Output.self, from: Data(#"{"status":"no_saved_card"}"#.utf8))
guard case .no_saved_card = inferred else {
    check(false, "a member without the other members' keys still decodes")
    exit(1)
}
print("ok")
