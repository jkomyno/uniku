# uniku

[![npm version](https://img.shields.io/npm/v/uniku.svg)](https://www.npmjs.com/package/uniku)
[![npm downloads](https://img.shields.io/npm/dm/uniku.svg)](https://npmjs.com/package/uniku)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/uniku)](https://bundlephobia.com/package/uniku)
[![CI](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

One library. Every ID format. Every runtime. One runtime dependency (`@noble/hashes`, CUID2 only).

> **uniku** */uˈniːku/* — Maltese for "unique"

```ts
import { uuidv7 } from 'uniku/uuid/v7'

const id = uuidv7()
// => "018e5e5c-7c8a-7000-8000-000000000000"

// Time-ordered: IDs sort by creation time
const [first, second, third] = [uuidv7(), uuidv7(), uuidv7()]
console.log(first < second && second < third) // true
```

## At a Glance

|                    | uniku | [uuid](https://github.com/uuidjs/uuid) | [typeid-js](https://github.com/jetify-com/typeid-js) | [nanoid](https://github.com/ai/nanoid) | [ulid](https://github.com/ulid/javascript) | [cuid2](https://github.com/paralleldrive/cuid2) | [ksuid](https://github.com/owpz/ksuid) | [bson](https://github.com/mongodb/js-bson) | [tsid-ts](https://github.com/yubinTW/tsid-ts) |
|--------------------|:-----:|:----:|:---------:|:------:|:----:|:-----:|:-----:|:-----:|:-----:|
| UUID v4            |   ✅  |  ✅  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |   ❌  |
| UUID v7            |   ✅  |  ✅  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |   ❌  |
| TypeID             |   ✅  |  ❌  |     ✅    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |   ❌  |
| Nanoid             |   ✅  |  ❌  |     ❌    |   ✅   |  ❌  |   ❌  |   ❌  |   ❌  |   ❌  |
| ULID               |   ✅  |  ❌  |     ❌    |   ❌   |  ✅  |   ❌  |   ❌  |   ❌  |   ❌  |
| CUID2              |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ✅  |   ❌  |   ❌  |   ❌  |
| KSUID              |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ✅  |   ❌  |   ❌  |
| ObjectID           |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ✅  |   ❌  |
| TSID               |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |   ✅  |
| XID                |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |   ❌  |
| Tree-shakeable     |   ✅  |  ✅  |     ✅    |   ✅   |  ✅  |   ✅  |   ❌  |   ❌  |   ❌  |
| ESM-only           |   ✅  | ✅¹  |     ❌    |   ✅   |  ❌  |   ✅  |   ❌  |   ❌  |   ❌  |
| Edge/Workers       |   ✅  |  ✅  |     ✅    |   ✅   |  ⚠️  |   ✅  |  ⚠️  |  ⚠️  |  ⚠️  |
| Byte ↔ String      |   ✅  |  ✅  |     ✅    |   -    |  ⚠️²  |   -   |   ✅  |   ✅  |   ✅  |

> **Notes:**
> - Byte ↔ String conversion doesn't make sense for nanoid and cuid2, since they are string-native formats with no canonical binary representation.
> - ¹ `uuid@13` is ESM-only; earlier versions support CommonJS.
> - ² `ulid` only provides timestamp encoding/decoding, not full binary serialization.

### Works Everywhere

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Deno-000000?logo=deno&logoColor=white" alt="Deno">
  <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Vercel_Edge-000000?logo=vercel&logoColor=white" alt="Vercel Edge">
  <img src="https://img.shields.io/badge/Browsers-4285F4?logo=googlechrome&logoColor=white" alt="Browsers">
</p>

Uses `globalThis.crypto` (Web Crypto API) — no Node.js-specific APIs.

## Why uniku?

- **ESM-only** — No CommonJS or legacy support.
- **Universal runtime support** — Works everywhere: Node.js, Cloudflare Workers, Vercel Edge, Deno, browsers.
- **Truly tree-shakeable** — Separate entry points mean you only bundle what you import. No barrel `index.ts` re-exports.
- **Byte-level access** — Convert between UUID strings and `Uint8Array` with built-in `toBytes()` and `fromBytes()`.
- **Modern standards** — Includes UUID v7 (RFC 9562) for time-ordered, sortable identifiers with monotonic sequencing.
- **Lightweight** — Designed for use in performance-sensitive contexts like ORMs.

## Performance

Benchmarks comparing `uniku` string ID generation with equivalent npm packages:

| Generator | uniku vs npm |
|-----------|-------------:|
| ULID      | **85× faster** |
| CUID2     | **8× faster** |
| KSUID     | **1.5× faster** |
| ObjectID  | **1.1× faster** |
| TSID      | **1.7× faster** |
| XID | **1.3× faster** |
| UUID v7   | **1.1× faster**  |
| Nanoid    | **1.9× faster** |
| Nanoid (10 chars) | **1.3× faster** |
| TypeID    | **2.6× faster** |
| UUID v4   | npm is 1.1× faster |

## Which ID Should I Use?

| Use Case | Recommended | Why |
|----------|-------------|-----|
| Database primary keys | **UUID v7** or **ULID** | Time-ordered for index efficiency |
| API/domain identifiers | **TypeID** | UUID v7 with readable type prefixes like `user_...` |
| URL shorteners | **Nanoid** | Compact, URL-safe characters |
| Prevent enumeration | **CUID2** | Non-sequential, secure |
| Maximum compatibility | **UUID v4** | Universal standard |
| Distributed systems needing sortable, URL-safe IDs | **ULID** | Millisecond ordering + 80-bit entropy |
| Very high-volume distributed systems | **KSUID** | Time-ordered with 128-bit entropy |
| MongoDB `_id` compatibility | **ObjectID** | Drop-in match for MongoDB's native document ID format |
| Native 64-bit sortable integer ID | **TSID** | Fits a database `BIGINT` primary key, no UUID-sized overhead |
| Go rs/xid compatibility | **XID** | Compact, time-ordered 12-byte identifier |

## Installation

```bash
# pnpm (recommended)
pnpm add uniku

# bun
bun add uniku

# npm
npm install uniku

# yarn
yarn add uniku

# deno
deno install npm:uniku
```

### Bundle Impact

Only import what you use — each entry point is independently tree-shakeable:

| Import | Minified + gzipped |
|--------|-------------------:|
| `uniku/uuid/v4` | ~1.1 KB |
| `uniku/uuid/v7` | ~1.4 KB |
| `uniku/ulid` | ~1.8 KB |
| `uniku/typeid` | ~1.6 KB |
| `uniku/cuid/v2` | ~992 B* |
| `uniku/cuid2` | ~1007 B* |
| `uniku/nanoid` | ~1.2 KB |
| `uniku/ksuid` | ~1.3 KB |
| `uniku/objectid` | ~1.3 KB |
| `uniku/tsid` | ~1.4 KB |
| `uniku/xid` | ~1.9 KB |
| `uniku/generators` | ~98 B |

* The CUID2 entry point imports SHA3-512 from `@noble/hashes`; this table's entry-point size excludes that external dependency.

### Preview Releases

Every pull request gets a preview release via [pkg.pr.new](https://pkg.pr.new). Install directly from a PR:

```bash
pnpm add https://pkg.pr.new/jkomyno/uniku@<pr-number>
```

## Quick Start

### UUID v4 (random)

```ts
import { uuidv4 } from 'uniku/uuid/v4'

// Generate a UUID string
const id = uuidv4()
// => "550e8400-e29b-41d4-a716-446655440000"

// Convert to bytes
const bytes = uuidv4.toBytes(id)
// => Uint8Array(16)

// Convert back to string
const str = uuidv4.fromBytes(bytes)
// => "550e8400-e29b-41d4-a716-446655440000"
```

For advanced use cases, you can provide custom random bytes or write directly to a buffer:

```ts
import { uuidv4 } from 'uniku/uuid/v4'

// Custom random source (note: bytes at index 6 and 8 will be modified for version/variant bits)
const id = uuidv4({ random: myRandomBytes })

// Write to existing buffer at offset
const buffer = new Uint8Array(32)
uuidv4(undefined, buffer, 8) // writes 16 bytes starting at offset 8
```

### UUID v7 (time-ordered)

UUID v7 embeds a timestamp, making IDs sortable by creation time — ideal for database primary keys:

```ts
import { uuidv7 } from 'uniku/uuid/v7'

// Generate a time-ordered UUID
const id = uuidv7()
// => "018e5e5c-7c8a-7000-8000-000000000000"

// IDs generated in sequence are lexicographically sortable
const ids = [uuidv7(), uuidv7(), uuidv7()]
ids.sort() // Already in creation order

// Byte conversions work the same way
const bytes = uuidv7.toBytes(id)
const str = uuidv7.fromBytes(bytes)
```

For testing or advanced use cases:

```ts
import { uuidv7 } from 'uniku/uuid/v7'

// Specify timestamp and sequence
const id = uuidv7({
  msecs: 1702387456789,
  seq: 0,
  random: new Uint8Array(16)
})

// Write to buffer
const buffer = new Uint8Array(32)
uuidv7(undefined, buffer, 8)
```

### ULID (time-ordered)

ULID is a 26-character, lexicographically sortable identifier:

```ts
import { ulid } from 'uniku/ulid'

// Generate a ULID string
const id = ulid()
// => "01HW9T2W9W9YJ3JZ1H4P4M2T8Q"

// Convert to bytes
const bytes = ulid.toBytes(id)

// Convert back to string
const str = ulid.fromBytes(bytes)
```

### TypeID (prefixed UUID v7)

```ts
import { typeid } from 'uniku/typeid'

const id = typeid('user')
// => "user_01h2xcejqtf2nbrexx3vqjhp41"

const uuid = typeid.toUuid(id)
const restored = typeid.fromUuid('user', uuid)

const canonical = typeid('')
// => "01h2xcejqtf2nbrexx3vqjhp41"
```

### CUID2 (secure, non-time-ordered)

CUID2 generates secure, collision-resistant identifiers using SHA3-512 hashing. Unlike time-ordered IDs, CUID2 prevents enumeration attacks:

```ts
import { cuidv2 } from 'uniku/cuid/v2'

// Generate a CUID2 string
const id = cuidv2()
// => "pfh0haxfpzowht3oi213cqos"

// Custom length (2-32 characters)
const shortId = cuidv2({ length: 10 })
// => "tz4a98xxat"

// Validation (type guard)
const maybeId: unknown = getUserInput()
if (cuidv2.isValid(maybeId)) {
  console.log(maybeId) // TypeScript knows this is a string
}
```

> `uniku/cuid/v2` is the canonical entry point. The older `uniku/cuid2` import
> still works and re-exports the same generator, but is now deprecated — prefer
> `import { cuidv2 } from 'uniku/cuid/v2'`.

### Nanoid (URL-friendly, custom alphabet)

Nanoid generates compact, URL-friendly unique string IDs with 126 bits of entropy (comparable to UUID):

```ts
import { nanoid } from 'uniku/nanoid'

// Generate a 21-character URL-safe ID
const id = nanoid()
// => "V1StGXR8_Z5jdHi6B-myT"

// Custom size
const shortId = nanoid(10)
// => "IRFa-VaY2b"

// Custom alphabet and size via options
const hexId = nanoid({ alphabet: '0123456789abcdef', size: 12 })
// => "4f90d13a42bc"

// Validation (default alphabet only)
nanoid.isValid(id)
// => true
```

### KSUID (time-ordered, high entropy)

KSUID is a 27-character, K-Sortable Unique Identifier with second-precision timestamps:

```ts
import { ksuid } from 'uniku/ksuid'

// Generate a KSUID string
const id = ksuid()
// => "2QnJjKLvpSfpZqGiPPxVwWLMy2p"

// Convert to bytes
const bytes = ksuid.toBytes(id)

// Convert back to string
const str = ksuid.fromBytes(bytes)

// Extract timestamp (returns milliseconds for API consistency)
const ts = ksuid.timestamp(id)
// => 1702387456000

// Validate
ksuid.isValid(id)
// => true
```

### ObjectID (time-ordered, MongoDB-compatible)

ObjectID is MongoDB's 24-character hex identifier, combining a second-precision timestamp with a per-process random value and an always-incrementing counter:

```ts
import { objectid } from 'uniku/objectid'

// Generate an ObjectID string
const id = objectid()
// => "667c3f2a1e2b3c4d5e6f7081"

// Convert to bytes
const bytes = objectid.toBytes(id)

// Convert back to string
const str = objectid.fromBytes(bytes)

// Extract timestamp (returns milliseconds for API consistency)
const ts = objectid.timestamp(id)
// => 1702387456000

// Validate
objectid.isValid(id)
// => true
```

### TSID (time-ordered, 64-bit integer)

TSID is a Snowflake-style 64-bit identifier combining a millisecond timestamp, a node ID, and a per-millisecond counter. Unlike every other uniku generator, `tsid()` returns a `bigint` by default — not a string — since TSID's whole value proposition is native numeric storage (e.g. a database `BIGINT` primary key). `toString`/`fromString` are the boundary conversions to/from the 13-character canonical string:

```ts
import { tsid } from 'uniku/tsid'

// Generate a TSID bigint (the primary type, not a string)
const id = tsid()
// => 862301223059968074n

// Convert to/from the 13-character canonical Crockford Base32 string
const str = tsid.toString(id)
// => "0QXW2CK4XZM2A"
tsid.fromString(str) === id // true

// Extract timestamp (milliseconds, full precision)
const ts = tsid.timestamp(id)
// => 1783425432359

// Validate (operates on bigint, not string)
tsid.isValid(id)
// => true

// Convert to/from 8 bytes
const bytes = tsid.toBytes(id)
const restored = tsid.fromBytes(bytes)
```

### XID (time-ordered, rs/xid-compatible)

XID is a 20-character lowercase base32hex identifier that encodes a seconds-precision timestamp, a random per-runtime identity, and an always-incrementing counter:

```ts
import { xid } from 'uniku/xid'

const id = xid()
// => "9m4e2mr0ui3e8a215n4g"

const bytes = xid.toBytes(id)
const restored = xid.fromBytes(bytes)
const timestamp = xid.timestamp(id)
```

The default identity is random and cached for this runtime. Supply `machineId`, `processId`, `secs`, and `counter` when you need deterministic output.

## Migrating to uniku

### From `uuid`

```diff
- import { v4 as uuidv4 } from 'uuid'
+ import { uuidv4 } from 'uniku/uuid/v4'

- import { v7 as uuidv7 } from 'uuid'
+ import { uuidv7 } from 'uniku/uuid/v7'
```

### From `nanoid`

```diff
- import { nanoid } from 'nanoid'
+ import { nanoid } from 'uniku/nanoid'
```

API is identical — drop-in replacement.

### From `ulid`

```diff
- import { ulid } from 'ulid'
+ import { ulid } from 'uniku/ulid'
```

API is identical — drop-in replacement.

### From `@paralleldrive/cuid2`

```diff
- import { createId } from '@paralleldrive/cuid2'
+ import { cuid2 } from 'uniku/cuid2'

- const id = createId()
+ const id = cuid2()
```

### From `@owpz/ksuid`

```diff
- import { KSUID } from '@owpz/ksuid'
+ import { ksuid } from 'uniku/ksuid'

- const id = KSUID.random().toString()
+ const id = ksuid()

- const bytes = KSUID.random().toBuffer()
+ const bytes = ksuid(undefined, new Uint8Array(20))

- const parsed = KSUID.parse(str)
- const timestamp = parsed.timestamp
+ const timestamp = ksuid.timestamp(str)

- const fromBuf = KSUID.fromBytes(buffer).toString()
+ const fromStr = ksuid.fromBytes(bytes)
```

**Key differences:**
- uniku uses a functional API (`ksuid()`) vs class-based API (`KSUID.random()`)
- uniku uses standard `Uint8Array` instead of Node.js `Buffer`
- uniku's `timestamp()` returns milliseconds (for API consistency with ulid/uuidv7)
- uniku doesn't include `Sequence`, `CompressedSet`, or sorting utilities

### From `bson`

```diff
- import { ObjectId } from 'bson'
+ import { objectid } from 'uniku/objectid'

- const id = new ObjectId().toHexString()
+ const id = objectid()

- const bytes = new ObjectId().id
+ const bytes = objectid(undefined, new Uint8Array(12))

- const valid = ObjectId.isValid(str)
+ const valid = objectid.isValid(str)

- const timestamp = new ObjectId(str).getTimestamp().getTime()
+ const timestamp = objectid.timestamp(str)
```

**Key differences:**
- uniku uses a functional API (`objectid()`) vs class-based API (`new ObjectId()`)
- uniku uses standard `Uint8Array` instead of bson's internal byte representation
- uniku's `timestamp()` returns milliseconds directly, not a `Date` object (for API consistency with ulid/uuidv7/ksuid)
- uniku only implements the ObjectID identifier format, not bson's other BSON type integrations

## API

### `uuidv4` (from `uniku/uuid/v4`)

```ts
uuidv4(options?: UuidV4Options): string
uuidv4(options: UuidV4Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv4.toBytes(id: string): Uint8Array
uuidv4.fromBytes(bytes: Uint8Array): string
uuidv4.isValid(id: unknown): id is string
uuidv4.NIL  // "00000000-0000-0000-0000-000000000000"
uuidv4.MAX  // "ffffffff-ffff-ffff-ffff-ffffffffffff"
```

**Options:**
- `random?: Uint8Array` — 16 bytes of random data (note: bytes at index 6 and 8 will be modified in-place)

### `uuidv7` (from `uniku/uuid/v7`)

```ts
uuidv7(options?: UuidV7Options): string
uuidv7(options: UuidV7Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv7.toBytes(id: string): Uint8Array
uuidv7.fromBytes(bytes: Uint8Array): string
uuidv7.timestamp(id: string): number
uuidv7.isValid(id: unknown): id is string
uuidv7.NIL  // "00000000-0000-0000-0000-000000000000"
uuidv7.MAX  // "ffffffff-ffff-ffff-ffff-ffffffffffff"
```

**Options:**
- `msecs?: number` — Timestamp in milliseconds (defaults to `Date.now()`)
- `seq?: number` — Sequence number for monotonicity
- `random?: Uint8Array` — 16 bytes of random data

### `ulid` (from `uniku/ulid`)

```ts
ulid(options?: UlidOptions): string
ulid(options: UlidOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array

ulid.toBytes(id: string): Uint8Array
ulid.fromBytes(bytes: Uint8Array): string
ulid.timestamp(id: string): number
ulid.isValid(id: unknown): id is string
ulid.NIL  // "00000000000000000000000000"
ulid.MAX  // "7ZZZZZZZZZZZZZZZZZZZZZZZZZ"
```

**Options:**
- `msecs?: number` — Timestamp in milliseconds (defaults to `Date.now()`)
- `random?: Uint8Array` — 16 bytes of random data (only first 10 bytes used)

### `typeid` (from `uniku/typeid`)

```ts
typeid(prefix: string, options?: TypeidOptions): string

typeid.toBytes(id: string): Uint8Array
typeid.fromBytes(prefix: string, bytes: Uint8Array): string
typeid.toUuid(id: string): string
typeid.fromUuid(prefix: string, uuid: string): string
typeid.timestamp(id: string): number
typeid.prefix(id: string): string
typeid.suffix(id: string): string
typeid.isValid(id: unknown): id is string
```

**Options:**
- `msecs?: number` — Timestamp in milliseconds (defaults to `Date.now()`)
- `seq?: number` — Sequence number forwarded to UUID v7 generation
- `random?: Uint8Array` — 16 bytes of random data forwarded to UUID v7 generation

Use an empty prefix (`typeid('')`) to generate Jetify-compatible prefixless TypeIDs.

### `cuidv2` (from `uniku/cuid/v2`)

```ts
cuidv2(options?: CuidV2Options): string
cuidv2.isValid(id: unknown): id is string
```

> Also available (deprecated) as `cuid2` from `uniku/cuid2` — the same generator
> under the pre-versioned entry point.

**Options:**
- `length?: number` — ID length (2-32, default 24)
- `random?: Uint8Array` — Custom random bytes for testing

Note: Unlike UUID and ULID, CUID2 does not provide `toBytes`/`fromBytes` because it is a string-native format with no canonical binary representation.

### `nanoid` (from `uniku/nanoid`)

```ts
nanoid(): string
nanoid(size: number): string
nanoid(options: NanoidOptions): string
nanoid.isValid(id: unknown): id is string

// Constant
URL_ALPHABET  // "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
```

**Options:**
- `size?: number` — ID length (default 21, max 2048)
- `alphabet?: string` — Custom alphabet (2-256 printable ASCII characters)
- `random?: Uint8Array` — Custom random bytes for testing

Note: `isValid()` only validates IDs against the default URL-safe alphabet (`A-Za-z0-9_-`). IDs generated with custom alphabets cannot be validated with this method.

### `ksuid` (from `uniku/ksuid`)

```ts
ksuid(options?: KsuidOptions): string
ksuid(options: KsuidOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array

ksuid.toBytes(id: string): Uint8Array
ksuid.fromBytes(bytes: Uint8Array): string
ksuid.timestamp(id: string): number
ksuid.isValid(id: unknown): id is string
ksuid.NIL  // "000000000000000000000000000"
ksuid.MAX  // "aWgEPTl1tmebfsQzFP4bxwgy80V"
```

**Options:**
- `secs?: number` — Timestamp in seconds since Unix epoch (defaults to `Math.floor(Date.now() / 1000)`)
- `random?: Uint8Array` — 16 bytes of random data for the payload

> **Note:** KSUID uses `secs` (seconds) while UUID v7 and ULID use `msecs` (milliseconds). This reflects KSUID's native second-precision timestamps.

### `objectid` (from `uniku/objectid`)

```ts
objectid(options?: ObjectIdOptions): string
objectid(options: ObjectIdOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array

objectid.toBytes(id: string): Uint8Array
objectid.fromBytes(bytes: Uint8Array): string
objectid.timestamp(id: string): number
objectid.isValid(id: unknown): id is string
objectid.NIL  // "000000000000000000000000"
objectid.MAX  // "ffffffffffffffffffffffff"
```

**Options:**
- `secs?: number` — Timestamp in seconds since Unix epoch (defaults to `Math.floor(Date.now() / 1000)`)
- `random?: Uint8Array` — 5 bytes of random data for the per-process random field
- `counter?: number` — 24-bit counter value (0 to 0xFFFFFF)

> **Note:** ObjectID uses `secs` (seconds), like KSUID, reflecting its native second-precision timestamp. Unlike ULID/UUIDv7/KSUID's sequence counters (which reset when the timestamp advances), ObjectID's `counter` always increments and is independent of the timestamp — it never resets.

### `tsid` (from `uniku/tsid`)

```ts
tsid(options?: TsidOptions): bigint
tsid(options: TsidOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array

tsid.toBytes(id: bigint): Uint8Array
tsid.fromBytes(bytes: Uint8Array): bigint
tsid.toString(id: bigint): string
tsid.fromString(str: string): bigint
tsid.timestamp(id: bigint, epoch?: number): number
tsid.isValid(id: unknown): id is bigint
tsid.NIL  // 0n
tsid.MAX  // 18446744073709551615n
```

**Options:**
- `msecs?: number` — Timestamp in milliseconds (defaults to `Date.now()`)
- `epoch?: number` — Custom epoch in milliseconds (defaults to `1577836800000`, i.e. 2020-01-01T00:00:00.000Z)
- `node?: number` — Node ID (defaults to a lazily-initialized, persistent random value)
- `nodeBits?: number` — Bits allocated to the node ID (0-20, default 10; `counterBits = 22 - nodeBits`)
- `counter?: number` — Per-millisecond counter (defaults to a fresh random value on a new millisecond, or the previous value incremented by 1 within the same millisecond)

> **Note:** Unlike every other uniku generator, `tsid()` returns a `bigint` by default, not a `string` — TSID's whole value proposition is native numeric storage (e.g. a database `BIGINT` primary key). `toBytes`/`fromBytes`/`timestamp`/`isValid` all operate on that `bigint`, and `toString`/`fromString` are the boundary conversions to/from the 13-character canonical Crockford Base32 string (leading character range `0-9A-Fa-f`).

### `xid` (from `uniku/xid`)

```ts
xid(options?: XidOptions): string
xid(options: XidOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array

xid.toBytes(id: string): Uint8Array
xid.fromBytes(bytes: Uint8Array): string
xid.timestamp(id: string): number
xid.isValid(id: unknown): id is string
xid.NIL  // "00000000000000000000"
xid.MAX  // "vvvvvvvvvvvvvvvvvvvg"
```

**Options:**
- `machineId?: Uint8Array` — First 3 bytes form the runtime identity.
- `processId?: number` — 16-bit process identity.
- `secs?: number` — Timestamp in seconds since Unix epoch.
- `counter?: number` — 24-bit counter; explicit values do not consume shared state.

## CLI

Generate, validate, and inspect IDs from the command line with [`@uniku/cli`](./packages/cli):

```bash
# Install pre-built binary (macOS x64/ARM64, Linux x64/ARM64)
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh

# Or install the v0.2.0 binary release with mise
mise use -g github:jkomyno/uniku@uniku-cli-v0.2.0

# Or install via npm
pnpm add -g @uniku/cli

# Generate IDs
uniku uuid --uuid-version 7 --count 3
uniku nanoid --size 12 --alphabet hex

# Validate an ID (type auto-detected)
uniku validate 018e5e5c-7c8a-7000-8000-000000000000

# Inspect an ID's metadata
uniku inspect 018e5e5c-7c8a-7000-8000-000000000000
```

See the [CLI README](./packages/cli/README.md) for the full list of commands and options.

## Stability

The [`uniku@1.x` stability contract](./docs/STABILITY.md) defines the supported
entry points, runtimes, input boundaries, performance goals, and release gates.
It also records the v1 migration from `uniku/cuid2` to `uniku/cuid/v2`.

## Related Projects

Third-party libraries that inspired this project:

- [uuid](https://github.com/uuidjs/uuid): the most popular UUID library for JavaScript
- [ulid](https://github.com/ulid/javascript): the reference ULID implementation for JavaScript
- [TypeID-JS](https://github.com/jetify-com/typeid-js): official JavaScript implementation of TypeID
- [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2): secure, collision-resistant IDs
- [@owpz/ksuid](https://github.com/owpz/ksuid): K-Sortable Unique Identifier
- [bson](https://github.com/mongodb/js-bson): official MongoDB BSON library, including the ObjectId implementation
- [nanoid](https://github.com/ai/nanoid): tiny, URL-friendly unique string ID generator
- [tsid-ts](https://github.com/yubinTW/tsid-ts): TypeScript implementation of TSID, a Snowflake-style 64-bit Time-Sorted Unique Identifier

Other:

- [pnpm-monorepo-template](https://github.com/jkomyno/pnpm-monorepo-template): the template I used to create this library

## Author

Hi, I'm Alberto Schiabel, aka @jkomyno. You can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- X: [@jkomyno](https://x.com/jkomyno)

## Show Your Support

Give a star if this project helped or inspired you!

## License

MIT — see [LICENSE](./LICENSE)
