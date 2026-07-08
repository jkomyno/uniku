# ID Generation Strategy Guidelines

Rules for implementing new ID generators in uniku.

## API Structure

Export a single function with attached static methods:

```typescript
export const generator = Object.assign(mainFunction, {
  toBytes: parseFunction,    // String → Uint8Array (where applicable)
  fromBytes: formatFunction, // Uint8Array → String (where applicable)
  timestamp: extractTime,    // Extract timestamp (time-ordered only)
  isValid: validator,        // Type guard: (id: unknown) => id is string
  NIL: '...',                // Nil/zero value constant
  MAX: '...',                // Maximum value constant
})
```

### BigInt-Primary Variant (tsid)

Every generator above returns a `string` by default and operates `toBytes`/`fromBytes`/`timestamp`/`isValid`
on that string. `tsid` is the sole departure: its primary type is `bigint`, not `string`, because its
entire value proposition is native numeric storage (e.g. a database `BIGINT` primary key), not a
string-first identifier that happens to have a byte encoding.

```typescript
export const tsid = Object.assign(tsidFn, {
  toBytes: parseFunction,    // bigint → Uint8Array (operates on the primary bigint type)
  fromBytes: formatFunction, // Uint8Array → bigint
  toString: encodeFunction,  // bigint → string (NEW: boundary conversion, absent on string-primary generators)
  fromString: decodeFunction, // string → bigint (NEW: boundary conversion)
  timestamp: extractTime,    // bigint → number (ms since epoch)
  isValid: validator,        // Type guard: (id: unknown) => id is bigint
  NIL: 0n,                   // Nil/zero value constant
  MAX: 2n ** 64n - 1n,       // Maximum value constant
})
```

`toString`/`fromString` exist only on `tsid` — they are the boundary conversions to/from the
13-character canonical Crockford Base32 string, needed specifically because the primary type is
not already a string. Every other generator's methods already operate on a string, so it never
needed a dedicated pair of conversions to and from one.

## Function Overloads

Generators support two modes via overloads:
- **String mode** (default): `generator()` returns a string
- **Buffer mode**: `generator(options, buf, offset)` writes to provided `Uint8Array`

## Options Type

Define an options type with these optional fields:

- `random?: Uint8Array` — Custom random bytes for deterministic tests
- `msecs?: number` — Custom timestamp in milliseconds (time-ordered generators)
- `seq?: number` — Sequence number (only for uuidv7)

## Monotonic State (Time-Ordered Generators)

For time-ordered IDs (uuidv7, ulid, ksuid):

- Maintain module-level state tracking last timestamp and sequence/random
- Document that state persists in serverless warm starts
- When same millisecond: increment sequence or random portion
- When new millisecond: reset with fresh random

### Always-Incrementing Counter Variant (objectid)

`objectid` documents a second state-machine shape, distinct from the reset-on-new-timestamp
pattern above:

- Maintain module-level state for a per-process random value and a counter, tracked
  independently of the timestamp
- On every no-option call: read the current timestamp fresh, then increment the counter —
  regardless of whether the timestamp changed since the last call
- The counter never resets when the timestamp advances; it climbs monotonically for the
  lifetime of the module (including across serverless warm starts) and only wraps when it
  overflows its bit width
- This is intentional anti-collision behavior mandated by the MongoDB ObjectID spec, not a
  bug: unlike ulid/uuidv7's per-timestamp sequence, objectid's counter is not "reset with
  fresh random" on a new timestamp

### Hybrid Persistent-Node + Per-Millisecond-Reset Counter Variant (tsid)

`tsid` documents a third state-machine shape, which is a genuine hybrid of the two patterns
above rather than a repeat of either one:

- Maintain module-level state `{ node: number | undefined, msecs: number, counter: number }`.
- **Node ID — persistent, lazily-random (like objectid's persisted random bytes):** `node` is
  initialized once, on the first no-option call, to a random value within its bit range, and then
  reused for the lifetime of the module (including across serverless warm starts). Unlike
  objectid's random bytes, `node` is a plain JS number, so no buffer-aliasing copy-safety concern
  applies.
- **Counter — reset on new timestamp (like ulid/uuidv7's sequence):** on every no-option call, read
  `Date.now()` fresh; if it has advanced past `state.msecs`, treat it as a new millisecond
  (`state.msecs = now`, `state.counter` reseeded to a fresh random value). Otherwise increment
  `state.counter` by 1 within the same millisecond — the opposite of objectid's counter, which
  never resets regardless of timestamp changes.
- **Clock-drift-ahead overflow (novel to tsid):** if incrementing `state.counter` overflows its bit
  width within a single real millisecond, advance the internal virtual `state.msecs` ahead of
  wall-clock time by 1ms and reset `state.counter` to 0, rather than throwing. This is necessary
  because the counter's bit width (12 bits by default, 4096 values/ms) is a realistic throughput
  ceiling, unlike ULID's 80-bit random field which effectively never overflows.
- As with every other generator's monotonic state, passing any of `msecs`/`epoch`/`node`/
  `nodeBits`/`counter` via options computes the packed value purely from the given/defaulted
  inputs without reading or mutating `state` at all.

## Random Byte Handling

- Use `globalThis.crypto.getRandomValues()` for portability
- Implement byte pooling for hot paths (pre-allocate buffer, refill when exhausted)
- Pool size: 256 bytes is standard

## Validation

Implement `isValid` as a type guard with regex validation:

```typescript
function isValid(id: unknown): id is string {
  return typeof id === 'string' && REGEX.test(id)
}
```

## Entry Point

Each generator has its own entry point (no barrel exports):
- `uniku/uuid/v4`, `uniku/uuid/v7`, `uniku/ulid`, etc.

Versioned generators use a versioned subpath: `uniku/uuid/v4`, `uniku/uuid/v7`, and
`uniku/cuid/v2` (the canonical CUID2 entry point). `uniku/cuid2` is a deprecated
alias for `uniku/cuid/v2` — it still works but should not be used in new code.

Two non-generator, metadata-only entry points follow the same standalone-module convention:
- `uniku/errors` — the shared error classes.
- `uniku/generators` — `ID_GENERATORS` (the canonical ordered list of supported ID generators) and its derived `IdGenerator` union.

## Testing

- Mock `Date.now()` for deterministic timestamp tests
- Use `random` option for deterministic output
- Cross-validate with reference npm packages in integration tests
