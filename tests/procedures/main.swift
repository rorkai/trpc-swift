import Foundation

// Decodes and encodes real wire JSON with the generated types; any failed check exits non-zero.
func check(_ condition: Bool, _ message: String) {
    if !condition {
        print("FAIL: \(message)")
        exit(1)
    }
}

let decoder = TRPCCoding.makeDecoder()
let encoder = TRPCCoding.makeEncoder()
encoder.outputFormatting = .sortedKeys

let profile = try decoder.decode(
    TRPC.User.Profile.Output.self,
    from: Data(#"{"id":"user_1","avatarUrl":null,"isSubscribed":true,"credits":12.5,"createdAt":"2026-11-01T13:35:49.493Z"}"#.utf8)
)
check(profile.bio == nil, "a missing optional key decodes as nil")
check(profile.createdAt.timeIntervalSince1970 == 1_793_540_149.493, "a SuperJSON date keeps its milliseconds")

let update = String(
    decoding: try encoder.encode(TRPC.Projects.Update.Input(projectId: "p", title: nil, clearedAt: nil)),
    as: UTF8.self
)
check(update == #"{"clearedAt":null,"projectId":"p","title":null}"#, "a required nullable key is sent as null, an optional one is left out: \(update)")

let list = String(decoding: try encoder.encode(TRPC.Projects.List.Input.none), as: UTF8.self)
check(list == "null", "an omitted optional input encodes as null: \(list)")
print("ok")
