# uniku

[![npm version](https://img.shields.io/npm/v/uniku.svg)](https://www.npmjs.com/package/uniku)
[![npm downloads](https://img.shields.io/npm/dm/uniku.svg)](https://npmjs.com/package/uniku)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/uniku)](https://bundlephobia.com/package/uniku)
[![CI](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/jkomyno/uniku/actions/workflows/ci.yaml)
[![Documentation](https://img.shields.io/badge/docs-read-5b5bd6.svg)](https://jkomyno.github.io/uniku/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

One library. Every ID format. Every modern JavaScript runtime.

> **uniku** */uˈniːku/* — Maltese for "unique"

[Documentation](https://jkomyno.github.io/uniku/) · [Getting started](https://jkomyno.github.io/uniku/docs/getting-started/) · [Choosing an ID](https://jkomyno.github.io/uniku/docs/guides/choosing-an-id/) · [API reference](https://jkomyno.github.io/uniku/docs/reference/entry-points/) · [CLI](https://jkomyno.github.io/uniku/docs/cli/)

```ts
import { uuidv7 } from 'uniku/uuid/v7'

const id = uuidv7()
// => "018e5e5c-7c8a-7000-8000-000000000000"
```

## Why `uniku`?

- **One focused package** — UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, ObjectID, XID, and TSID.
- **Portable by default** — Runs on Node.js, Bun, Deno, browsers, edge runtimes, and Cloudflare Workers using `globalThis.crypto`.
- **Tree-shakeable entry points** — Import only the generator you use; the package root is intentionally not exported.
- **Useful at system boundaries** — Validate unknown input, convert canonical binary formats to bytes, or write directly into a caller-owned buffer.
- **Small dependency surface** — CUID v2 is the only generator with a runtime dependency (`@noble/hashes`).

## Install

```sh
npm install uniku
```

The [getting-started guide](https://jkomyno.github.io/uniku/docs/getting-started/) also covers pnpm, Bun, and Deno.

## Quick start

Every generator has its own entry point and keeps related operations on the generator function:

```ts
import { uuidv7 } from 'uniku/uuid/v7'

const id = uuidv7()
const bytes = uuidv7.toBytes(id)
const restored = uuidv7.fromBytes(bytes)

if (uuidv7.isValid(restored)) {
  console.log(uuidv7.timestamp(restored))
}
```

There are no barrel exports:

```ts
import { uuidv4 } from 'uniku/uuid/v4'
import { ulid } from 'uniku/ulid'
import { typeid } from 'uniku/typeid'
import { cuidv2 } from 'uniku/cuid/v2'
import { nanoid } from 'uniku/nanoid'
import { ksuid } from 'uniku/ksuid'
import { objectid } from 'uniku/objectid'
import { xid } from 'uniku/xid'
import { tsid } from 'uniku/tsid'
```

## Choose an ID

| Situation | Start with | Why |
| --- | --- | --- |
| Database primary keys | UUID v7 or ULID | Time-ordered values improve index locality |
| Public API resources | TypeID | UUID v7 with a readable, domain-specific prefix |
| Short URLs and invite codes | Nanoid | Compact and URL-safe |
| Values that should resist enumeration | CUID v2 | Non-sequential and secure |
| MongoDB `_id` compatibility | ObjectID | Matches MongoDB's 12-byte ObjectID format |
| Go rs/xid compatibility | XID | Matches rs/xid's text and binary representation |
| Native `BIGINT` storage | TSID | A sortable 64-bit integer rather than a UUID-shaped string |
| Broad standards compatibility | UUID v4 | The conventional random UUID format |

The [choosing guide](https://jkomyno.github.io/uniku/docs/guides/choosing-an-id/) covers ordering, timestamp leakage, storage boundaries, and format-specific trade-offs.

## Documentation

- [Getting started](https://jkomyno.github.io/uniku/docs/getting-started/) — installation, direct imports, validation, and byte helpers
- [Generator reference](https://jkomyno.github.io/uniku/docs/reference/entry-points/) — generated from the public TypeScript signatures and JSDoc
- [Migration guide](https://jkomyno.github.io/uniku/docs/migration/from-other-libraries/) — move from `uuid`, `nanoid`, `ulid`, CUID2, KSUID, BSON, TSID, or XID libraries
- [Performance and bundle size](https://jkomyno.github.io/uniku/docs/guides/performance/) — benchmark methodology, current measurements, and reproduction commands
- [Stability contract](https://github.com/jkomyno/uniku/blob/main/docs/STABILITY.md) — the entry points and compatibility policy planned for `uniku@1.0.0`

## CLI companion

`@uniku/cli` generates, validates, and inspects IDs from a terminal or shell pipeline. Install the current standalone binary:

```sh
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh

uniku uuid -v 7
uniku validate 018e5e5c-7c8a-7000-8000-000000000000
uniku inspect 018e5e5c-7c8a-7000-8000-000000000000
```

See the [CLI documentation](https://jkomyno.github.io/uniku/docs/cli/) for package-manager installs and the complete command reference.

## Contributing

See [CONTRIBUTING.md](https://github.com/jkomyno/uniku/blob/main/CONTRIBUTING.md) for the development workflow, tests, benchmarks, and preview releases.

## License

MIT © [Alberto Schiabel](https://github.com/jkomyno)
