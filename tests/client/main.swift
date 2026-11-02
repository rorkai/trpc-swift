import Foundation

// Calls a live tRPC server through the generated client; any failed check exits non-zero.
func check(_ condition: Bool, _ message: String) {
    if !condition {
        print("FAIL: \(message)")
        exit(1)
    }
}

let client = TRPCClient(baseURL: URL(string: ProcessInfo.processInfo.environment["TRPC_URL"]!)!) { request in
    request.setValue("trpc-swift-test", forHTTPHeaderField: "X-Client")
}

let greeting = try await client.call(TRPC.Client.Greeting.self)
check(greeting == "hello", "a query without input: \(greeting)")

let query = "a+b c&d=e/é"
let echoed = try await client.call(TRPC.Client.Search.self, .init(q: query))
check(echoed == query, "a query input keeps +, spaces and & intact: \(echoed)")

let at = Date(timeIntervalSince1970: 1_700_000_000.123)
let restored = try await client.call(
    TRPC.Client.Restored.self,
    .init(
        at: at,
        items: [.init(at: at), .init(at: at)],
        tags: ["a", "b", "a"],
        count: "41",
        until: nil,
        byId: ["x": at, "y": at]
    )
)
// SuperJSON carries milliseconds, so the date comes back equal to the millisecond.
check(abs(restored.at.timeIntervalSince(at)) < 0.001, "a Date input comes back as the same Date: \(restored.at)")
check(restored.itemsAreDates, "dates inside an array are restored")
check(restored.tagCount == 2, "a set is restored, dropping the duplicate: \(restored.tagCount)")
check(restored.countPlusOne == "42", "a bigint is restored: \(restored.countPlusOne)")
check(restored.untilIsNull, "a null date stays null")
check(restored.byIdAreDates, "dates inside a record are restored")

let anonymous = try await client.call(TRPC.Client.OptionalInput.self, nil)
check(anonymous == "anonymous", "an omitted optional input arrives as undefined: \(anonymous)")
let named = try await client.call(TRPC.Client.OptionalInput.self, .init(name: "Ada"))
check(named == "Ada", "a present optional input arrives: \(named)")

let renamed = try await client.call(TRPC.Client.Rename.self, .init(id: "p1", title: nil))
check(renamed.id == "p1" && renamed.title == nil, "a mutation with a required null sends it")

_ = try await client.call(TRPC.Client.Noop.self)

do {
    _ = try await client.call(TRPC.Client.Forbidden.self)
    check(false, "a throwing procedure throws")
} catch let error as TRPCClientError {
    guard case let .server(code, httpStatus) = error.reason else {
        check(false, "a procedure error is a server error: \(error)")
        exit(1)
    }
    check(code == "FORBIDDEN" && httpStatus == 403 && error.message == "not yours", "the tRPC error code, status and message: \(error)")
}
print("ok")
