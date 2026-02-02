# uniku

[![npm version](https://img.shields.io/npm/v/uniku.svg)](https://www.npmjs.com/package/uniku)
[![CI](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/uniku)](https://bundlephobia.com/package/uniku)

Minimal, tree-shakeable UUID and ULID utilities for every JavaScript runtime.

> *uniku* means "unique" in Maltese.

## Why uniku?

- **ESM-only** - No CommonJS or legacy support.
- **Universal runtime support** - Works everywhere: Node.js, Cloudflare Workers, Vercel Edge, Deno, browsers. Uses the WebCrypto API (`globalThis.crypto`), not `node:crypto`.
- **Truly tree-shakeable** - Separate entry points mean you only bundle what you import. No barrel exports that defeat dead-code elimination.
- **Byte-level access** - Convert between UUID strings and `Uint8Array` with built-in `toBytes()` and `fromBytes()` helpers.
- **Modern standards** - Includes UUID v7 (RFC 9562) for time-ordered, sortable identifiers with monotonic sequencing.
- **Lightweight** - Designed for use in performance-sensitive contexts like ORMs.

## Supported ID generation algorithms

- UUID v4 ([RFC 4122](../../rfcs/rfc4122.txt))
- UUID v7 ([RFC 9562](../../rfcs/rfc9562.txt), time-ordered, monotonic sequencing)
- ULID ([spec](../../rfcs/ulid.txt), time-ordered, monotonic sequencing)
- CUID2 ([spec](../../rfcs/cuid2.txt), secure, non-time-ordered)

## Installation

With pnpm:

```bash
pnpm add uniku
```

With Bun:

```bash
bun install uniku
```

With npm:

```bash
npm install uniku
```

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
const maybeId: unknown = getUserInput()
if (cuid2.isValid(maybeId)) {
  console.log(maybeId) // TypeScript knows this is a string
}
```

## API Reference

### `uuidv4` (from `uniku/uuid/v4`)

```ts
uuidv4(options?: Version4Options): string
uuidv4(options: Version4Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv4.toBytes(id: string): Uint8Array
uuidv4.fromBytes(bytes: Uint8Array): string
```

**Options:**
- `random?: Uint8Array` - 16 bytes of random data

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
- `msecs?: number` - Timestamp in milliseconds (defaults to `Date.now()`)
- `seq?: number` - Sequence number for monotonicity
- `random?: Uint8Array` - 16 bytes of random data

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
- `msecs?: number` - Timestamp in milliseconds (defaults to `Date.now()`)
- `random?: Uint8Array` - 16 bytes of random data (only first 10 bytes used)

### `cuid2` (from `uniku/cuid2`)

```ts
cuid2(options?: Cuid2Options): string
cuid2.isValid(id: unknown): id is string
```

**Options:**
- `length?: number` - ID length (2-32, default 24)
- `random?: Uint8Array` - Custom random bytes for testing

Note: Unlike UUID and ULID, CUID2 does not provide `toBytes`/`fromBytes` because it is a string-native format with no canonical binary representation.

## Documentation

For advanced usage, examples, and contributing guidelines, see the [full documentation on GitHub](https://github.com/jkomyno/uniku).

## License

MIT - see [LICENSE](https://github.com/jkomyno/uniku/blob/main/LICENSE)
