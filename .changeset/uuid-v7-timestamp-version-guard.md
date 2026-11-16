---
"uniku": minor
---

fix(uuid): make `uuidv7.timestamp()` reject values that are not UUID v7

`uuidv7.timestamp()` parsed its argument with the version-agnostic byte codec, so
passing a UUID v4 or v5 returned the first six random bytes as a plausible-looking
creation time. It now requires the RFC 9562 version 7 and `10xx` variant bits, and
throws `InvalidInputError` with code `UUID_NOT_V7` otherwise, matching
`typeid.timestamp()`. The `NIL` and `MAX` sentinels keep working, since RFC 9562
defines them without a version.

`UUID_NOT_V7` now reports both `uuid` and `typeid` as strategies.

The shared `isUuidVersion7` and `isNilOrMaxBytes` predicates live in
`uuid/common/uuid.ts` so the UUID and TypeID readers cannot drift apart again.

`toBytes()` is unchanged and still accepts any 128-bit UUID form, the way
`uuid.parse()` does: it is a byte codec, not a version guard. Its JSDoc now says so
explicitly, because `isValid()` is version-specific.
