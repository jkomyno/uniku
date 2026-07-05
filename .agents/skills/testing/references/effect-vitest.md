# Effect Vitest

Open this when writing `@effect/vitest` tests, checking v4 test APIs, or asserting typed Effect failures.

The `packages/cli` tests run on Effect v4 with `@effect/vitest` pinned to the same exact beta as `effect` (never a floating `@beta` range). Two hard constraints:

- `packages/cli` must use the workspace catalog vitest (v4): `@effect/vitest`'s dist imports `@vitest/runner` directly, which pnpm resolves to the hoisted copy from the root catalog. A package-local older vitest splits the runner instances and every `layer(...)` block fails with "Vitest failed to find the current suite".
- CLI test layers must deep-import `@effect/platform-bun/BunServices` — the package barrel pulls in `BunRedis`, which imports the `bun` builtin and crashes the Node-based vitest runner.

Verify the v4 surface from `repos/effect-smol` before writing tests:

- `import { assert, describe, it, layer } from "@effect/vitest"`
- `import { assertTrue, assertDefined, assertInstanceOf, assertSome, assertNone } from "@effect/vitest/utils"` — narrowing assertion functions (`asserts` signatures)
- `import { TestClock, FastCheck } from "effect/testing"`
- `it.effect(...)` for Effects with test services and automatic scoping.
- `it.live(...)` only when the test intentionally uses live runtime services.
- `it.effect.each(...)`, `it.effect.skip(...)`, `it.effect.only(...)`, `it.effect.fails(...)`, `it.effect.prop(...)` for Effect tests.
- `layer(TestLayer)("name", (it) => { ... })` or `it.layer(...)` for shared test layers.

Do not use v3-only APIs such as `it.scoped` or `it.scopedLive` in migrated v4 tests unless the local v4 source exports them. When uncertain, check `repos/effect-smol/packages/vitest/src/index.ts` and `repos/effect-smol/packages/vitest/src/internal/internal.ts`.

```ts
import { assert, describe, it } from '@effect/vitest'
import { assertTrue } from '@effect/vitest/utils'
import { Effect, Exit, Schema } from 'effect'

class DivideByZero extends Schema.TaggedErrorClass<DivideByZero>()('DivideByZero', {
  divisor: Schema.Number,
}) {}

const divide = Effect.fn('divide')(function* (a: number, b: number) {
  if (b === 0) {
    return yield* new DivideByZero({ divisor: b })
  }
  return a / b
})

describe('divide', () => {
  it.effect('returns the quotient', () =>
    Effect.gen(function* () {
      const result = yield* divide(6, 3)
      assert.strictEqual(result, 2)
    }),
  )

  it.effect('exposes typed failures', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(divide(6, 0))
      assertTrue(Exit.isFailure(exit))

      const recovered = yield* divide(6, 0).pipe(
        Effect.catchTag('DivideByZero', (error) => Effect.succeed(error.divisor)),
      )
      assert.strictEqual(recovered, 0)
    }),
  )
})
```

## Type-Safe Narrowing Assertions

Never wrap assertions in a conditional: `if (event?.type === 'failed') { assert... }` silently asserts nothing when the guard is false, and the guard usually exists only because a preceding `assert.strictEqual(event?.type, 'failed')` did not narrow. The functions in `@effect/vitest/utils` are TypeScript assertion functions, so the check itself narrows and the follow-up assertions run unconditionally — the same idiom the Effect repo uses in its own test suite (`assertTrue(r._tag === "Failure")`).

```ts
import { assert } from '@effect/vitest'
import { assertDefined, assertTrue } from '@effect/vitest/utils'

declare const event: { type: 'failed'; attempt: number } | { type: 'completed' } | undefined
declare const request: { runAt: number } | undefined

// `asserts self`: narrows `event` to the 'failed' member (and non-undefined).
assertTrue(event?.type === 'failed')
assert.strictEqual(event.attempt, 1)

// `asserts a is Exclude<A, undefined>`: replaces `if (x === undefined) assert.fail(...)`.
assertDefined(request)
assert.strictEqual(request.runAt, 0)
```
