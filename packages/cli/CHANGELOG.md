# @uniku/cli

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
