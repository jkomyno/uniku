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

|                    | uniku | [uuid](https://github.com/uuidjs/uuid) | [typeid-js](https://github.com/jetify-com/typeid-js) | [nanoid](https://github.com/ai/nanoid) | [ulid](https://github.com/ulid/javascript) | [cuid2](https://github.com/paralleldrive/cuid2) | [ksuid](https://github.com/owpz/ksuid) | [bson](https://github.com/mongodb/js-bson) |
|--------------------|:-----:|:----:|:---------:|:------:|:----:|:-----:|:-----:|:-----:|
| UUID v4            |   ✅  |  ✅  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |
| UUID v7            |   ✅  |  ✅  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |
| TypeID             |   ✅  |  ❌  |     ✅    |   ❌   |  ❌  |   ❌  |   ❌  |   ❌  |
| Nanoid             |   ✅  |  ❌  |     ❌    |   ✅   |  ❌  |   ❌  |   ❌  |   ❌  |
| ULID               |   ✅  |  ❌  |     ❌    |   ❌   |  ✅  |   ❌  |   ❌  |   ❌  |
| CUID2              |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ✅  |   ❌  |   ❌  |
| KSUID              |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ✅  |   ❌  |
| ObjectID           |   ✅  |  ❌  |     ❌    |   ❌   |  ❌  |   ❌  |   ❌  |   ✅  |
| Tree-shakeable     |   ✅  |  ✅  |     ✅    |   ✅   |  ✅  |   ✅  |   ❌  |   ❌  |
| ESM-only           |   ✅  | ✅¹  |     ❌    |   ✅   |  ❌  |   ✅  |   ❌  |   ❌  |
| Edge/Workers       |   ✅  |  ✅  |     ✅    |   ✅   |  ⚠️  |   ✅  |  ⚠️  |  ⚠️  |
| Byte ↔ String      |   ✅  |  ✅  |     ✅    |   -    |  ⚠️²  |   -   |   ✅  |   ✅  |

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

## Performance

| Generator | uniku vs npm |
|-----------|-------------:|
| ULID      | **85× faster** |
| CUID2     | **8× faster** |
| KSUID     | **1.5× faster** |
| ObjectID  | **1.1× faster** |
| UUID v7   | **1.1× faster**  |
| Nanoid    | **~comparable speed** |
| Nanoid (10 chars) | npm is 1.1× faster |
| TypeID    | **2.6× faster** |
| UUID v4   | npm is 1.1× faster |

## Which ID Should I Use?

### Quick Recommendations

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

### Detailed Guide

**UUID v4** — Use when you need maximum compatibility with existing systems.
- 36 characters, 122-bit entropy
- Universally supported by databases (native `UUID` type)
- Not time-ordered (random distribution)
- Best for: Legacy systems, cross-platform compatibility

**UUID v7** — Use for database primary keys when you need RFC compliance.
- 36 characters, time-ordered with millisecond precision
- Native database support as `UUID` type
- Strictly monotonic within same millisecond
- Best for: PostgreSQL/MySQL primary keys, API identifiers

**ULID** — Use for database primary keys when you want URL-safe IDs.
- 26 characters, time-ordered with millisecond precision
- URL-safe (no hyphens), case-insensitive
- 80-bit random entropy per millisecond
- Best for: APIs, URLs, distributed systems needing sortability

**TypeID** — Use when API IDs should expose their entity type.
- Prefix plus 26-character UUID v7 suffix, e.g. `user_01h2xcejqtf2nbrexx3vqjhp41`
- Empty prefix support for canonical 26-character TypeIDs
- Time-ordered through UUID v7, with lowercase snake_case type prefixes
- Best for: Public API identifiers, logs, debugging, domain-specific IDs

**KSUID** — Use when you need highest collision resistance.
- 27 characters, time-ordered with second precision
- URL-safe, 128-bit random entropy (highest of all formats)
- Best for: Very high-volume distributed systems, event sourcing

**ObjectID** — Use when you need drop-in compatibility with MongoDB.
- 24-character lowercase hex, time-ordered with second precision
- 4-byte timestamp + 5-byte per-process random + 3-byte always-incrementing counter
- Counter never resets on a new timestamp (unlike ULID/UUIDv7/KSUID sequences)
- Best for: MongoDB `_id` fields, systems already speaking the ObjectID wire format

**Nanoid** — Use for short, URL-friendly identifiers.
- 21 characters (configurable), 126-bit entropy
- Customizable alphabet and length
- Not time-ordered
- Best for: URL shorteners, session tokens, invite codes

**CUID2** — Use when ID unpredictability matters.
- 24 characters (configurable), hash-based
- Non-sequential, prevents enumeration attacks
- Not time-ordered
- Best for: User-facing IDs where security matters

### Binary Serialization: When to Use `toBytes()`

Formats with binary representations (UUID, ULID, KSUID, ObjectID) support `toBytes()` and `fromBytes()` for efficient storage:

```ts
// Store as BINARY(16) instead of VARCHAR(36)
const bytes = uuidv7.toBytes(id)  // 16 bytes
db.insert({ id: bytes })

// Retrieve and convert back
const id = uuidv7.fromBytes(row.id)
```

**Benefits of binary storage:**
- **Up to 50% smaller**: E.g., 16 bytes vs 36 characters for UUID
- **Faster indexing**: Binary comparison is faster than string comparison
- **Reduced I/O**: Less data transferred between app and database

**When to use binary:**
- High-volume tables (millions of rows)
- Performance-critical queries on ID columns
- Storage cost is a concern

**When to keep strings:**
- Debugging/logging convenience
- API responses (humans read them)
- Small tables where savings are negligible

| Format | String Length | Binary Size | Savings |
|--------|--------------|-------------|---------|
| UUID v4/v7 | 36 chars | 16 bytes | 56% |
| ULID | 26 chars | 16 bytes | 38% |
| TypeID | prefix + 27 chars | 16 bytes | prefix-dependent |
| KSUID | 27 chars | 20 bytes | 26% |
| ObjectID | 24 chars | 12 bytes | 50% |
| Nanoid | 21 chars | N/A | - |
| CUID2 | 24 chars | N/A | - |

> **Note**: Nanoid and CUID2 don't have binary representations because they're string-native formats with no canonical byte encoding.

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

| Import | Minified + gzipped |
|--------|-------------------:|
| `uniku/uuid/v4` | ~1.1 KB |
| `uniku/uuid/v7` | ~1.4 KB |
| `uniku/ulid` | ~1.8 KB |
| `uniku/typeid` | ~1.6 KB |
| `uniku/cuid2` | ~1007 B* |
| `uniku/nanoid` | ~1.1 KB |
| `uniku/ksuid` | ~1.3 KB |
| `uniku/objectid` | ~1.3 KB |

* The CUID2 entry point imports SHA3-512 from `@noble/hashes`; this table's entry-point size excludes that external dependency.

## Quick Start

### UUID v4 (random)

```ts
import { uuidv4 } from 'uniku/uuid/v4'

const id = uuidv4()
// => "550e8400-e29b-41d4-a716-446655440000"

// Convert to/from bytes
const bytes = uuidv4.toBytes(id)
const str = uuidv4.fromBytes(bytes)
```

### UUID v7 (time-ordered)

```ts
import { uuidv7 } from 'uniku/uuid/v7'

const id = uuidv7()
// => "018e5e5c-7c8a-7000-8000-000000000000"

// IDs are lexicographically sortable by creation time
const ids = [uuidv7(), uuidv7(), uuidv7()]
ids.sort() // Already in creation order
```

### ULID (time-ordered)

```ts
import { ulid } from 'uniku/ulid'

const id = ulid()
// => "01HW9T2W9W9YJ3JZ1H4P4M2T8Q"

// Convert to/from bytes
const bytes = ulid.toBytes(id)
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

```ts
import { cuid2 } from 'uniku/cuid2'

const id = cuid2()
// => "pfh0haxfpzowht3oi213cqos"

// Custom length
const shortId = cuid2({ length: 10 })
// => "tz4a98xxat"

// Validation (type guard)
if (cuid2.isValid(maybeId)) {
  console.log(maybeId) // TypeScript knows this is a string
}
```

### Nanoid (URL-friendly, custom alphabet)

```ts
import { nanoid } from 'uniku/nanoid'

const id = nanoid()
// => "V1StGXR8_Z5jdHi6B-myT"

// Custom size
const shortId = nanoid(10)
// => "IRFa-VaY2b"

// Custom alphabet and size via options
const hexId = nanoid({ alphabet: '0123456789abcdef', size: 12 })
// => "4f90d13a42bc"
```

### KSUID (time-ordered, high entropy)

```ts
import { ksuid } from 'uniku/ksuid'

const id = ksuid()
// => "2QnJjKLvpSfpZqGiPPxVwWLMy2p"

// Convert to/from bytes
const bytes = ksuid.toBytes(id)
const str = ksuid.fromBytes(bytes)

// Extract timestamp (milliseconds)
const ts = ksuid.timestamp(id)
```

### ObjectID (time-ordered, MongoDB-compatible)

```ts
import { objectid } from 'uniku/objectid'

const id = objectid()
// => "667c3f2a1e2b3c4d5e6f7081"

// Convert to/from bytes
const bytes = objectid.toBytes(id)
const str = objectid.fromBytes(bytes)

// Extract timestamp (milliseconds)
const ts = objectid.timestamp(id)
```

## Migrating to uniku

### From `uuid`

```diff
- import { v4 as uuidv4 } from 'uuid'
+ import { uuidv4 } from 'uniku/uuid/v4'
```

### From `nanoid`

```diff
- import { nanoid } from 'nanoid'
+ import { nanoid } from 'uniku/nanoid'
```

### From `ulid`

```diff
- import { ulid } from 'ulid'
+ import { ulid } from 'uniku/ulid'
```

### From `@paralleldrive/cuid2`

```diff
- import { createId } from '@paralleldrive/cuid2'
+ import { cuid2 } from 'uniku/cuid2'
```

### From `@owpz/ksuid`

```diff
- import { KSUID } from '@owpz/ksuid'
+ import { ksuid } from 'uniku/ksuid'

- const id = KSUID.random().toString()
+ const id = ksuid()

- const parsed = KSUID.parse(str)
- const timestamp = parsed.timestamp
+ const timestamp = ksuid.timestamp(str)
```

### From `bson`

```diff
- import { ObjectId } from 'bson'
+ import { objectid } from 'uniku/objectid'

- const id = new ObjectId().toHexString()
+ const id = objectid()

- const timestamp = new ObjectId(str).getTimestamp().getTime()
+ const timestamp = objectid.timestamp(str)
```

## API Reference

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

Use an empty prefix (`typeid('')`) to generate Jetify-compatible prefixless TypeIDs.

### `cuid2` (from `uniku/cuid2`)

```ts
cuid2(options?: Cuid2Options): string
cuid2.isValid(id: unknown): id is string
```

### `nanoid` (from `uniku/nanoid`)

```ts
nanoid(): string
nanoid(size: number): string
nanoid(options: NanoidOptions): string
nanoid.isValid(id: unknown): id is string

// Constant
URL_ALPHABET  // "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
```

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

## Documentation

For advanced usage, examples, and contributing guidelines, see the [full documentation on GitHub](https://github.com/jkomyno/uniku).

## Related Projects

Third-party libraries that inspired this project:

- [uuid](https://github.com/uuidjs/uuid): the most popular UUID library for JavaScript
- [ulid](https://github.com/ulid/javascript): the reference ULID implementation for JavaScript
- [TypeID-JS](https://github.com/jetify-com/typeid-js): official JavaScript implementation of TypeID
- [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2): secure, collision-resistant IDs
- [@owpz/ksuid](https://github.com/owpz/ksuid): K-Sortable Unique Identifier
- [bson](https://github.com/mongodb/js-bson): official MongoDB BSON library, including the ObjectId implementation
- [nanoid](https://github.com/ai/nanoid): tiny, URL-friendly unique string ID generator

Other:

- [pnpm-monorepo-template](https://github.com/jkomyno/pnpm-monorepo-template): the template I used to create this library

## Author

Hi, I'm Alberto Schiabel, aka @jkomyno. You can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- X: [@jkomyno](https://x.com/jkomyno)

## License

MIT — see [LICENSE](https://github.com/jkomyno/uniku/blob/main/LICENSE)
