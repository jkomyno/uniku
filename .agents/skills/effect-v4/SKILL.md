---
name: effect-v4
description: Write, review, or upgrade Effect v4 code in uniku — the packages/cli command line (effect@4.1.x, every Effect package pinned to the same exact version) plus the Effect-based browser smoke script and docs example. Covers Context.Service with explicit layers, Schema.TaggedError and typed recovery, the effect/cli command surface and directory layout, and the repos/effect source oracle. Use when writing or reviewing Effect code, answering a v4 API question, adding or changing a CLI command, bumping the Effect pins, or verifying an unfamiliar API against repos/effect.
---

# Effect v4

The `uniku` CLI (`packages/cli`) runs on Effect 4.1. Every claim below is grounded in the
migrated source and the `repos/effect` checkout, not memory of v3 or of the 4.0 betas.

## Version matrix

`effect`, `@effect/platform-bun`, and `@effect/vitest` use the **same exact version**
(no `^` ranges) everywhere they appear: `packages/cli`, `packages/uniku` (its
`scripts/browser-smoke.ts`), and `examples` (the Effect docs example).
`@effect/platform-node-shared` comes in through `@effect/platform-bun`; do not add it as a
direct dependency. `@effect/cli` and `@effect/platform` are v3 packages with no v4
equivalent; their surfaces live in `effect` and `effect/*`.

`@effect/vitest` 4.1 requires Vitest 5, the workspace default. See
[versions.json](versions.json) for the exact example-check matrix, and
[references/upgrade-workflow.md](references/upgrade-workflow.md) before changing any pin.

## Read next

- [references/core-patterns.md](references/core-patterns.md) — services, layers, typed
  errors, `Effect.fn` vs `Effect.gen`, `Option` combinators, `TestClock`, and the v3→v4
  rename table (labeled historical, for recognizing stale patterns).
- [references/cli-surface.md](references/cli-surface.md) — `effect/cli`: the command
  directory layout, `Command`, `Flag`, `Argument`, built-in global flags, how
  `Command.runWith` renders help and errors, and how failures become exit codes.
- [references/upgrade-workflow.md](references/upgrade-workflow.md) — procedure for
  bumping to a newer Effect release.

Excerpts that quote repo files carry a `no-check` fence and name their source file. The
cited source wins when an excerpt disagrees with it.

## Non-negotiables

- Functions that return Effects use `Effect.fn('span.name')(function* (...) { ... })` —
  every command handler and parser in `packages/cli` does. Effect values use
  `Effect.gen(function* () { ... })`. Never wrap an `Effect.fn` in `.pipe(...)`; pass extra
  combinators as additional `Effect.fn` arguments.
- Define services with `Context.Service<Self, Shape>()('uniku/cli/Name')` and an explicit
  `static readonly layer` built with `Layer.succeed`/`Layer.effect`. v4 never generates a
  layer for you.
- Model expected failures with `Schema.TaggedError<E>()('E', { ...fields })` and raise them
  with `return yield* new E({ ... })`. `Schema.TaggedErrorClass` was the 4.0 beta name; it
  no longer exists.
- Recover with `Effect.catchTag`/`catchTags`, branch with `Match.tag` + `Match.exhaustive`,
  guard with `Predicate.isTagged`, and assert with `assertInstanceOf` from
  `@effect/vitest/utils`. Never compare `error._tag` by hand.
- Wrap fallible Promises with `Effect.tryPromise({ try, catch })`; `Effect.promise` turns a
  rejection into a defect. No `async`/`await` or `try`/`catch` inside Effect code.
- Read time with `Clock`, configuration with `Config` (`Config.String`, `Config.option`),
  and randomness with `Random`, not `Date.now()`, `process.env`, or `Math.random()`.
- Treat every remembered v3 or 4.0-beta API name as wrong until you verify it against
  `repos/effect` (read-only — never edit or import from it) and the installed typings.

## Repo-specific gotchas

- **Deep-import `@effect/platform-bun`**: the barrel re-exports modules written for the
  Bun runtime (`BunRedis`, `BunHttpPlatform`), while the published bin and Vitest run under
  Node. Import `@effect/platform-bun/BunRuntime` and `@effect/platform-bun/BunServices`.
- **Only the Cloudflare e2e and `packages/uniku` stay on Vitest 4** (the `vitest4`
  catalog in `pnpm-workspace.yaml`). `packages/cli` must use the default catalog, because
  `@effect/vitest` 4.1 declares `vitest >=5`.
- **`-V` is rewritten to `--version`** in `src/runtime/args.ts`, because the built-in
  version flag only aliases `-v`. A subcommand-local flag with the same alias wins at its
  own level, which is how `uniku uuid -v 7` still selects `--uuid-version`.

## Verification

```bash
pnpm --filter @uniku/cli typecheck
pnpm --filter @uniku/cli test
pnpm --filter @uniku/cli build
pnpm examples:check
```

After editing this skill or `../testing/references/effect-vitest.md`, compile their
TypeScript blocks against the pinned packages:

```bash
node .agents/skills/effect-v4/scripts/check-examples.mjs
```

The checker also fails when `versions.json` and the `packages/cli` pins disagree.
