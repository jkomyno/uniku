# uniku

[![npm version](https://img.shields.io/npm/v/uniku.svg)](https://www.npmjs.com/package/uniku)
[![CI](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

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

- UUID v4 ([RFC 4122](./rfcs/rfc4122))
- UUID v7 ([RFC 9562](./rfcs/rfc9562), time-ordered, monotonic sequencing)
- ULID ([spec](https://github.com/ulid/spec), time-ordered, monotonic sequencing)
- CUID2 ([spec](./rfcs/cuid2.txt), secure, non-time-ordered)
- Nanoid ([spec](./rfcs/nanoid.txt), URL-friendly, custom alphabet support)

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

### Preview releases

Every pull request gets a preview release via [pkg.pr.new](https://pkg.pr.new). Install directly from a PR:

```bash
pnpm add https://pkg.pr.new/jkomyno/uniku@<pr-number>
```

## Usage

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

UUID v7 embeds a timestamp, making IDs sortable by creation time - ideal for database primary keys:

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

## API

### `uuidv4` (from `uniku/uuid/v4`)

```ts
uuidv4(options?: Version4Options): string
uuidv4(options: Version4Options | undefined, buf: Uint8Array, offset?: number): Uint8Array

uuidv4.toBytes(id: string): Uint8Array
uuidv4.fromBytes(bytes: Uint8Array): string
```

**Options:**
- `random?: Uint8Array` - 16 bytes of random data (note: bytes at index 6 and 8 will be modified in-place)

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

### `nanoid` (from `uniku/nanoid`)

```ts
nanoid(): string
nanoid(size: number): string
nanoid(options: NanoidOptions): string
nanoid.isValid(id: unknown): id is string
```

**Options:**
- `size?: number` - ID length (default 21, max 2048)
- `alphabet?: string` - Custom alphabet (2-256 printable ASCII characters)
- `random?: Uint8Array` - Custom random bytes for testing

Note: `isValid()` only validates IDs against the default URL-safe alphabet (`A-Za-z0-9_-`). IDs generated with custom alphabets cannot be validated with this method.

## Related projects

- [uuid](https://github.com/uuidjs/uuid): one of the main ispirations for this library
- [pnpm-monorepo-template](https://github.com/jkomyno/pnpm-monorepo-template): the template I used to create this library

## Author

Hi, I'm Alberto Schiabel, you can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- X: [@jkomyno](https://x.com/jkomyno)

## Show your support

Give a star if this project helped or inspired you!

## License

MIT - see [LICENSE](./LICENSE)
