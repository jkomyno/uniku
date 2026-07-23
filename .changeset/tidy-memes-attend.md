---
'uniku': minor
---

**Breaking (pre-v1):** Consolidate all timestamp validation error codes into a single strategy-agnostic `TIMESTAMP_OUT_OF_RANGE` code. Replaced codes:

- `UUID_TIMESTAMP_OUT_OF_RANGE` (uuid/v7)
- `ULID_TIMESTAMP_OUT_OF_RANGE` (ulid options) and `ULID_TIMESTAMP_OVERFLOW` (ulid decoding)
- `KSUID_TIMESTAMP_TOO_LOW` / `KSUID_TIMESTAMP_TOO_HIGH` (merged into one code)
- `OBJECTID_TIMESTAMP_OUT_OF_RANGE`
- `XID_TIMESTAMP_OUT_OF_RANGE`
- `TSID_TIMESTAMP_INVALID` / `TSID_TIMESTAMP_OUT_OF_RANGE` (merged into one code)

Errors now carry a `strategy` field (e.g. `{ strategy: 'ksuid' }`) that attributes the unified code to the generator that raised it. `InvalidInputError`, `ParseError`, and `BufferError` accept an optional third constructor argument `{ strategy?: IdGenerator }`, exposed on `UniqueIdError` as `readonly strategy?: IdGenerator`. `typeid` validates `msecs` at its own boundary, so its timestamp failures report `strategy: 'typeid'` instead of leaking `strategy: 'uuid'` through delegation.

Match on `_tag` (input vs parse failure) plus `code`, and use `strategy` when the generator matters:

```ts
try {
  ksuid({ secs: 0 })
} catch (error) {
  if (error instanceof InvalidInputError && error.code === 'TIMESTAMP_OUT_OF_RANGE') {
    console.error(error.strategy) // 'ksuid'
  }
}
```
