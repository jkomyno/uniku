---
"uniku": minor
---

`typeid.fromUuid()`, `typeid.fromBytes()`, `typeid.toUuid()`, `typeid.toBytes()`, `typeid.prefix()`, `typeid.suffix()`, and `typeid.isValid()` now accept a TypeID or UUID of any version, as the TypeID specification recommends, so `typeid.fromUuid('tool', uuidv5(name, namespace))` gives a deterministic TypeID. `typeid()` still generates UUID v7. `typeid.timestamp()` is now the only function that throws `UUID_NOT_V7`, for a TypeID that does not wrap a UUID v7. `typeid.fromUuid()` with a string that is not a UUID now throws a `ParseError` (`INVALID_LENGTH`, `INVALID_FORMAT`, or `INVALID_CHAR`) instead of `UUID_NOT_V7`.
