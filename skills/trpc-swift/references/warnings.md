# Fixing `TRPCJSONValue` fallbacks

Each warning names the procedure, the location in its input or output, and a reason. Change the server's type so it has a Codable shape, regenerate, and confirm the warning is gone.

| Reason                                                 | Why Swift cannot express it                                                    | Fix on the server                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `object union without a string or boolean literal tag` | Swift decodes a union as an enum and needs a field that tells the cases apart. | Add a literal discriminant to every member, e.g. `kind: "image"` / `kind: "video"`.          |
| `mixed union …`                                        | Primitives and objects in one union have no common Codable form.               | Wrap the primitive in an object, or split the field in two.                                  |
| `any or unknown`                                       | Nothing to generate from.                                                      | Give the value a concrete type, often by annotating the resolver's return type or the field. |
| `tuple`                                                | Codable has no fixed-length heterogeneous arrays.                              | Return an object with named fields.                                                          |
| `recursive type`                                       | The generator stops at the first repetition.                                   | Accept the fallback, or flatten the structure (e.g. a list of nodes with parent ids).        |
| `Map (SuperJSON sends [key, value] pairs)`             | SuperJSON sends a Map as pairs that only its `meta` restores.                  | Return a plain object (`Record<string, T>`) or an array.                                     |
| `Error`, `function`, `never`                           | These never reach the client as data.                                          | Return the fields the client needs instead.                                                  |

Branded primitives (`string & { __brand: … }`), `Date`, `Set`, `bigint`, `RegExp` and `URL` are already handled and need no change.
