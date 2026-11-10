---
"uniku": minor
---

Add `uniku/uuid/v5`, a name-based UUID (RFC 9562 section 5.5) that derives the same ID from the same name and namespace in every process and runtime. It is synchronous and dependency-free, follows the `uuid` package's `(name, namespace, buf?, offset?)` argument order, and adds `uuidv5.namespace()` to parse a namespace once, plus the `DNS`, `URL`, `OID`, and `X500` namespace constants.
