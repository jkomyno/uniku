# Time And Troubleshooting

Open this for `TestClock`, live runtimes, hanging tests, test pollution, failing test triage, or test review.

## Async And Time

Do not use `async`/`await` inside Effect tests to run Effect code. Keep assertions inside `Effect.gen` and wrap fallible promises with `Effect.tryPromise({ try, catch })` in the code under test or in the adapter fixture.

Use `TestClock.adjust(...)` for sleeps, retries, rate limits, and schedule assertions. If a delayed fiber does not resume, fork it first, yield once with `Effect.yieldNow`, then adjust the test clock.

```ts
import { assert, it } from '@effect/vitest'
import { Effect, Fiber } from 'effect'
import { TestClock } from 'effect/testing'

it.effect('advances virtual time', () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(Effect.sleep('1 second').pipe(Effect.as('done' as const)))
    yield* Effect.yieldNow
    yield* TestClock.adjust('1 second')

    const value = yield* Fiber.join(fiber)
    assert.strictEqual(value, 'done')
  }),
)
```

Use `it.live` sparingly for real timers or live runtime services. A unit test that needs `it.live` is often hiding a missing port.

## Failing Tests

When a test fails after implementation changes, classify it before editing:

| Keep and fix                                      | Delete or raise level                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| It verifies public behavior or a domain invariant | It only checks internal function call arguments                         |
| It caught a real regression                       | The same behavior is covered by a stronger integration test             |
| It asserts a stable contract                      | It breaks on routine refactors without user-visible behavior changing   |
| It covers a tricky edge case                      | It duplicates framework behavior or mocks the implementation under test |

Update fixtures and assertions when product behavior changed intentionally. Delete low-value tests only when a higher-level test already covers the behavior or the assertion is pure implementation coupling.

## Common Issues

- Mock not working: check import timing and Vitest hoisting. Prefer `vi.spyOn` after constructing the dependency.
- Module pollution: use `vi.resetModules()` in the isolated test and import after reset.
- State pollution: reset refs, databases, temp directories, globals, and fake timers in `beforeEach` or `afterEach`.
- Hanging Effect test: make sure the delayed work is forked, the test clock is advanced, and all scoped resources can close.
- Hidden live dependency: inject `Clock`, `Random`, fetch/client, filesystem, config, and persistence through services or adapter layers.
- Effect API uncertainty: verify against `repos/effect-smol/**` before writing the snippet or implementation.
