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

## Performance

| Generator | uniku vs npm |
|-----------|-------------:|
| ULID      |  **77× faster** |
| CUID2     |   **8× faster** |
| UUID v4   | **1.5× faster** |
| Nanoid    | **1.1× faster** |
| UUID v7   |   npm 1.6× faster* |

<sub>*UUID v7 tradeoff: uniku prioritizes strict monotonic sequencing for database use cases.</sub>

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

| Import | Minified + gzipped |
|--------|-------------------:|
| `uniku/uuid/v4` | ~930 B |
| `uniku/uuid/v7` | ~1.1 KB |
| `uniku/ulid` | ~1.5 KB |
| `uniku/cuid2` | ~1.1 KB* |
| `uniku/nanoid` | ~967 B |

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

## API Reference

### `uuidv4` (from `uniku/uuid/v4`)

```ts
uuidv4(options?: Version4Options): string
uuidv4(options: Version4Options | undefined, buf: Uint8Array, offset?: number): Uint8Array
uuidv4.toBytes(id: string): Uint8Array
uuidv4.fromBytes(bytes: Uint8Array): string
```

### `uuidv7` (from `uniku/uuid/v7`)

```ts
uuidv7(options?: Version7Options): string
uuidv7(options: Version7Options | undefined, buf: Uint8Array, offset?: number): Uint8Array
uuidv7.toBytes(id: string): Uint8Array
uuidv7.fromBytes(bytes: Uint8Array): string
uuidv7.timestamp(id: string): number
uuidv7.isValid(id: string): boolean
```

### `ulid` (from `uniku/ulid`)

```ts
ulid(options?: UlidOptions): string
ulid(options: UlidOptions | undefined, buf: Uint8Array, offset?: number): Uint8Array
ulid.toBytes(id: string): Uint8Array
ulid.fromBytes(bytes: Uint8Array): string
ulid.timestamp(id: string): number
ulid.isValid(id: string): boolean
```

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
```

## Documentation

For advanced usage, examples, and contributing guidelines, see the [full documentation on GitHub](https://github.com/jkomyno/uniku).

## License

MIT — see [LICENSE](https://github.com/jkomyno/uniku/blob/main/LICENSE)
