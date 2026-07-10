# @uniku/cli

## 0.5.0

### Minor Changes

- 4f2ee6b: Publish a standalone Linux ARM64 CLI binary alongside the existing Linux x64/amd64 and macOS binaries. The installer now detects both `aarch64` and `arm64` Linux hosts and downloads the matching release asset.
- 16bbd47: Add TSID generation, validation, and inspection support to the CLI, including `--timestamp` (milliseconds), `--node`, and `--node-bits` flags for `generate tsid`, and a `uniku tsid` shorthand. Fixes auto-detection so 13-character TSID strings are not misclassified as CUID2 or Nanoid.

### Patch Changes

- a4d4bf5: Internal maintenance, no user-facing behavior change:

  - Derive the `IdType` type and the `--type` flag choices for `inspect` / `validate` from `uniku`'s canonical `ID_GENERATORS` list instead of three hand-maintained copies of the union. The `--type` values and their order are unchanged.
  - Switch the CUID call sites to the new `uniku/cuid/v2` import (the `--type cuid` value and `type: 'cuid'` output field are unchanged).

- Updated dependencies [c6ebcb2]
- Updated dependencies [a4d4bf5]
  - uniku@0.3.0

## 0.4.0

### Minor Changes

- 4260e04: Add MongoDB ObjectID generation, validation, and inspection support to the CLI, including a `--timestamp` flag for `generate objectid` and a `uniku objectid` shorthand. Fixes auto-detection so ObjectIDs starting with a hex letter (`a`-`f`) are no longer misclassified as CUID2.

### Patch Changes

- Updated dependencies [6937984]
- Updated dependencies [d624956]
  - uniku@0.2.0

## 0.3.0

### Minor Changes

- 9fbcb4e: Add TypeID generation, validation, and inspection support to the CLI.

### Patch Changes

- Updated dependencies [de11ff7]
- Updated dependencies [acdef71]
  - uniku@0.1.0

## 0.2.0

### Minor Changes

- 0d491a6: Package standalone CLI release archives with an internal `uniku` executable name, and document mise-based binary installs.

## 0.1.0

### Minor Changes

- 90ddc48: Port the CLI from Effect v3 to Effect v4 (pinned to the exact `effect@4.0.0-beta.93` prerelease; betas may break between releases, so the pin is deliberate). `@effect/cli` and `@effect/platform` are gone — the CLI framework now comes from `effect/unstable/cli` and platform services from `@effect/platform-bun@4.0.0-beta.93`.

  Core behavior is preserved: `--help`, `--version`/`-V`, JSON output, stdin validation, `--quiet`, and exit codes 0/1/2 all work as before, including `uniku validate -- <id>` end-of-options usage (also for IDs that start with a dash).

  New capabilities from the Effect v4 CLI engine: `-v` also prints the version at the root level, and `--completions <shell>` and `--log-level <level>` global flags are available.

  Known behavior differences from the new parser:

  - `--version` output is now `uniku v<version>` instead of the bare version number.
  - A value-taking flag passed without a value (e.g. `uniku uuid --uuid-version`) now silently falls back to the flag's default instead of erroring.
  - Negative numbers passed to numeric flags (e.g. `--count -1`) now fail with a parse error instead of being accepted silently.

### Patch Changes

- 052def6: Every command's `--help` output now ends with an EXAMPLES section showing concrete invocations, geared toward machine consumers as much as humans: pairing `--json` with `-n` to get a JSON array of IDs, piping IDs through `validate --stdin --json`, exit-code-only checks with `--quiet`, and inspecting dash-leading IDs via `--`.

## 0.0.13

### Patch Changes

- 3d49de0: Add the CLI bin shebang so npm global installs can execute `uniku` directly.
- 10caf59: Fix CLI error handling so invalid generator timestamps use friendly errors, JSON mode emits structured error output, and Effect CLI validation errors do not append `[object Object]`.
- 9e7c17f: Rename the UUID generator's long version flag to `--uuid-version` so `uniku uuid --version` remains the CLI version flag.
- 4ed2169: Harden CLI installers by creating missing install directories, keeping shell install POSIX-compatible, paginating release lookup, and applying chmod with sudo when needed.
- bfc9126: Correct published metadata by lowering the Node engine floor to Node 20.19 and documenting the CUID2 `@noble/hashes` runtime dependency in the READMEs.
- 9cd7fee: Harden the background update check by negative-caching failed fetches, reducing exit delay, scoping the temp cache per user, and rejecting unsafe prerelease strings.
- Updated dependencies [9a6a9b7]
- Updated dependencies [12ead93]
- Updated dependencies [bfc9126]
- Updated dependencies [816101a]
- Updated dependencies [4cb29cc]
- Updated dependencies [874718e]
- Updated dependencies [49d6a98]
  - uniku@0.0.13

## 0.0.12

### Patch Changes

- 7c75ebb: Add background update check.
- Updated dependencies [7c75ebb]
  - uniku@0.0.12

## 0.0.11

### Patch Changes

- e11e50a: Add CLI
- Updated dependencies [e11e50a]
  - uniku@0.0.11
