---
'uniku': minor
'@uniku/cli': minor
---

**Added:** unified option names across generators.

- `uniku/uuid/v7` gains `counter` (inherited by `uniku/typeid`), matching `objectid`, `tsid`, and `xid`. The validation error code changes from `SEQUENCE_OUT_OF_RANGE` to `COUNTER_OUT_OF_RANGE`.
- `uniku/nanoid` gains `length`, matching `uniku/cuid/v2`. The validation error code changes from `SIZE_OUT_OF_RANGE` to `LENGTH_OUT_OF_RANGE`.

**Deprecated:** `seq` (uuid/v7) and `size` (nanoid). Both keep working unchanged until v1-rc, but combining either with its replacement throws `CONFLICTING_OPTIONS`:

```ts
// Before
uuidv7({ msecs, seq: 42 })
nanoid({ size: 10 })
// After
uuidv7({ msecs, counter: 42 })
nanoid({ length: 10 })
```

`typeid` validates the inherited options at its own boundary, so timestamp, counter, and random-bytes failures all report `strategy: 'typeid'` instead of leaking `strategy: 'uuid'` through delegation.

**Changed (`@uniku/cli`):** `uniku nanoid --size` is renamed to `--length` (alias `-l`), consistent with `uniku cuid --length`. The positional `nanoid(10)` shorthand in the library is unchanged.
