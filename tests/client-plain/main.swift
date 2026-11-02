import Foundation

// Calls a live tRPC server without a transformer through the generated client.
func check(_ condition: Bool, _ message: String) {
    if !condition {
        print("FAIL: \(message)")
        exit(1)
    }
}

let client = TRPCClient(baseURL: URL(string: ProcessInfo.processInfo.environment["TRPC_URL"]!)!)

let found = try await client.call(TRPC.Plain.Search.self, .init(q: "a+b c"))
check(found.q == "a+b c" && found.length == 5, "a plain JSON query round-trips: \(found)")

let renamed = try await client.call(TRPC.Plain.Rename.self, .init(id: "p1", title: "New"))
check(renamed.id == "p1" && renamed.title == "New", "a plain JSON mutation round-trips")

_ = try await client.call(TRPC.Plain.Noop.self)

do {
    _ = try await client.call(TRPC.Plain.Forbidden.self)
    check(false, "a throwing procedure throws")
} catch let error as TRPCClientError {
    guard case let .server(code, httpStatus) = error.reason else {
        check(false, "a procedure error is a server error: \(error)")
        exit(1)
    }
    check(code == "FORBIDDEN" && httpStatus == 403, "the tRPC error code and status: \(error)")
}
print("ok")
