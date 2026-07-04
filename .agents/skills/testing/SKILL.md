---
name: testing
description: Vitest testing guide for uniku. Use when writing or updating library, CLI, integration, Cloudflare e2e, benchmark-result, or Effect-based CLI tests; fixing failing tests; improving coverage; setting up mocks; reviewing test quality; or preparing future Effect v4 @effect/vitest tests.
---

# Testing

## Core Posture

Follow root `AGENTS.md` for repo-wide verification, runtime-portability, package-entrypoint, and Effect migration rules. This skill adds test-shape and test-tool guidance.

Inspect the package's existing scripts and `vitest.config.ts` before inventing a command or layout. Prefer the narrowest command that exercises the changed behavior, then broaden before handoff when the change touches shared code.

```bash
pnpm --filter uniku test:unit -- path/to/file.test.ts
pnpm --filter uniku test:integration
pnpm --filter @uniku/cli test -- path/to/file.test.ts
pnpm test:e2e:cloudflare
```

Use the package's actual scripts. Do not run the full suite first when a focused test can reproduce the issue.

## Test Shape

Use the repo's current layout before adding a new one.

| Kind              | Typical location                                           | Notes                                                              |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Library unit      | `packages/uniku/__tests__/unit/**/*.test.ts`               | Pure generator, codec, random pool, and timestamp logic            |
| Library integration | `packages/uniku/__tests__/integration/**/*.test.ts`      | Cross-validation against reference packages                        |
| Runtime e2e       | `packages/uniku/__tests__/e2e/runtimes/cloudflare/**`      | Cloudflare Workers compatibility                                   |
| CLI tests         | `packages/cli/__tests__/**/*.test.ts`                      | Command behavior, service boundaries, output, stdin, update checks |
| Package config    | `packages/*/vitest.config.ts`                              | Package scripts should delegate to Vitest projects                 |

New production files should usually ship with sibling or package-local tests in the same change. If behavior crosses a public boundary, test through the public API instead of private helper calls.

## Principles

1. Test externally observable behavior: generated IDs, byte/codecs, validation results, CLI output, typed failures, process exit behavior, or public API contracts.
2. Prefer integration-level assertions over white-box param-forwarding tests. Keep low-level tests only when they isolate tricky behavior not covered above.
3. Mock at boundaries: clocks, random bytes, network, stdin/stdout/stderr, process env, browser globals, and external packages.
4. Avoid mocking internal modules just to assert call plumbing.
5. Keep unit tests deterministic. No live network, real timers, random data without a seeded generator, or process-wide state that leaks between tests.
6. Expected failures are data. For current Effect v3 CLI code, follow nearby `@effect/vitest` patterns. For migration work, read [effect-vitest.md](references/effect-vitest.md) and verify v4 APIs against `repos/effect-smol`.
7. Assert type-safely; never branch in a test body. An `if` wrapped around assertions silently skips them when its guard is false. For current Vitest tests, use assertions that narrow or fail immediately; for Effect v4 tests, use the narrowing helpers described in [effect-vitest.md](references/effect-vitest.md).
8. After one or two failed fix attempts, reassess whether the test reveals a product bug, a stale assertion, or low-value coupling.

## Reference Map

Open only the reference needed for the current task:

| File                                                                  | Open when                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [vitest-basics.md](references/vitest-basics.md)                       | Writing plain Vitest tests, setup/teardown, spies, globals, or module isolation              |
| [effect-vitest.md](references/effect-vitest.md)                       | Writing `@effect/vitest` tests, asserting typed Effect failures, or checking v4 test APIs    |
| [layers-services.md](references/layers-services.md)                   | Providing Effect services with layers or building reusable test service fixtures             |
| [property-tests.md](references/property-tests.md)                     | Adding Schema-backed property tests or custom generators                                     |
| [time-and-troubleshooting.md](references/time-and-troubleshooting.md) | Handling `TestClock`, live runtimes, failing tests, pollution, hanging tests, or test review |

## Handoff

Run the relevant broader package or repo checks before finishing behavioral, public API, or adapter changes. Use the full handoff command set from root `AGENTS.md` when the change warrants it.
