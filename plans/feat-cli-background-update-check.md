# feat: Background update check for `@uniku/cli`

## Overview

Add a non-blocking, background version check to `@uniku/cli` that notifies users when a new version is available. Inspired by [Polar CLI](https://github.com/polarsource/cli)'s update-check implementation, adapted for Effect's structured concurrency model.

The check runs as a background Effect fiber on every CLI invocation, queries the npm registry, caches the result for 24 hours, and displays a notification on stderr after the main command completes — without adding any new runtime dependencies.

## Problem Statement / Motivation

Users running outdated versions of `@uniku/cli` have no way to know that a newer version exists. They may miss bug fixes, new ID generators, or performance improvements. A background update notification — a well-established CLI pattern used by npm, Wrangler, Vercel CLI, and GitHub CLI — solves this by surfacing actionable information at the right time.

## Proposed Solution

Implement a zero-dependency update checker using `@effect/platform`'s `HttpClient` and `FileSystem` (already in the dependency tree). The architecture follows the Polar CLI pattern but uses Effect fibers instead of fire-and-forget promises:

```
CLI startup (bin.ts)
    |
    +---> Fork background fiber: UpdateCheckService.check()
    |         |
    |         +---> Read cache file from os.tmpdir()
    |         +---> If stale (>24h): fetch npm registry with 5s timeout
    |         +---> Compare versions with semver.gt()
    |         +---> Write cache file (atomic: write tmp + rename)
    |
    +---> Run main CLI command (generate, validate, inspect, etc.)
    |
    +---> Join fiber with 5s timeout
    |         |
    |         +---> If update available: print notification to stderr
    |         +---> If timeout/error: silently abandon
    |
    +---> Process exits
```

## Technical Considerations

### Architecture

- **Effect Service pattern**: Create an `UpdateCheckService` (Context.Tag) following the existing `OutputService`/`StdinService` pattern. This enables full testability via mock implementations.
- **Fiber-based concurrency**: Use `Effect.fork` to run the check concurrently with the main command. Use `Fiber.join` with `Effect.timeout(Duration.seconds(5))` to bound the worst-case delay.
- **No new dependencies**: Use `@effect/platform`'s `HttpClient` for the registry fetch and `FileSystem` for caching. Use a simple string comparison for semver (or a minimal inline comparator) to avoid pulling in the `semver` package.

### Performance

- **Zero startup overhead**: The fiber is forked immediately; the main command runs without waiting.
- **5-second timeout on join**: After the main command completes, wait at most 5 seconds for the fiber. If the network is slow, the notification is simply skipped this time — the cached result will be used on the next invocation.
- **24-hour cache TTL**: At most one HTTP request per day per user. The npm registry endpoint (`/latest`) returns ~2KB of JSON.
- **Cached path is hot**: When the cache is fresh, the fiber reads one small JSON file and returns immediately — effectively free.

### Skip conditions (no check is performed)

The update check is entirely skipped when any of these conditions are true:
- `process.env.NO_UPDATE_NOTIFIER` is set (any truthy value)
- `process.env.CI` is set (covers GitHub Actions, GitLab CI, CircleCI, Travis, etc.)
- `process.stderr` is not a TTY (covers piped stderr, redirected stderr)
- `process.env.NODE_ENV === 'test'`

### Notification display

- Written to `process.stderr` (never pollutes stdout)
- Suppressed when `--json` flag is detected in `process.argv` (machine-readable mode)
- Respects `NO_COLOR` environment variable for ANSI styling
- Shown even after `--help`, `--version`, `--quiet`, and failed commands

### Installation method detection

- **npm installs**: Notification says `Run \`npm install -g @uniku/cli\` to update`
- **Standalone binaries**: Notification says `Download at https://github.com/jkomyno/uniku/releases`
- Detection via build-time `--define` flag: `bun build --compile --define __STANDALONE_BINARY__=true`
- The tsdown (npm) build does not set this define, so it defaults to `false`

### Cache specification

| Aspect | Value |
|--------|-------|
| **Location** | `os.tmpdir()/uniku-update-check.json` |
| **Schema** | `{ latestVersion: string, checkedAt: number }` |
| **TTL** | 24 hours (86,400,000 ms) |
| **Write strategy** | Write to `.tmp` file, then `rename()` for atomicity |
| **Corruption recovery** | Treat JSON parse errors as cache miss; delete and re-fetch |
| **Permissions** | Default file permissions (user-only on macOS tmpdir) |

### npm registry endpoint

```
GET https://registry.npmjs.org/@uniku%2Fcli/latest
Accept: application/json
User-Agent: @uniku/cli/<version>
```

Response: `{ "version": "0.1.0", ... }` — only the `version` field is used.

Timeout: 5 seconds via `AbortSignal.timeout(5000)` or `Effect.timeout`.

## Acceptance Criteria

### Functional

- [x] Running any `uniku` command checks for updates in the background (forked fiber)
- [x] When a newer version exists on npm, a notification is printed to stderr after the main command output
- [x] The npm registry is queried at most once every 24 hours (cached result used otherwise)
- [x] The notification message differs based on installation method (npm vs standalone binary)
- [x] The check is skipped in CI, non-TTY stderr, `NO_UPDATE_NOTIFIER=1`, and `NODE_ENV=test`
- [x] The notification is suppressed when `--json` is present in the args
- [x] All errors (network, cache, parsing) are silently swallowed — never crashes the CLI
- [x] The CLI startup time is not measurably affected (the check runs in a background fiber)
- [x] After the main command completes, the fiber join has a 5-second timeout
- [x] The notification respects `NO_COLOR` (no ANSI codes when set)

### Non-Functional

- [x] Zero new runtime dependencies
- [x] The `UpdateCheckService` is an Effect service (Context.Tag) for testability
- [x] Tests use a mock `UpdateCheckService` — no real network calls in tests
- [x] The cache file uses atomic writes (write-to-tmp + rename)

### Testing

- [x] Unit test: when cache is fresh and version is newer, notification is produced
- [x] Unit test: when cache is fresh and version is current, no notification
- [x] Unit test: when `NO_UPDATE_NOTIFIER` is set, check is skipped
- [x] Unit test: when `CI` is set, check is skipped
- [x] Unit test: when stderr is not a TTY, check is skipped
- [x] Unit test: when `--json` is in args, notification is suppressed
- [x] Unit test: when cache is stale, a fetch is triggered
- [x] Unit test: when fetch fails, error is swallowed and no notification shown
- [x] Unit test: mock `UpdateCheckService` integrates with the existing `TestLive()` layer

## Success Metrics

- Users on outdated versions see a clear, actionable notification
- Zero impact on CLI startup latency (verify via benchmarks)
- No test flakiness introduced (all network calls mocked)
- No new dependencies added to `package.json`

## Dependencies & Risks

### Dependencies
- `@effect/platform` `HttpClient` and `FileSystem` — already in the dependency tree via `@effect/platform-bun`
- npm public registry availability — mitigated by silent failure and caching

### Risks
- **Fiber join timeout**: If the 5-second timeout is too aggressive for slow networks, users on first run (no cache) may never see the notification. Mitigation: the cache will be written regardless, so they will see it on the next invocation.
- **Bun-specific `os.tmpdir()` behavior**: On macOS, Bun returns `/var/folders/.../T/` (per-user). On Linux, it returns `/tmp` (shared). Mitigation: use user-specific filename or accept the low risk (file contents are non-sensitive).
- **Pre-release version comparison**: A user on `0.1.0-beta.1` with `latest = 0.0.11` should NOT be notified (they are ahead). A user on `0.1.0-beta.1` with `latest = 0.1.0` SHOULD be notified (stable is newer). Mitigation: use proper semver comparison logic.

## Implementation Guide

### New files to create

| File | Purpose |
|------|---------|
| `src/services/UpdateCheckService.ts` | Service definition (Context.Tag), live implementation, types |
| `__tests__/__utils__/services/mock-update-check.ts` | Mock implementation for tests |
| `__tests__/services/update-check.test.ts` | Unit tests for the update check logic |

### Files to modify

| File | Change |
|------|--------|
| `src/bin.ts` | Fork update check fiber before `cli()`, join after, add `UpdateCheckService` to `MainLayer` |
| `__tests__/__utils__/services/test-layer.ts` | Add `MockUpdateCheck` to the `TestLive()` layer |
| `scripts/build-binary.ts` | Add `--define __STANDALONE_BINARY__=true` to `bun build --compile` flags |

### `UpdateCheckService` interface sketch

```typescript
// src/services/UpdateCheckService.ts

export interface UpdateInfo {
  readonly currentVersion: string
  readonly latestVersion: string
  readonly isStandaloneBinary: boolean
}

export class UpdateCheckService extends Context.Tag('UpdateCheckService')<
  UpdateCheckService,
  {
    /** Check for available updates. Returns Some(info) if update available, None otherwise. */
    readonly check: (currentVersion: string) => Effect.Effect<Option.Option<UpdateInfo>>
    /** Print the update notification to stderr. */
    readonly notify: (info: UpdateInfo) => Effect.Effect<void>
  }
>() {}
```

### `bin.ts` integration sketch

```typescript
// In bin.ts — wrap the main effect with update check

const program = Effect.gen(function* () {
  const updateCheck = yield* UpdateCheckService
  const fiber = yield* Effect.fork(updateCheck.check(pkg.version))

  // Run the main CLI command
  yield* Effect.suspend(() => cli(preprocessArgs(process.argv)))

  // After main command, check fiber result with timeout
  const result = yield* fiber.pipe(
    Fiber.join,
    Effect.timeout(Duration.seconds(5)),
    Effect.catchAll(() => Effect.succeed(Option.none())),
  )

  if (Option.isSome(result) && !process.argv.includes('--json')) {
    yield* updateCheck.notify(result.value)
  }
})
```

### Notification format

```
                                        ← blank line separator
  Update available: 0.0.11 → 0.1.0     ← dim "Update available:", bold cyan new version
  Run `npm install -g @uniku/cli`       ← (npm) or "Download at https://github.com/jkomyno/uniku/releases" (binary)
  Set NO_UPDATE_NOTIFIER=1 to disable   ← dim hint
                                        ← blank line
```

When `NO_COLOR` is set, the same text without ANSI codes.

## References & Research

### Internal References
- CLI entry point: `packages/cli/src/bin.ts`
- Service pattern: `packages/cli/src/services/OutputService.ts`
- Test layer: `packages/cli/__tests__/__utils__/services/test-layer.ts`
- Binary build: `packages/cli/scripts/build-binary.ts`

### External References
- [Polar CLI update-check.ts](https://github.com/polarsource/cli) — reference implementation (plain TS, fire-and-forget promises, GitHub Releases API, `~/.polar/update-check.json`)
- [Wrangler update-check.ts](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/update-check.ts) — memoized promise pattern, uses Vercel's `update-check` package
- [Vercel `update-check`](https://github.com/vercel/update-check) — zero-dependency, inline async, `os.tmpdir()` cache
- [`update-notifier`](https://github.com/sindresorhus/update-notifier) — npm ecosystem standard, spawns child process
- [npm Registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md) — `GET /package/latest` endpoint
