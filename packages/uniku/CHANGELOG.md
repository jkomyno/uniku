# uniku

## 0.5.0

### Minor Changes

- 55b9e06: **Added:** unified `msecs` timestamp option for `uniku/ksuid`, `uniku/objectid`, and `uniku/xid`. Every time-ordered generator now takes milliseconds since the Unix epoch, matching `uuid/v7`, `ulid`, `tsid`, `typeid`, and the value returned by every `.timestamp()` reader. Second-precision formats truncate sub-second precision (`Math.floor(msecs / 1000)`), so the maximum expressible timestamp gains `+999ms` of headroom.

  **Deprecated:** the `secs` option in those three generators. It keeps working unchanged until v1-rc, but passing both `msecs` and `secs` now throws `CONFLICTING_OPTIONS`. Migrate by multiplying existing values by 1000:

  ```ts
  // Before
  ksuid({ secs: 1_500_000_000 });
  // After
  ksuid({ msecs: 1_500_000_000_000 });
  ```

  **Changed (`@uniku/cli`):** `--timestamp` for `ksuid`, `objectid`, and `xid` now expects milliseconds, consistent with `ulid` and `tsid` (`uniku ksuid --timestamp 1720000000000`). This is a behavioral break for CLI invocations that passed seconds.

- 854a45a: **Breaking (pre-v1):** Consolidate all timestamp validation error codes into a single strategy-agnostic `TIMESTAMP_OUT_OF_RANGE` code. Replaced codes:

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
    ksuid({ secs: 0 });
  } catch (error) {
    if (
      error instanceof InvalidInputError &&
      error.code === "TIMESTAMP_OUT_OF_RANGE"
    ) {
      console.error(error.strategy); // 'ksuid'
    }
  }
  ```

## 0.4.3

### Patch Changes

- c9afba0: Refresh the npm package READMEs to foreground benchmark performance and the full ten-strategy API shared by the library and CLI.

## 0.4.2

### Patch Changes

- cc16323: Replace duplicated package README reference material with concise getting-started guidance and prominent links to the maintained documentation site.

## 0.4.1

### Patch Changes

- d50c21d: Speed up default Nanoid and XID generation with bounded encoded-character caching.

## 0.4.0

### Minor Changes

- 982d7a0: Add an rs/xid-compatible XID generator with CLI support, runtime coverage, and documentation.

## 0.3.2

### Patch Changes

- dd253f4: Document the public API surface with JSDoc: every overload, method, and options field now carries a description in the published type declarations.

## 0.3.1

### Patch Changes

- bc80313: Enforce the documented v1 input boundaries: numeric options and buffer offsets must be finite integers in range, `fromBytes()` requires each format's exact byte length, UUID v4 preserves caller-owned random bytes, and TSID conversions reject values outside the unsigned 64-bit range.

## 0.3.0

### Minor Changes

- c6ebcb2: Add `uniku/tsid`, a Snowflake-style 64-bit Time-Sorted Unique Identifier generator: a 42-bit millisecond timestamp, a configurable node ID (default 10 bits), and a per-millisecond counter, packed into a `bigint` — this library's first non-string primary type, reflecting TSID's value proposition as a native numeric ID (e.g. a database `BIGINT` primary key). Includes `toBytes`/`fromBytes`/`toString`/`fromString`/`timestamp`/`isValid` support and cross-validation against the `tsid-ts` npm package.
- a4d4bf5: Add two new entry points:

  - `uniku/generators` exports `ID_GENERATORS` (the canonical ordered list of the 8 supported ID generators) and its derived `IdGenerator` union — a single source of truth for the set of supported generators.
  - `uniku/cuid/v2` exports the CUID2 generator as `cuidv2`, mirroring the versioned-subpath convention of `uniku/uuid/v4` / `uniku/uuid/v7`.

  The existing `uniku/cuid2` entry point keeps working unchanged but is now `@deprecated` in favor of `uniku/cuid/v2`.

## 0.2.0

### Minor Changes

- d624956: Add `uniku/objectid`, a spec-compliant MongoDB ObjectID generator: 12-byte time-ordered IDs encoded as 24-character lowercase hex, with buffer-mode support, `toBytes`/`fromBytes` conversion, and millisecond timestamp extraction. Cross-validated against MongoDB's own `bson` package.

### Patch Changes

- 6937984: Document TypeID-JS in the README comparison tables.

## 0.1.0

### Minor Changes

- acdef71: Add `uniku/typeid`, a TypeID generator backed by UUID v7 with prefix validation, UUID/byte conversion helpers, and timestamp extraction.

### Patch Changes

- de11ff7: Speed up `nanoid(size)` for the default alphabet by reusing the pooled Nanoid fast path.

## 0.0.13

### Patch Changes

- 9a6a9b7: Reject malformed ULID and KSUID strings consistently from decoders, including non-ASCII input and values outside each ID format's numeric range.
- 12ead93: Fix KSUID timestamp option handling so `secs` validation is non-mutating and rejects values outside the KSUID 32-bit timestamp range.
- bfc9126: Correct published metadata by lowering the Node engine floor to Node 20.19 and documenting the CUID2 `@noble/hashes` runtime dependency in the READMEs.
- 816101a: Consolidate CUID2 random-byte pooling onto the shared lightweight random pool.
- 4cb29cc: Ship TypeScript source files in the npm tarball while keeping published exports resolved to built runtime files.
- 874718e: Preserve ULID monotonicity across clock rollback and fail when the monotonic random portion overflows.
- 49d6a98: Fix UUID v7 monotonic sequence rollover so same-millisecond IDs advance the embedded timestamp when the 31-bit sequence is exhausted.

## 0.0.12

### Patch Changes

- 7c75ebb: Add background update check.

## 0.0.11

### Patch Changes

- e11e50a: Add CLI

## 0.0.10

### Patch Changes

- 509d8ad: replace plain Error/RangeError with tagged error classes

## 0.0.9

### Patch Changes

- db9f558: Improved performance of uuid v4, ksuid, nanoid

## 0.0.8

### Patch Changes

- c20272c: This release:
  - Consolidates shared utilities into `src/common/` (bytes manipulation, random byte pooling)
  - Adds `MIN`/`MAX` constants for all ID generators (uuid v4/v7, ulid, ksuid, nanoid)
  - Expands test coverage with new unit tests for edge cases and constants
  - Introduces `AGENTS.md` files with AI coding guidelines at repo and package level
  - Consolidates and expands RFCs with implementation details and spec references
  - Updates README with guidance on when to use each ID generation strategy
  - Improves benchmark workflow with relative margin of error and faster execution
  - Adds bundle size CI reporting with automatic PR comments
  - Simplifies benchmark and bundle analysis scripts
  - Updates `CONTRIBUTING.md` guide with current development workflow

## 0.0.7

### Patch Changes

- 9b41ea7: Add support for ksuid

## 0.0.6

### Patch Changes

- 1c776b2: Improved performance of nanoid, add bundle:packages script to view size impact

## 0.0.5

### Patch Changes

- 11c26ab: Improve UUIDv7 performance and add Cloudflare Workers e2e tests.

  ### Performance

  - Optimize UUIDv7 stringification for ~15% performance gain (2.7M → 3.1M ops/sec)
  - Replace loop-based `bytesToHex` with direct string concatenation
  - Simplify random byte pool to avoid Atomics overhead
  - Reuse buffer for string generation to reduce per-call allocations

  ### Testing

  - Add end-to-end tests for Cloudflare Workers runtime
  - Add GitHub Actions workflow for Cloudflare e2e tests

## 0.0.4

### Patch Changes

- 47179ec: Add nanoid support

## 0.0.3

### Patch Changes

- ad494ba: Add cuid v2 support

## 0.0.2

### Patch Changes

- ba28bbe: Add support for ulid. Add timestamp method to uuid v7, ulid. Add isValid method to uuid v4, uuid v4, ulid.

## 0.0.1

### Patch Changes

- 3c3b9c8: Add support for uuid v4, v7. Each ID generator function provides a factory function, a `.fromBytes()` function, and a `.toBytes()` function.
