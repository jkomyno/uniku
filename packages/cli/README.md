# @uniku/cli

[![npm version](https://img.shields.io/npm/v/@uniku/cli.svg)](https://www.npmjs.com/package/@uniku/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Command-line tool for generating, validating, and inspecting unique identifiers.

Supports UUID v4/v7, ULID, TypeID, CUID2, Nanoid, KSUID, MongoDB ObjectID, TSID, and XID.

## Installation

### Pre-built Binary (recommended)

Download and install a standalone binary — no Node.js required:

```bash
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh
```

Supports macOS (Intel and Apple Silicon) and Linux (x64/amd64 and ARM64). Override the install location or version with environment variables:

```bash
# Custom install directory
UNIKU_INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh

# Specific version
UNIKU_VERSION=0.2.0 curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh
```

### mise

Install the `uniku-cli-v0.2.0` GitHub release binary with [mise](https://mise.jdx.dev):

```bash
mise use -g github:jkomyno/uniku@uniku-cli-v0.2.0
```

This uses the exact CLI release tag.

### npm

```bash
# pnpm (recommended)
pnpm add -g @uniku/cli

# npm
npm install -g @uniku/cli

# bun
bun add -g @uniku/cli
```

## Usage

### Generate IDs

```bash
# UUID v4 (default)
uniku uuid
# => 550e8400-e29b-41d4-a716-446655440000

# UUID v7 (time-ordered)
uniku uuid --uuid-version 7
# => 018e5e5c-7c8a-7000-8000-000000000000

# Generate multiple IDs
uniku uuid --count 5

# ULID
uniku ulid
# => 01HW9T2W9W9YJ3JZ1H4P4M2T8Q

# TypeID
uniku typeid --prefix user
# => user_01h2xcejqtf2nbrexx3vqjhp41

# Monotonically increasing ULIDs
uniku ulid --monotonic --count 3

# Nanoid (custom size and alphabet)
uniku nanoid --size 12 --alphabet hex

# CUID2 (custom length)
uniku cuid --length 16

# KSUID
uniku ksuid

# MongoDB ObjectID
uniku objectid
# => 66e1a8d3f1c2b3a4d5e6f7a8

# ObjectID for a fixed Unix timestamp (s)
uniku objectid --timestamp 1720000000

# TSID (64-bit Snowflake-style, time-sorted)
uniku tsid
# => 0QXW2CK4XZM2A

# TSID for a fixed Unix timestamp (ms) - note: milliseconds, unlike ObjectID/KSUID's seconds
uniku tsid --timestamp 1720000000000

# TSID for a fixed node ID
uniku tsid --node 42 --node-bits 10

# XID (time-sortable, lowercase base32hex)
uniku xid
# => 9m4e2mr0ui3e8a215n4g

# XID for a fixed Unix timestamp (s)
uniku xid --timestamp 1720000000

# Output as JSON
uniku uuid --count 3 --json
```

All generate commands also work under `uniku generate <type>` (e.g., `uniku generate uuid`).

### Validate IDs

```bash
# Validate a single ID (type auto-detected)
uniku validate 018e5e5c-7c8a-7000-8000-000000000000

# Validate with explicit type
uniku validate --type ulid 01HW9T2W9W9YJ3JZ1H4P4M2T8Q

# Validate a TypeID
uniku validate --type typeid user_01h2xcejqtf2nbrexx3vqjhp41

# Batch validate from stdin
echo -e "018e5e5c-7c8a-7000-8000-000000000000\ninvalid-id" | uniku validate --stdin

# Quiet mode (exit code only: 0 = valid, 2 = invalid)
uniku validate --quiet 018e5e5c-7c8a-7000-8000-000000000000

# JSON output
uniku validate --json 018e5e5c-7c8a-7000-8000-000000000000
```

### Inspect IDs

```bash
# Decode metadata from an ID (type auto-detected)
uniku inspect 018e5e5c-7c8a-7000-8000-000000000000

# Inspect with explicit type
uniku inspect --type ulid 01HW9T2W9W9YJ3JZ1H4P4M2T8Q

# Inspect TypeID metadata
uniku inspect user_01h2xcejqtf2nbrexx3vqjhp41

# JSON output
uniku inspect --json 018e5e5c-7c8a-7000-8000-000000000000
```

For time-ordered IDs (UUID v7, ULID, TypeID, KSUID, ObjectID, TSID, XID), inspect extracts the embedded timestamp. For random-only IDs (UUID v4, CUID2, Nanoid), it reports that no decodable metadata is available. Timestamp precision varies by generator: UUID v7, ULID, and TSID are millisecond-precision, while KSUID, ObjectID, and XID are second-precision.

## Commands Reference

| Command | Description |
|---------|-------------|
| `uniku uuid` | Generate UUIDs (v4 or v7) |
| `uniku ulid` | Generate ULIDs |
| `uniku typeid` | Generate TypeIDs |
| `uniku nanoid` | Generate Nanoids |
| `uniku cuid` | Generate CUIDs (v2) |
| `uniku ksuid` | Generate KSUIDs |
| `uniku objectid` | Generate MongoDB ObjectIDs |
| `uniku tsid` | Generate TSIDs (64-bit Snowflake-style, time-sorted) |
| `uniku xid` | Generate XIDs |
| `uniku validate <id>` | Check if an ID is valid |
| `uniku inspect <id>` | Decode and inspect an ID |

### Common Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--count` | `-n` | Number of IDs to generate (default: 1) |
| `--json` | | Output as JSON |
| `--help` | | Show help |
| `--version` | `-V` | Show version |

### Generator-Specific Options

| Command | Option | Alias | Description |
|---------|--------|-------|-------------|
| `uuid` | `--uuid-version` | `-v` | UUID version: 4 or 7 (default: 4) |
| `uuid` | `--lowercase` | | Output in lowercase |
| `ulid` | `--monotonic` | | Generate monotonically increasing ULIDs |
| `ulid` | `--timestamp` | | Unix timestamp in ms or "now" |
| `ulid` | `--lowercase` | | Output in lowercase |
| `typeid` | `--prefix` | `-p` | Type prefix, e.g. `user` for `user_...` |
| `nanoid` | `--size` | `-s` | Length of ID, 1-256 (default: 21) |
| `nanoid` | `--alphabet` | `-a` | Custom alphabet or preset: hex, numeric, alpha |
| `cuid` | `--length` | `-l` | Length of ID, 2-32 (default: 24) |
| `ksuid` | `--timestamp` | | Unix timestamp in seconds or "now" |
| `objectid` | `--timestamp` | | Unix timestamp in seconds or "now" |
| `tsid` | `--timestamp` | | Unix timestamp in milliseconds or "now" |
| `tsid` | `--node` | | Node ID (0 to 2^node-bits - 1) |
| `tsid` | `--node-bits` | | Number of bits allocated to the node ID, 0-20 (default: 10) |
| `xid` | `--timestamp` | | Unix timestamp in seconds or "now" |

### Validate Options

| Option | Description |
|--------|-------------|
| `--type` | Expected ID type: uuid, ulid, typeid, nanoid, cuid, ksuid, objectid, tsid, xid (auto-detected if omitted) |
| `--stdin` | Read IDs from stdin (one per line) |
| `--quiet` | No output, exit code only (0 = valid, 2 = invalid) |
| `--json` | Output as JSON |

### Inspect Options

| Option | Description |
|--------|-------------|
| `--type` | ID type: uuid, ulid, typeid, nanoid, cuid, ksuid, objectid, tsid, xid (auto-detected if omitted) |
| `--json` | Output as JSON |

## Tech Stack

- [Effect](https://effect.website/) — functional effect system for TypeScript
- [@effect/cli](https://github.com/Effect-TS/effect/tree/main/packages/cli) — CLI framework built on Effect
- [@effect/platform](https://github.com/Effect-TS/effect/tree/main/packages/platform) — platform abstraction layer
- [Bun](https://bun.sh/) — JavaScript runtime
- [uniku](https://github.com/jkomyno/uniku) — core ID generation library

## License

MIT — see [LICENSE](https://github.com/jkomyno/uniku/blob/main/LICENSE)
