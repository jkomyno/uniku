# @uniku/cli

[![npm version](https://img.shields.io/npm/v/@uniku/cli.svg)](https://www.npmjs.com/package/@uniku/cli)
[![Documentation](https://img.shields.io/badge/docs-CLI-5b5bd6.svg)](https://jkomyno.github.io/uniku/docs/cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Generate, validate, and inspect IDs from a terminal or shell pipeline. The CLI supports every format in `uniku`: UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, ObjectID, XID, and TSID.

[CLI documentation](https://jkomyno.github.io/uniku/docs/cli/) · [GitHub releases](https://github.com/jkomyno/uniku/releases) · [Library documentation](https://jkomyno.github.io/uniku/)

## Install

Install the current standalone binary on macOS or Linux without requiring Node.js:

```sh
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh
```

Or install the npm package:

```sh
npm install -g @uniku/cli
```

The [installation guide](https://jkomyno.github.io/uniku/docs/cli/#install) also covers pnpm, Bun, mise, custom install directories, and version pinning.

## Quick start

```sh
# Generate a time-ordered UUID v7
uniku uuid -v 7

# Generate five TypeIDs as JSON
uniku typeid --prefix user --count 5 --json

# Validate or inspect an existing ID
uniku validate 018e5e5c-7c8a-7000-8000-000000000000
uniku inspect 018e5e5c-7c8a-7000-8000-000000000000

# Discover every command and option
uniku --help
```

Top-level generator commands also work under `uniku generate <type>`. Use `--json` when output feeds another program.

See the [complete command reference](https://jkomyno.github.io/uniku/docs/cli/) for generator-specific flags, stdin validation, exit codes, timestamp units, and structured output.

## Platform support

The standalone binary supports macOS x64/arm64 and Linux x64/arm64. The npm package requires Node.js `>=20.19.0`.

The library and CLI publish independently and may have different version numbers.

## License

MIT © [Alberto Schiabel](https://github.com/jkomyno)
