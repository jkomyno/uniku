---
"uniku": patch
---

fix(uuid): let `uniku/uuid/v4` load in insecure browser contexts

`Crypto.randomUUID` is available only in secure contexts, while
`Crypto.getRandomValues` is not. The module captured
`globalThis.crypto.randomUUID.bind(...)` at module scope, so importing
`uniku/uuid/v4` over plain `http://` on a non-localhost origin threw
`TypeError: Cannot read properties of undefined (reading 'bind')` during module
evaluation. That also took down `toBytes`, `fromBytes`, and `isValid`, which do
not touch randomness at all.

The no-argument generator now uses `crypto.randomUUID()` when the runtime
provides it and otherwise falls back to the shared CSPRNG pool plus the local
formatter, so the entry point works on any origin.
