# uniku

[![npm version](https://img.shields.io/npm/v/uniku.svg)](https://www.npmjs.com/package/uniku)
[![npm downloads](https://img.shields.io/npm/dm/uniku.svg)](https://npmjs.com/package/uniku)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/uniku)](https://bundlephobia.com/package/uniku)
[![CI](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

One library. Every ID format. Every runtime. Zero dependencies.

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

|                    | uniku | uuid | nanoid | ulid | cuid2 |
|--------------------|:-----:|:----:|:------:|:----:|:-----:|
| UUID v4            |   ✅  |  ✅  |   ❌   |  ❌  |   ❌  |
| UUID v7            |   ✅  |  ✅  |   ❌   |  ❌  |   ❌  |
| ULID               |   ✅  |  ❌  |   ❌   |  ✅  |   ❌  |
| CUID2              |   ✅  |  ❌  |   ❌   |  ❌  |   ✅  |
| Nanoid             |   ✅  |  ❌  |   ✅   |  ❌  |   ❌  |
| Tree-shakeable     |   ✅  |  ❌  |   ✅   |  ✅  |   ✅  |
| ESM-only           |   ✅  |  ❌  |   ✅   |  ✅  |   ✅  |
| Edge/Workers       |   ✅  |  ⚠️  |   ✅   |  ⚠️  |   ✅  |
| Byte ↔ String      |   ✅  |  ✅  |   -   |  ✅  |   -  |

> **Note**: Byte ↔ String conversion doesn't make sense for nanoid and cuid2, since they are string-native formats with no canonical binary representation.

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

Benchmarks comparing `uniku` vs the equivalent packages available on npm:

| Generator | uniku vs npm |
|-----------|-------------:|
| ULID      |  **77× faster** |
| CUID2     |   **8× faster** |
| UUID v4   | **1.5× faster** |
| Nanoid    | **1.1× faster** |
| UUID v7   |   npm 1.6× faster* |

<sub>*UUID v7 tradeoff: uniku prioritizes strict monotonic sequencing for database use cases, which adds overhead. Run `pnpm bench` to reproduce.</sub>

## Which ID Should I Use?

| Use Case | Recommended | Why |
|----------|-------------|-----|
| Database primary keys | **UUID v7** or **ULID** | Time-ordered for index efficiency |
| URL shorteners | **Nanoid** | Compact, URL-safe characters |
| Prevent enumeration | **CUID2** | Non-sequential, secure |
| Maximum compatibility | **UUID v4** | Universal standard |
| Distributed systems | **ULID** | Sortable + high entropy |

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
| `uniku/uuid/v4` | ~930 B |
| `uniku/uuid/v7` | ~1.1 KB |
| `uniku/ulid` | ~1.5 KB |
| `uniku/cuid2` | ~1.1 KB* |
| `uniku/nanoid` | ~967 B |

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

### CUID2 (secure, non-time-ordered)

CUID2 generates secure, collision-resistant identifiers using SHA3-512 hashing. Unlike time-ordered IDs, CUID2 prevents enumeration attacks:

```ts
import { cuid2 } from 'uniku/cuid2'

// Generate a CUID2 string
const id = cuid2()
// => "pfh0haxfpzowht3oi213cqos"

// Custom length (2-32 characters)
const shortId = cuid2({ length: 10 })
// => "tz4a98xxat"

// Validation (type guard)
const maybeId: unknown = getUserInput()
if (cuid2.isValid(maybeId)) {
  console.log(maybeId) // TypeScript knows this is a string
}
```

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

## API

### `uuidv4` (from `uniku/uuid/v4`)

```ts
uuidv4(options?: Version4Options): string
uuidv4(options: Version4Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv4.toBytes(id: string): Uint8Array
uuidv4.fromBytes(bytes: Uint8Array): string
```

**Options:**
- `random?: Uint8Array` — 16 bytes of random data (note: bytes at index 6 and 8 will be modified in-place)

### `uuidv7` (from `uniku/uuid/v7`)

```ts
uuidv7(options?: Version7Options): string
uuidv7(options: Version7Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv7.toBytes(id: string): Uint8Array
uuidv7.fromBytes(bytes: Uint8Array): string
uuidv7.timestamp(id: string): number
uuidv7.isValid(id: string): boolean
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
ulid.isValid(id: string): boolean
```

**Options:**
- `msecs?: number` — Timestamp in milliseconds (defaults to `Date.now()`)
- `random?: Uint8Array` — 16 bytes of random data (only first 10 bytes used)

### `cuid2` (from `uniku/cuid2`)

```ts
cuid2(options?: Cuid2Options): string
cuid2.isValid(id: unknown): id is string
```

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
```

**Options:**
- `size?: number` — ID length (default 21, max 2048)
- `alphabet?: string` — Custom alphabet (2-256 printable ASCII characters)
- `random?: Uint8Array` — Custom random bytes for testing

Note: `isValid()` only validates IDs against the default URL-safe alphabet (`A-Za-z0-9_-`). IDs generated with custom alphabets cannot be validated with this method.

## Related Projects

Third-party libraries that inspired this project:

- [uuid](https://github.com/uuidjs/uuid): the most popular UUID library for JavaScript
- [ulid](https://github.com/ulid/javascript): the reference ULID implementation for JavaScript
- [cuid2](https://github.com/paralleldrive/cuid2): secure, collision-resistant IDs
- [nanoid](https://github.com/ai/nanoid): tiny, URL-friendly unique string ID generator

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
