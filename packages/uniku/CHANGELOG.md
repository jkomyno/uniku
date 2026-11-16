# uniku

## 1.0.0-rc.2

### Patch Changes

- Include the `0.8.0` and `0.9.0` releases: configured TSID sequencing, Node.js 22.12.0 minimum support, insecure-context UUID v4 generation, stricter Nanoid and byte-codec validation, monotonic timestamp overflow handling, and UUID v7 timestamp version checks. Preserve the v1 entry-point and option-alias removals.
- Update the v1 codemod and migration guide for the current error-code catalog.

## 1.0.0-rc.1

### Patch Changes

- Include the `0.7.0` changes: `uniku/uuid/v5` and TypeID conversions that accept a UUID of any version.
- Remove the deprecated `secs`, `seq`, and Nanoid object-form `size` aliases after their final migration release in `0.6.0`. Use `msecs`, `counter`, and `length` instead. `CONFLICTING_OPTIONS` is also removed from the v1 error-code catalog because no supported option pair conflicts after these aliases are gone.

## 0.9.0

### Minor Changes

- 1e0b85f: fix: correct stale comments and contracts that contradicted the code

  - `nanoid(0)` and `nanoid({ length: 0 })` returned an empty string while the JSDoc
    advertised `@throws Length must be between 0 and 2048` and the CLI documented a
    `1-256` range. Length is now validated as an integer in `1..2048` with a single
    `LENGTH_OUT_OF_RANGE` message.
  - `nanoid.isValid()` cannot check a generated length, because a nanoid carries none.
    Its JSDoc and reference page now say so instead of leaving the gap implicit.
  - `nanoid` now reads `globalThis.crypto` like every other module, instead of the bare
    `crypto` global.
  - `encodeBase62` and `encodeObjectIdHex` accepted inputs longer than the canonical
    length and silently encoded only the leading bytes. They now require the exact
    length, matching the public `fromBytes()` wrappers.
  - `docs/STABILITY.md` described the ObjectID and XID counters as "always-incrementing".
    Both are 24-bit counters that wrap to zero after 2^24 values in the same second.
  - Corrected the `incrementBytesInPlace` comment, which credited KSUID with a call
    KSUID never makes, and the `objectid/hex.ts` decoding-table comment, which reported
    128 KiB for a 64 KiB allocation.

- 1e0b85f: fix(ulid): advance virtual time when the monotonic random portion overflows

  ULID handled exhaustion of its 80-bit monotonic random portion by filling the
  remaining random bytes with `0xff` and throwing `RANDOM_OVERFLOW`, which left the
  generator failing for every later call in that millisecond. UUID v7 handled the
  same situation by advancing its timestamp by one millisecond.

  There is now one policy: both generators advance virtual time by one millisecond
  and continue from a zeroed counter, so subsequent calls stay unique and
  monotonic instead of throwing.

  Neither generator guards that advance against the end of the 48-bit timestamp
  field, which was a latent bug in both: at the maximum millisecond, uuidv7 wrote a
  timestamp that silently wrapped to zero, and ULID emitted a string its own
  `isValid()` rejects (or, through the buffer path, also wrapped the timestamp).
  Both now saturate and throw `TIMESTAMP_OUT_OF_RANGE` instead of emitting an ID
  whose timestamp field overflowed.

  `RANDOM_OVERFLOW` was unreachable in practice (1 in 2^80 per millisecond) and is
  removed from `ERROR_CODES`. This is a pre-1.0 breaking change to the error
  catalog: `ERROR_CODES` no longer contains it, and the
  `ULID_RANDOM_OVERFLOW` → `RANDOM_OVERFLOW` row is gone from the v1 migration
  guide.

- 1e0b85f: fix(uuid): make `uuidv7.timestamp()` reject values that are not UUID v7

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

### Patch Changes

- 128402c: fix(uuid): let `uniku/uuid/v4` load in insecure browser contexts

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

- 1e0b85f: docs(bench): report benchmark dispersion and stop overstating ratios

  The performance guide published ratios to two significant figures without any
  measure of uncertainty, which implied a precision the harness does not have. Two
  runs of the same command on one machine move the small-ratio rows by up to 22%,
  and a different machine moves the ULID row from 163x to about 85x.

  - `bench-summary` now prints a `Spread` column computed from each row's
    `withinActionRme`/`crossActionRme`, and labels a row `parity (within spread)`
    when its deviation from 1x is smaller than the ratio's combined dispersion.
    Snapshots without multi-run data show `—` instead of a fabricated number.
  - `bench-results.ts` gains `benchmarkDispersion`, `combineDispersion`, and
    `isRatioWithinDispersion`. Dispersion prefers multi-run figures over a single
    run's RME and combines in quadrature; the parity band is multiplicative
    (`1 / (1 + s)` to `1 + s`), because a relative dispersion scales with the value it
    describes. A symmetric absolute band would call `0.75x` parity while calling its
    reciprocal `1.33x` faster, and at 100% spread it would call even `0.001x` parity.
  - The performance guide reports ranges rounded to about one significant figure and
    states what each row does and does not compare. In particular the UUID v4 row
    compares the same native primitive behind two different wrappers — uniku's cached
    bound function against `uuid@14.0.3` re-reading `crypto.randomUUID` on every call
    — so it measures wrapper overhead, not generation speed, and it is the row that
    moved most between runs. The ULID row is qualified on both sides: the reference
    re-detects its PRNG and draws 16 single bytes per call, while uniku draws once per
    millisecond and increments the existing tail. Provenance of the range endpoints is
    spelled out, including which ones are not published artefacts.

## 0.8.0

### Minor Changes

- 09421e3: Require Node.js 22.12.0 or newer. Node.js 20 is no longer supported; CI covers the Node.js 22 minimum, Node.js 24 LTS, and Node.js 25.

### Patch Changes

- 5b6ad76: Preserve TSID sequencing when configuring node, nodeBits, or epoch. Configured calls and empty options now retain the per-isolate counter, handle clock rollback, and advance virtual time on counter overflow instead of sampling counters independently. Explicit timestamps and counters continue to bypass shared state.

## 0.7.0

### Minor Changes

- a7ace05: Add `uniku/uuid/v5`, a name-based UUID (RFC 9562 section 5.5) that derives the same ID from the same name and namespace in every process and runtime. It is synchronous and dependency-free, follows the `uuid` package's `(name, namespace, buf?, offset?)` argument order, and adds `uuidv5.namespace()` to parse a namespace once, plus the `DNS`, `URL`, `OID`, and `X500` namespace constants.
- 379c872: `typeid.fromUuid()`, `typeid.fromBytes()`, `typeid.toUuid()`, `typeid.toBytes()`, `typeid.prefix()`, `typeid.suffix()`, and `typeid.isValid()` now accept a TypeID or UUID of any version, as the TypeID specification recommends, so `typeid.fromUuid('tool', uuidv5(name, namespace))` gives a deterministic TypeID. `typeid()` still generates UUID v7. `typeid.timestamp()` is now the only function that throws `UUID_NOT_V7`, for a TypeID that does not wrap a UUID v7. `typeid.fromUuid()` with a string that is not a UUID now throws a `ParseError` (`INVALID_LENGTH`, `INVALID_FORMAT`, or `INVALID_CHAR`) instead of `UUID_NOT_V7`.

## 1.0.0-rc.0

### Major Changes

- Finalize the v1 public API: use only `uniku/cuid/v2` with `cuidv2`, replace second-based `secs` options with millisecond-based `msecs`, replace UUID v7 and TypeID `seq` with `counter`, and use `length` for Nanoid's object-form option. Existing identifier data remains valid; see the v1 migration guide for mechanical before-and-after examples.

## 0.6.0

### Minor Changes

- e5294d9: Publish the final pre-v1 migration release with the `secs`, `seq`, and Nanoid object-form `size` aliases explicitly deprecated. Use `msecs`, `counter`, and `length` instead; the aliases will be removed in `1.0.0-rc.1`.

## 0.5.0

### Minor Changes

- a602259: **Breaking (pre-v1):** Remove the strategy prefix from every remaining error code. Codes are now strategy-agnostic across the whole library; the generator that raised the error is reported via the `strategy` field added in the previous release. `uniku/errors` now exports the authoritative `ERROR_CODES` runtime catalog and its derived `ErrorCode` union, and public error constructors accept only that union instead of arbitrary strings. Migration is mechanical — match on `error.code` as before, and read `error.strategy` where the generator matters:

  | Before                                                                                                                                                                                                                                                                    | After                                                                                               |
  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
  | `UUID_INVALID_HEX_CHAR`, `ULID_INVALID_CHAR`, `KSUID_INVALID_CHAR`, `OBJECTID_INVALID_CHAR`, `XID_INVALID_CHAR`, `TSID_INVALID_CHAR`, `TYPEID_SUFFIX_INVALID_CHARACTER`                                                                                                   | `INVALID_CHAR`                                                                                      |
  | `UUID_INVALID_LENGTH`, `ULID_INVALID_LENGTH`, `KSUID_INVALID_LENGTH`, `OBJECTID_INVALID_LENGTH`, `XID_INVALID_LENGTH`, `TSID_INVALID_LENGTH`, `TYPEID_SUFFIX_INVALID_LENGTH`                                                                                              | `INVALID_LENGTH`                                                                                    |
  | `UUID_INVALID_SEPARATORS`, `TYPEID_INVALID_FORMAT`                                                                                                                                                                                                                        | `INVALID_FORMAT`                                                                                    |
  | `KSUID_OVERFLOW`, `TYPEID_SUFFIX_OVERFLOW`, `TSID_LEADING_CHAR_OUT_OF_RANGE`, `TSID_VALUE_OUT_OF_RANGE`                                                                                                                                                                   | `VALUE_OUT_OF_RANGE`                                                                                |
  | `XID_NON_CANONICAL`                                                                                                                                                                                                                                                       | `NON_CANONICAL`                                                                                     |
  | `UUID_BYTES_INVALID_LENGTH`, `ULID_BYTES_INVALID_LENGTH`, `KSUID_BYTES_INVALID_LENGTH`, `KSUID_BYTES_TOO_SHORT`, `OBJECTID_BYTES_INVALID_LENGTH`, `OBJECTID_BYTES_TOO_SHORT`, `XID_BYTES_INVALID_LENGTH`, `TSID_BYTES_INVALID_LENGTH`, `TYPEID_UUID_BYTES_INVALID_LENGTH` | `BYTES_INVALID_LENGTH`                                                                              |
  | `UUID_BUFFER_OUT_OF_BOUNDS`, `ULID_BUFFER_OUT_OF_BOUNDS`, `KSUID_BUFFER_OUT_OF_BOUNDS`, `OBJECTID_BUFFER_OUT_OF_BOUNDS`, `XID_BUFFER_OUT_OF_BOUNDS`, `TSID_BUFFER_OUT_OF_BOUNDS`                                                                                          | `BUFFER_OUT_OF_BOUNDS`                                                                              |
  | `UUID_RANDOM_BYTES_TOO_SHORT`, `ULID_RANDOM_BYTES_TOO_SHORT`, `KSUID_RANDOM_BYTES_TOO_SHORT`, `OBJECTID_RANDOM_BYTES_TOO_SHORT`, `NANOID_RANDOM_BYTES_INSUFFICIENT`, `CUID2_RANDOM_BYTES_EMPTY`                                                                           | `RANDOM_BYTES_TOO_SHORT`                                                                            |
  | `ULID_RANDOM_OVERFLOW`                                                                                                                                                                                                                                                    | `RANDOM_OVERFLOW`                                                                                   |
  | `UUID_SEQUENCE_OUT_OF_RANGE`                                                                                                                                                                                                                                              | `COUNTER_OUT_OF_RANGE`                                                                              |
  | `OBJECTID_COUNTER_OUT_OF_RANGE`, `XID_COUNTER_OUT_OF_RANGE`, `TSID_COUNTER_OUT_OF_RANGE`                                                                                                                                                                                  | `COUNTER_OUT_OF_RANGE`                                                                              |
  | `TSID_NODE_OUT_OF_RANGE`, `TSID_NODE_BITS_OUT_OF_RANGE`, `TSID_EPOCH_INVALID`                                                                                                                                                                                             | `NODE_OUT_OF_RANGE`, `NODE_BITS_OUT_OF_RANGE`, `EPOCH_INVALID` (prefix dropped)                     |
  | `XID_PROCESS_ID_OUT_OF_RANGE`, `XID_MACHINE_ID_BYTES_TOO_SHORT`                                                                                                                                                                                                           | `PROCESS_ID_OUT_OF_RANGE`, `MACHINE_ID_BYTES_TOO_SHORT` (prefix dropped)                            |
  | `TYPEID_PREFIX_TOO_LONG`, `TYPEID_PREFIX_INVALID_CHARACTER`, `TYPEID_PREFIX_INVALID_BOUNDARY`, `TYPEID_UUID_NOT_V7`                                                                                                                                                       | `PREFIX_TOO_LONG`, `PREFIX_INVALID_CHAR`, `PREFIX_INVALID_BOUNDARY`, `UUID_NOT_V7` (prefix dropped) |
  | `NANOID_ALPHABET_TOO_SHORT` + `NANOID_ALPHABET_TOO_LONG`                                                                                                                                                                                                                  | `ALPHABET_OUT_OF_RANGE` (merged)                                                                    |
  | `NANOID_ALPHABET_INVALID_CHAR`, `NANOID_ALPHABET_DUPLICATE`                                                                                                                                                                                                               | `ALPHABET_INVALID_CHAR`, `ALPHABET_DUPLICATE` (prefix dropped)                                      |
  | `NANOID_SIZE_INVALID` + `NANOID_SIZE_TOO_LARGE`                                                                                                                                                                                                                           | `LENGTH_OUT_OF_RANGE` (merged)                                                                      |
  | `CUID2_LENGTH_OUT_OF_RANGE`                                                                                                                                                                                                                                               | `LENGTH_OUT_OF_RANGE`                                                                               |

  Every error message is unchanged. The `_tag` discriminant (`InvalidInputError` for caller-input failures, `ParseError` for ID-string parse failures, `BufferError` for byte/buffer issues) is unchanged as well, and a few codes (`VALUE_OUT_OF_RANGE`) intentionally appear under more than one tag. `v1-boundaries.test.ts` now pins the full code + `strategy` contract for every generator.

- 14c22e8: **Added:** unified option names across generators.

  - `uniku/uuid/v7` gains `counter` (inherited by `uniku/typeid`), matching `objectid`, `tsid`, and `xid`. The validation error code changes from `SEQUENCE_OUT_OF_RANGE` to `COUNTER_OUT_OF_RANGE`.
  - `uniku/nanoid` gains `length`, matching `uniku/cuid/v2`. The validation error code changes from `SIZE_OUT_OF_RANGE` to `LENGTH_OUT_OF_RANGE`.

  **Deprecated:** `seq` (uuid/v7) and `size` (nanoid). Both keep working unchanged until v1-rc, but combining either with its replacement throws `CONFLICTING_OPTIONS`:

  ```ts
  // Before
  uuidv7({ msecs, seq: 42 });
  nanoid({ size: 10 });
  // After
  uuidv7({ msecs, counter: 42 });
  nanoid({ length: 10 });
  ```

  `typeid` validates the inherited options at its own boundary, so timestamp, counter, and random-bytes failures all report `strategy: 'typeid'` instead of leaking `strategy: 'uuid'` through delegation.

  **Changed (`@uniku/cli`):** `uniku nanoid --size` is renamed to `--length` (alias `-l`), consistent with `uniku cuid --length`. The positional `nanoid(10)` shorthand in the library is unchanged.

- 55b9e06: **Added:** unified `msecs` timestamp option for `uniku/ksuid`, `uniku/objectid`, and `uniku/xid`. Every time-ordered generator now takes milliseconds since the Unix epoch, matching `uuid/v7`, `ulid`, `tsid`, `typeid`, and the value returned by every `.timestamp()` reader. Second-precision formats truncate sub-second precision (`Math.floor(msecs / 1000)`), so the maximum expressible timestamp gains `+999ms` of headroom.

  **Deprecated:** the `secs` option in those three generators. It keeps working unchanged until v1-rc, but passing both `msecs` and `secs` now throws `CONFLICTING_OPTIONS`. Migrate by multiplying existing values by 1000:

  ```ts
  // Before
  ksuid({ secs: 1_500_000_000 });
  // After
  ksuid({ msecs: 1_500_000_000_000 });
  ```

  **Changed (`@uniku/cli`):** `--timestamp` for `ksuid`, `objectid`, and `xid` now expects milliseconds, consistent with `ulid` and `tsid` (`uniku ksuid --timestamp 1720000000000`). This is a behavioral break for CLI invocations that passed seconds.

- 14c22e8: **Added:** `typeid` buffer-writing overload, completing the overload shape every other byte-backed generator already supports:

  ```ts
  const buf = new Uint8Array(32);
  typeid("user", { msecs }, buf, 8); // writes the 16 canonical UUID v7 bytes at offset 8
  ```

  Buffer-mode calls validate the prefix and all options, and bounds failures report `BUFFER_OUT_OF_BOUNDS` with `strategy: 'typeid'`.

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
